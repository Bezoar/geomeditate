# 05-Solver Design Spec

## Overview

Fork of `test-apps/04-game-mechanics` into `test-apps/05-solver`. A puzzle solver that:

1. Starts with a fully covered board (or loaded save state) and progressively activates clues until the puzzle is solvable without guessing
2. Outputs the activated clue set as a save file for use in the human-played game
3. Provides a step-by-step replay UI for debugging and tuning
4. Supports configurable difficulty via deduction levels, clue-type weights, and actionable-clue thresholds

## Terminology

- **Actionable clue**: A visible clue whose remaining covered cells are each forced into exactly one identity (filled or empty) given the current board state. No guessing required.
- **Activated clue**: A previously hidden clue that the solver chose to reveal during the solve.
- **Forced cell**: A covered cell whose identity is determined by one or more actionable clues.

## Architecture: Layered Engine (Approach B)

Three layers:

1. **Deduction engine** — registry of independently toggleable deduction strategies
2. **Clue activation policy** — selects which hidden clue to reveal, weighted by type and difficulty
3. **Solver loop** — orchestrates scan → activate → deduce → record, one cell per turn

### Layer 1: Deduction Engine

#### Strategy Interface

```typescript
type DeductionStrategy = (grid: HexGrid, visibleClues: VisibleClueSet) => ForcedCell[]

interface ForcedCell {
  coord: string                    // coordKey of the forced cell
  identity: 'filled' | 'empty'
  clueId: string                   // which clue forced this
  deductionType: DeductionType
}
```

#### Deduction Types

| Type | Key | Description |
|------|-----|-------------|
| Trivial count | `trivial-count` | Neighbor clue value equals number of remaining covered neighbors — all must be filled |
| Trivial elimination | `trivial-elimination` | Neighbor clue is 0 — all covered neighbors are empty |
| Saturation | `saturation` | All filled neighbors already found — remaining covered neighbors must be empty |
| Contiguity | `contiguity` | Contiguity constraint (contiguous/discontiguous notation) forces cell positions |
| Line segment | `line-segment` | Line segment clue forces cells within the segment |
| Flower | `flower` | Flower clue forces cells in radius-2 zone |
| Pairwise intersection | `pairwise-intersection` | Two clues share a cell; combined constraints force it |
| Constraint propagation | `constraint-propagation` | Resolving one cell via clue A changes state seen by clue B, forcing another cell — chain reaction |
| Set reasoning | `set-reasoning` | Subset/superset analysis across clue groups — e.g., clue A says "2 of these 3" and clue B says "1 of these 3", overlap determines which |

#### Execution Order

Strategies run simplest to most complex. The engine stops at the first strategy that returns results:

1. `trivial-count` / `trivial-elimination` / `saturation`
2. `contiguity`
3. `line-segment`
4. `flower`
5. `pairwise-intersection`
6. `constraint-propagation`
7. `set-reasoning`

Disabled strategies (per config) are skipped. When multiple `ForcedCell` results come back from the winning strategy, the PRNG picks one to apply.

#### VisibleClueSet

Tracks what the solver can "see" — derived from the grid's current visual state and clue visibility maps:

- Open empty cells with their neighbor clue values and contiguity notation
- Visible line segments with their values and contiguity notation
- Visible flower clues with their values (on cells already marked as filled)

**Ground truth access:** The solver has access to the full solution (needed to compute clue values and identify cell clue activation candidates). However, the deduction engine must only reason from the VisibleClueSet — never from ground truth directly. Ground truth is used only by the clue activation policy (to know which covered cells are empty and eligible for cell clue activation) and the remaining counter.

### Layer 2: Clue Activation Policy

When the deduction engine returns no forced cells, or fewer actionable clues are visible than the difficulty threshold requires, the solver activates a new clue.

#### Activation Flow

1. **Scan all hidden clues** — enumerate every clue not yet visible: covered empty cells (potential neighbor clues), invisible line segments, hidden flower clues
2. **Filter to actionable candidates** — for each hidden clue, temporarily reveal it and run the deduction engine. If it would produce at least one forced cell, it's a candidate.
3. **Categorize candidates** — bucket into `cell`, `line`, `flower`
4. **Weighted PRNG selection** — pick a category first (weighted random per difficulty config), then pick a specific clue within that category (uniform random via PRNG). If the chosen category has no candidates, fall back to the next highest-weighted category.

#### Clue Activation Types

- **Cell clue**: Open the covered empty cell (COVERED → OPEN_EMPTY), revealing its neighbor value + contiguity notation
- **Line clue**: Set segment visibility from `invisible` to `visible`
- **Flower clue**: Remove from hidden set, making the flower value visible on the filled cell

#### Threshold Check

- Easy mode: if fewer than `easyModeMinActionable` visible clues are actionable, activate more
- Hard mode: if fewer than `hardModeMinActionable` visible clues are actionable, activate more

Multiple activations can happen in a single turn (each recorded as a separate trace step) until the threshold is met.

