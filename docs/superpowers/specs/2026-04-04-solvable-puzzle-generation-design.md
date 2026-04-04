# Solvable Puzzle Generation

## Goal

Given a hex grid with cells already placed (filled/empty decided), produce a solvable puzzle by selecting which clues to expose and, if necessary, making minimal edits to the grid. The puzzle must be both uniquely solvable and logically deducible without guessing.

## Difficulty Model

Two difficulty tiers control both clue visibility and solver reasoning depth:

### Easy Mode
- **Solver tier:** Simple deductions only (single-clue reasoning)
- **Clue types:** Primarily neighbor and line clues, with a few flower clues
- **Clue density:** More clues than the minimum required — multiple solve paths available
- **Global remaining count:** Not used as a clue source

### Hard Mode
- **Solver tier:** Advanced deductions (multi-clue intersection, constraint propagation, elimination)
- **Clue types:** All three types used freely
- **Clue density:** Minimum viable set — fewer clues, tighter solve path
- **Global remaining count:** Available as an implicit clue (if remaining == 0, all covered cells are empty; if remaining == covered count, all are filled)

## Architecture

### Build Order

Solver -> Verifier -> Clue Selector -> Grid Editor -> Pipeline + Replay Viewer

Each layer depends on the one before it.

### File Structure

```
src/solver/
  deductions.ts      -- Deduction type, DeductionReason, simple + advanced deduction functions
  solver.ts          -- solve() function, orchestrates deduction passes
  verifier.ts        -- verify() loop, produces SolveReplay
  clue-selector.ts   -- selectClues(), pruning logic, difficulty shaping
  grid-editor.ts     -- editForSolvability(), minimal edit search
  pipeline.ts        -- generatePuzzle() top-level orchestration

src/view/
  solve-replay.ts    -- replay controller: step forward/back, auto-play, highlight logic
```

## Component Design

### 1. Deduction Solver

A pure function that examines the current board state and visible clues, returning all cells that can be logically deduced in one pass. Never mutates the grid.

#### Simple Deductions (Easy Mode)

Examine one clue in isolation:

- **All-filled:** A clue's value minus already-filled neighbors equals the count of remaining covered neighbors -> all remaining are filled
- **All-empty:** A clue's value equals the count of already-filled neighbors -> all remaining covered neighbors are empty
- Applies uniformly to neighbor clues (6 neighbors), flower clues (18 radius-2 cells), and line clues (variable length along axis)

#### Advanced Deductions (Hard Mode)

Combine information from multiple clues:

- **Intersection reasoning:** Two clues sharing covered cells constrain each other. If the overlap narrows possibilities for shared cells, deduce them.
- **Elimination:** If placing a cell as filled (or empty) would make another visible clue impossible to satisfy, the opposite must be true.
- **Global remaining count:** If remaining filled count == 0, all covered cells are empty. If remaining filled count == total covered cells, all are filled.

#### Interface

```typescript
interface Deduction {
  coord: HexCoord;
  result: 'filled' | 'empty';
  reason: DeductionReason;  // which clue(s) and logic produced this
}

function solve(
  grid: HexGrid,
  visibleClues: Set<string>,
  tier: 'simple' | 'advanced'
): Deduction[]
```

### 2. Solvability Verifier

Runs the solver in a loop, simulating a complete playthrough.

#### Algorithm

1. Start with all cells covered
2. Call `solve()` to get deductions from currently visible clues
3. Apply all deductions (reveal empty cells, mark filled cells)
4. Repeat until either:
   - All cells resolved -> **solvable**
   - No deductions returned but cells remain -> **stuck**

#### Interface

```typescript
interface SolveStep {
  deductions: Deduction[];
  boardState: Map<string, CellVisualState>;  // snapshot after applying
}

interface SolveReplay {
  steps: SolveStep[];
  stuck: boolean;
  stuckCells?: Set<string>;
}

function verify(
  grid: HexGrid,
  visibleClues: Set<string>,
  tier: 'simple' | 'advanced'
): SolveReplay
```

Every step in the replay is non-empty until completion, which proves the "always at least one actionable clue" invariant.

### 3. Clue Selector

Finds a subset of clues to reveal that makes the puzzle solvable at the target difficulty.