### Layer 3: Solver Loop

```
function solve(grid, config):
  prng = createPRNG(hash(config.seed))
  trace = []
  activatedClues = Set()
  turn = 0

  loop:
    // Endgame check
    coveredCount = count COVERED cells
    if coveredCount == 0 → break (solved)
    if grid.remainingCount == coveredCount → mark all covered, record endgame step, break
    if grid.remainingCount == 0 → open all covered, record endgame step, break

    // Phase 1: Ensure enough actionable clues
    threshold = difficulty == 'easy' ? easyModeMinActionable : hardModeMinActionable
    while countActionableVisibleClues(grid) < threshold:
      clue = selectClueToActivate(grid, config, prng)
      activate(clue)
      activatedClues.add(clue.id)
      trace.push({ turn, phase: 'clue-activation', ...snapshot })

    // Phase 2: Deduce one cell
    forcedCells = deductionEngine.run(grid, visibleClues, config.deductionLevels)
    if forcedCells.length == 0:
      // No deduction possible, activate another clue and retry
      continue loop

    cell = prng.pick(forcedCells)
    applyMove(grid, cell)   // open or mark
    trace.push({ turn, phase: 'deduction', ...snapshot })
    turn++

  return { trace, activatedClues, finalGrid }
```

Key behaviors:
- One cell resolved per turn (phase 2)
- Multiple clue activations possible per turn (phase 1), each traced separately
- Endgame shortcut: remaining count = covered count → mark all; remaining = 0 → open all
- The loop exits with an error log if phase 1 cannot find any clue to activate (should not happen with a valid puzzle)

## Configuration

### SolverConfig

```typescript
interface SolverConfig {
  seed: string                          // alphanumeric, hashed to numeric PRNG seed
  difficulty: 'easy' | 'hard'
  deductionLevels: {
    trivial: boolean                    // trivial-count, trivial-elimination, saturation
    contiguity: boolean
    lineSegment: boolean
    flower: boolean
    pairwiseIntersection: boolean
    constraintPropagation: boolean
    setReasoning: boolean
  }
  clueWeights: {
    easy: { cell: number, line: number, flower: number }
    hard: { cell: number, line: number, flower: number }
  }
  easyModeMinActionable: number
  hardModeMinActionable: number
}
```

### Default Values

```typescript
const DEFAULT_CONFIG: SolverConfig = {
  seed: '1',
  difficulty: 'easy',
  deductionLevels: {
    trivial: true,
    contiguity: true,
    lineSegment: true,
    flower: true,
    pairwiseIntersection: true,
    constraintPropagation: true,
    setReasoning: true,
  },
  clueWeights: {
    easy: { cell: 70, line: 25, flower: 5 },
    hard: { cell: 20, line: 30, flower: 50 },
  },
  easyModeMinActionable: 3,
  hardModeMinActionable: 1,
}
```

## Trace Log

### TraceStep

```typescript
interface TraceStep {
  turnNumber: number
  phase: 'clue-activation' | 'deduction' | 'endgame'

  // For clue-activation phase
  clueActivated?: {
    type: 'cell' | 'line' | 'flower'
    id: string                          // coordKey or segment id
    reason: string                      // e.g. "below easy threshold (1/3 actionable)"
  }

  // For deduction phase
  deduction?: {
    clueId: string
    deductionType:
      | 'trivial-count'
      | 'trivial-elimination'
      | 'saturation'
      | 'contiguity'
      | 'line-segment'
      | 'flower'
      | 'pairwise-intersection'
      | 'constraint-propagation'
      | 'set-reasoning'
    cellResolved: string                // coordKey
    resolvedTo: 'filled' | 'empty'
  }

  // For endgame phase
  endgame?: {
    type: 'all-filled' | 'all-empty'
    cellsResolved: string[]             // coordKeys
  }

  // Board snapshot (every step)
  boardState: SerializedBoardState      // cell visual states + clue visibility
  remainingCount: number
  actionableClueCount: number
}
```

Board snapshots reuse the existing grid-string encoding and clue visibility maps from 04's save system, so the replay renderer can use the same deserialization path.

## PRNG

The seed is an alphanumeric string (numeric digits only for now, alphabetic support planned). A hash function (e.g., djb2 or FNV-1a) converts the string to a 32-bit number used to initialize a deterministic PRNG (e.g., mulberry32 or xoshiro128). The same seed always produces the same solve path and clue set.

## UI

### Preserved from 04

- Full hex grid renderer (SVG)
- Click to open/mark cells
- Shift+click, Shift+Opt+click interactions
- Undo/redo
- Clue visibility toggling (line segments, flower clues)
- Grid selection dropdown (test grids, random grids)
- Load from save file

### New: Remaining / Mistakes Counters

- Center bottom of the page
- Large, easily readable text
- Always visible (not part of the settings modal)

### New: Settings Modal

Triggered by a button in the main UI. Contains:

- **Difficulty** dropdown: easy / hard
- **Seed** text input: alphanumeric string
- **Deduction level toggles**: 7 checkboxes (trivial, contiguity, line segment, flower, pairwise intersection, constraint propagation, set reasoning)
- **Clue weight sliders**: cell / line / flower weights, shown per difficulty (switching difficulty shows that difficulty's weights)
- **Threshold inputs**: min actionable clues for easy and hard mode
- **"Solve" button**: runs the solver with current settings and grid state

### New: Replay Controls

Visible after a solve completes. Positioned below the counters:

- **Prev / Next buttons**: step through the trace
- **Step counter**: "Step 12 / 247"
- **Phase indicator**: describes what happened at this step, e.g.:
  - "Clue Activated: cell at (3,2) — below easy threshold (1/3 actionable)"
  - "Deduced: (5,1) is filled — saturation"
  - "Endgame: 4 remaining cells all filled"
- **Visual highlight**: the cell or clue involved in the current step gets a colored ring or pulse on the grid

### New: Post-Solve Actions

- **"Save Puzzle"** button: exports a save file (JSON download) containing the puzzle definition with `CluesDef` populated only with solver-activated clues and their visibility settings
- **"Human Play"** button: resets all cells to COVERED, then opens every empty cell whose neighbor clue was activated by the solver (COVERED → OPEN_EMPTY, showing the clue value). Line segment visibility preserved as the solver set it. Flower clue visibility settings are preserved but flower values only become visible once the player marks the corresponding cell as filled (since flower clues render on MARKED_FILLED cells). Full interactive play with 04's controls.

## Input Sources

- **Test grids**: same hardcoded grids from 04's `test-grids.ts`
- **Random grids**: same generator from 04's `random-grid.ts`
- **Save files**: load JSON save files exported from 04 or 05. Loaded state (progress, clue visibility) is preserved as-is. Use existing reset controls to start fresh if desired.

## Output

The solver produces a save file in 04's existing `SaveFile` format:

- `PuzzleDef.grid`: ground truth
- `PuzzleDef.clues`: only the clues the solver activated — neighbor clues (with contiguity settings), line segment visibility, flower clue visibility
- Non-activated clues are omitted, defaulting to hidden when loaded

## File Structure (New/Modified)

```
test-apps/05-solver/
├── src/
│   ├── model/          (forked from 04, unchanged)
│   │   ├── hex-cell.ts
│   │   ├── hex-coord.ts
│   │   └── hex-grid.ts
│   ├── clues/          (forked from 04, unchanged)
│   │   ├── neighbor.ts
│   │   ├── flower.ts
│   │   └── line.ts
│   ├── view/           (forked from 04, extended)
│   │   ├── grid-renderer.ts
│   │   ├── clue-renderer.ts
│   │   ├── segment-state.ts
│   │   ├── controls.ts
│   │   ├── replay-controls.ts      (NEW — prev/next, step counter, phase indicator)
│   │   ├── settings-modal.ts       (NEW — config UI as modal)
│   │   └── counters.ts             (NEW — remaining/mistakes display)
│   ├── save/           (forked from 04, unchanged)
│   │   ├── types.ts
│   │   ├── puzzle-mapper.ts
│   │   ├── progress-mapper.ts
│   │   ├── save-file.ts
│   │   ├── grid-string.ts
│   │   ├── history.ts
│   │   └── storage.ts
│   ├── grids/          (forked from 04, unchanged)
│   │   ├── test-grids.ts
│   │   └── random-grid.ts
│   ├── solver/         (NEW — solver engine)
│   │   ├── types.ts                (SolverConfig, TraceStep, ForcedCell, etc.)
│   │   ├── config.ts               (DEFAULT_CONFIG, config validation)
│   │   ├── prng.ts                 (seed hashing, PRNG implementation)
│   │   ├── visible-clues.ts        (VisibleClueSet — derives what solver can see)
│   │   ├── deduction/
│   │   │   ├── engine.ts           (strategy registry, ordered execution)
│   │   │   ├── trivial.ts          (trivial-count, trivial-elimination, saturation)
│   │   │   ├── contiguity.ts       (contiguity constraint deduction)
│   │   │   ├── line-segment.ts     (line segment deduction)
│   │   │   ├── flower.ts           (flower clue deduction)
│   │   │   ├── pairwise.ts         (pairwise intersection)
│   │   │   ├── propagation.ts      (constraint propagation chains)
│   │   │   └── set-reasoning.ts    (subset/superset analysis)
│   │   ├── activation.ts           (clue activation policy, weighted selection)
│   │   └── solver-loop.ts          (main orchestration loop)
│   └── main.ts         (forked from 04, extended with solver integration)
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Deliverables

1. **05-solver test app** — fully functional fork with solver engine, replay UI, settings modal, and post-solve actions
2. **Solver explainer document** — `docs/generated/solver-explainer.md` describing the solver's architecture, deduction strategies, configuration knobs, and how to tune difficulty. Reference for future tweaking of clue selection beyond the weight system defined here.