#### Algorithm

1. Start with all clues visible. Verify solvability at the target tier. If not solvable even with everything showing, return null (grid needs editing).
2. Prune clues: iteratively try hiding each clue and re-verify. If still solvable, keep it hidden. If not, it's required.
3. Difficulty shaping:
   - **Easy mode:** After finding the minimum set, add back clues — prefer neighbor and line clues, sprinkle in flower clues.
   - **Hard mode:** Use the minimum set. Allow advanced deductions and global remaining count.

Randomizing the pruning order produces different minimal sets, giving variety across puzzles from the same grid.

#### Clue Types Available for Selection

- Neighbor clue on a specific empty cell (show/hide)
- Flower clue on a specific filled cell (show/hide)
- Line clue on a specific axis (show/hide)
- Global remaining count (show/hide, hard mode only)

#### Clue Identification

Clues are identified by string keys in `visibleClues`:
- Neighbor clues: `"neighbor:col,row"`
- Flower clues: `"flower:col,row"`
- Line clues: `"line:axis:col,row"` (using the line's start coord)
- Global remaining: `"global:remaining"`

#### Interface

```typescript
interface ClueSelection {
  visibleClues: Set<string>;
  difficulty: 'easy' | 'hard';
  verifyResult: SolveReplay;
}

function selectClues(
  grid: HexGrid,
  difficulty: 'easy' | 'hard'
): ClueSelection | null  // null = grid needs editing
```

### 4. Grid Editor

When the clue selector returns null, the grid editor makes minimal changes to achieve solvability.

#### Strategy (least-disruptive first)

1. Identify the stuck region from `SolveReplay.stuckCells`
2. Try toggling cells in/around the stuck region (flip filled/empty). After each toggle, recompute affected clues and re-run the clue selector. Accept the first edit that works.
3. If toggling doesn't help, try adding/removing cells adjacent to the stuck region.
4. Stop as soon as solvability is achieved.

#### Interface

```typescript
interface GridEdit {
  coord: HexCoord;
  type: 'toggle_truth' | 'add_cell' | 'remove_cell';
}

interface EditResult {
  edits: GridEdit[];
  grid: HexGrid;
  clueSelection: ClueSelection;
}

function editForSolvability(
  grid: HexGrid,
  difficulty: 'easy' | 'hard',
  maxEdits?: number
): EditResult | null  // null = couldn't fix within budget
```

The `maxEdits` cap prevents the editor from mangling the original design.

### 5. Pipeline

Top-level orchestration that wires everything together.

```typescript
interface PuzzleResult {
  grid: HexGrid;
  clueSelection: ClueSelection;
  edits: GridEdit[];
  replay: SolveReplay;
}

function generatePuzzle(
  grid: HexGrid,
  difficulty: 'easy' | 'hard'
): PuzzleResult | null
```

### 6. Replay Viewer

Step-through visualization of the solver's work. First-class feature — doubles as a debug tool now and a hint system later.

#### UI Integration

- "Solve" button in the toolbar runs the pipeline and enters replay mode
- Replay controls: step forward, step back, auto-play with configurable speed
- Each step highlights: the acting clue(s), the deduced cells, and whether each was determined filled or empty
- Stuck state highlights unresolved cells in a distinct color
- Grid edits (if any) shown as a separate step before the solve begins

#### Interface

Lives in `src/view/solve-replay.ts`. Consumes `SolveReplay` from the verifier. Controls playback state (current step index, playing/paused, speed). Communicates with the renderer to apply highlights.

## Integration with Existing Code

- The solver reads from `HexGrid` and `HexCell` but never mutates the live game state — works on copies
- `ClueSelection.visibleClues` feeds into the renderer to show/hide clues
- Existing `computeAllClues()` and `recomputeCluesAround()` are reused for clue value calculation — the solver reasons about values, doesn't recompute them
- The grid editor uses existing `toggleGroundTruth()` and `toggleMissing()` methods on a grid copy

## Future Work (Out of Scope)

- Seed-driven full pipeline (grid shape + solution + clue selection from a single random seed)
- Hint system for players (reuses SolveReplay)
- Difficulty rating (derived from step count and deductions per step)
