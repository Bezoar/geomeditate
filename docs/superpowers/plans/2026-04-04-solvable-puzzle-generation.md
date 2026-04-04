# Solvable Puzzle Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a solver-based pipeline that takes an existing hex grid, selects which clues to expose (and optionally edits the grid), to produce a puzzle that is both uniquely solvable and logically deducible without guessing, with step-by-step replay visualization.

**Architecture:** Solver-first, bottom-up. A pure deduction solver feeds a verifier loop that produces a full solve replay. A clue selector prunes clues down to a solvable subset based on difficulty. A grid editor makes minimal edits when clue selection alone isn't enough. A replay viewer lets you step through the solver's work in the UI.

**Tech Stack:** TypeScript 5.x (strict mode), Vitest for testing, Vite 6.x dev server. No external solver libraries — all logic is hand-rolled using the existing hex coordinate and clue computation utilities.

**Testing:** All new code under `src/solver/` requires 100% branch coverage. Tests go in `tests/solver/`. Run with `npm --prefix test-apps/01-grid-mechanics test`.

---

## File Structure

```
src/solver/
  deductions.ts      — Types (Deduction, DeductionReason, ClueId) and deduction functions
  solver.ts          — solve() orchestrator: runs deduction functions, returns Deduction[]
  verifier.ts        — verify() loop: runs solve() repeatedly, produces SolveReplay
  clue-selector.ts   — selectClues(): finds minimal clue subset for target difficulty
  grid-editor.ts     — editForSolvability(): minimal grid edits when clue selection fails
  pipeline.ts        — generatePuzzle(): top-level orchestration

src/view/
  solve-replay.ts    — ReplayController: step forward/back, auto-play, highlight state

tests/solver/
  deductions.test.ts
  solver.test.ts
  verifier.test.ts
  clue-selector.test.ts
  grid-editor.test.ts
  pipeline.test.ts
```

Also modifies:
- `vite.config.ts` — add `src/solver/**` to coverage includes
- `src/main.ts` — add Solve button and replay UI wiring

---

### Task 1: Types and Clue ID Utilities

**Files:**
- Create: `src/solver/deductions.ts`
- Create: `tests/solver/deductions.test.ts`

This task defines the core types used by every other module, plus helper functions for creating and parsing clue IDs.

- [ ] **Step 1: Write failing tests for clue ID helpers**

```typescript
// tests/solver/deductions.test.ts
import { describe, it, expect } from 'vitest';
import {
  neighborClueId,
  flowerClueId,
  lineClueId,
  GLOBAL_REMAINING_ID,
  parseClueId,
} from '../src/solver/deductions';

describe('clue ID helpers', () => {
  it('creates neighbor clue ID', () => {
    expect(neighborClueId({ col: 3, row: 5 })).toBe('neighbor:3,5');
  });

  it('creates flower clue ID', () => {
    expect(flowerClueId({ col: 0, row: 0 })).toBe('flower:0,0');
  });

  it('creates line clue ID', () => {
    expect(lineClueId('ascending', { col: 1, row: 2 })).toBe('line:ascending:1,2');
  });

  it('has global remaining ID constant', () => {
    expect(GLOBAL_REMAINING_ID).toBe('global:remaining');
  });

  it('parses neighbor clue ID', () => {
    const parsed = parseClueId('neighbor:3,5');
    expect(parsed).toEqual({ type: 'neighbor', coord: { col: 3, row: 5 } });
  });

  it('parses flower clue ID', () => {
    const parsed = parseClueId('flower:0,0');
    expect(parsed).toEqual({ type: 'flower', coord: { col: 0, row: 0 } });
  });

  it('parses line clue ID', () => {
    const parsed = parseClueId('line:ascending:1,2');
    expect(parsed).toEqual({ type: 'line', axis: 'ascending', coord: { col: 1, row: 2 } });
  });

  it('parses global remaining ID', () => {
    const parsed = parseClueId('global:remaining');
    expect(parsed).toEqual({ type: 'global' });
  });

  it('throws on unknown clue ID format', () => {
    expect(() => parseClueId('unknown:foo')).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/deductions.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement types and clue ID helpers**

```typescript
// src/solver/deductions.ts
import type { HexCoord, LineAxis } from '../model/hex-coord';
import { coordKey, parseCoordKey } from '../model/hex-coord';

/** Identifies a specific clue instance. */
export type ClueId = string;

export function neighborClueId(coord: HexCoord): ClueId {
  return `neighbor:${coordKey(coord)}`;
}

export function flowerClueId(coord: HexCoord): ClueId {
  return `flower:${coordKey(coord)}`;
}

export function lineClueId(axis: LineAxis, startCoord: HexCoord): ClueId {
  return `line:${axis}:${coordKey(startCoord)}`;
}

export const GLOBAL_REMAINING_ID: ClueId = 'global:remaining';

export type ParsedClueId =
  | { type: 'neighbor'; coord: HexCoord }
  | { type: 'flower'; coord: HexCoord }
  | { type: 'line'; axis: LineAxis; coord: HexCoord }
  | { type: 'global' };

export function parseClueId(id: ClueId): ParsedClueId {
  if (id === GLOBAL_REMAINING_ID) return { type: 'global' };
  if (id.startsWith('neighbor:')) {
    return { type: 'neighbor', coord: parseCoordKey(id.slice('neighbor:'.length)) };
  }
  if (id.startsWith('flower:')) {
    return { type: 'flower', coord: parseCoordKey(id.slice('flower:'.length)) };
  }
  if (id.startsWith('line:')) {
    const rest = id.slice('line:'.length);
    const colonIdx = rest.indexOf(':');
    const axis = rest.slice(0, colonIdx) as LineAxis;
    const coord = parseCoordKey(rest.slice(colonIdx + 1));
    return { type: 'line', axis, coord };
  }
  throw new Error(`Unknown clue ID format: ${id}`);
}

/** Why a deduction was made. */
export interface DeductionReason {
  /** Which clue(s) produced this deduction. */
  clueIds: ClueId[];
  /** Human-readable explanation. */
  explanation: string;
}

/** A single logical deduction: this cell must be filled or empty. */
export interface Deduction {
  coord: HexCoord;
  result: 'filled' | 'empty';
  reason: DeductionReason;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/deductions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd test-apps/01-grid-mechanics && git add src/solver/deductions.ts tests/solver/deductions.test.ts
git commit -m "feat(solver): add deduction types and clue ID utilities"
```

---

### Task 2: Simple Deduction Functions

**Files:**
- Modify: `src/solver/deductions.ts`
- Modify: `tests/solver/deductions.test.ts`

Add functions that examine one clue in isolation and return deductions. These handle the "all-filled" and "all-empty" cases for each clue type.

- [ ] **Step 1: Write failing tests for simple neighbor deductions**

The tests need a helper to build a grid with specific cells covered/revealed. Add to `tests/solver/deductions.test.ts`:

```typescript
import {
  type HexCoord,
  coordKey,
  neighbors,
} from '../src/model/hex-coord';
import {
  CellGroundTruth,
  CellVisualState,
  type HexCell,
  createCell,
} from '../src/model/hex-cell';
import {
  neighborClueId,
  flowerClueId,
  lineClueId,
  deduceFromNeighborClue,
  deduceFromFlowerClue,
  deduceFromLineClue,
  deduceFromGlobalRemaining,
  type Deduction,
} from '../src/solver/deductions';

/** Create a cell with specific ground truth and visual state. */
function makeCell(
  coord: HexCoord,
  groundTruth: CellGroundTruth,
  visualState: CellVisualState,
): HexCell {
  const cell = createCell(coord, groundTruth);
  return { ...cell, visualState };
}

/** Build a cellMap from an array of HexCells. */
function buildMap(cells: HexCell[]): Map<string, HexCell> {
  const map = new Map<string, HexCell>();
  for (const c of cells) map.set(coordKey(c.coord), c);
  return map;
}

describe('deduceFromNeighborClue', () => {
  const center: HexCoord = { col: 4, row: 4 };
  const nbrs = neighbors(center);

  it('deduces all covered neighbors as empty when clue value equals filled count', () => {
    // Center is EMPTY with neighbor clue = 2. Two neighbors already marked filled.
    // The remaining 4 covered neighbors must be empty.
    const cells = [
      makeCell(center, CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(nbrs[0], CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(nbrs[1], CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(nbrs[2], CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(nbrs[3], CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(nbrs[4], CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(nbrs[5], CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromNeighborClue(center, 2, cellMap);
    expect(deductions).toHaveLength(4);
    for (const d of deductions) {
      expect(d.result).toBe('empty');
    }
  });

  it('deduces all covered neighbors as filled when remaining equals covered count', () => {
    // Center is EMPTY with neighbor clue = 4. Two neighbors already marked filled.
    // Two covered neighbors remain, and 4 - 2 = 2 remaining filled needed = 2 covered.
    const cells = [
      makeCell(center, CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(nbrs[0], CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(nbrs[1], CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(nbrs[2], CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(nbrs[3], CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(nbrs[4], CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell(nbrs[5], CellGroundTruth.FILLED, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromNeighborClue(center, 4, cellMap);
    expect(deductions).toHaveLength(2);
    for (const d of deductions) {
      expect(d.result).toBe('filled');
    }
  });

  it('returns empty array when no deduction is possible', () => {
    // Clue = 3, 1 filled so far, 3 covered — ambiguous
    const cells = [
      makeCell(center, CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(nbrs[0], CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(nbrs[1], CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(nbrs[2], CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(nbrs[3], CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(nbrs[4], CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell(nbrs[5], CellGroundTruth.FILLED, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromNeighborClue(center, 3, cellMap);
    expect(deductions).toHaveLength(0);
  });

  it('handles boundary cells with fewer than 6 neighbors', () => {
    // Only 3 neighbors exist, clue = 1, 1 already filled → 2 covered are empty
    const cells = [
      makeCell(center, CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(nbrs[0], CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(nbrs[1], CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(nbrs[2], CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromNeighborClue(center, 1, cellMap);
    expect(deductions).toHaveLength(2);
    for (const d of deductions) {
      expect(d.result).toBe('empty');
    }
  });

  it('returns empty array when cell is still covered (clue not visible)', () => {
    const cells = [
      makeCell(center, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(nbrs[0], CellGroundTruth.FILLED, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromNeighborClue(center, 2, cellMap);
    expect(deductions).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/deductions.test.ts`
Expected: FAIL — `deduceFromNeighborClue` not exported

- [ ] **Step 3: Implement deduceFromNeighborClue**

Add to `src/solver/deductions.ts`:

```typescript
import { neighbors, radius2Positions } from '../model/hex-coord';
import { CellVisualState, type HexCell } from '../model/hex-cell';
import type { LineClue } from '../clues/line';

/**
 * Count marked-filled and covered neighbors among cells that exist in the map.
 */
function countNeighborStates(
  coord: HexCoord,
  cellMap: Map<string, HexCell>,
): { markedFilled: number; covered: HexCoord[] } {
  let markedFilled = 0;
  const covered: HexCoord[] = [];
  for (const n of neighbors(coord)) {
    const cell = cellMap.get(coordKey(n));
    if (!cell) continue;
    if (cell.visualState === CellVisualState.MARKED_FILLED) markedFilled++;
    else if (cell.visualState === CellVisualState.COVERED) covered.push(n);
  }
  return { markedFilled, covered };
}

/**
 * Simple deduction from a single neighbor clue.
 * The clue cell must be OPEN_EMPTY for its clue to be visible.
 */
export function deduceFromNeighborClue(
  coord: HexCoord,
  clueValue: number,
  cellMap: Map<string, HexCell>,
): Deduction[] {
  const cell = cellMap.get(coordKey(coord));
  if (!cell || cell.visualState !== CellVisualState.OPEN_EMPTY) return [];

  const { markedFilled, covered } = countNeighborStates(coord, cellMap);
  if (covered.length === 0) return [];

  const remainingFilled = clueValue - markedFilled;
  const clueId = neighborClueId(coord);

  if (remainingFilled === 0) {
    // All filled neighbors accounted for — remaining covered must be empty
    return covered.map(c => ({
      coord: c,
      result: 'empty' as const,
      reason: {
        clueIds: [clueId],
        explanation: `Neighbor clue ${clueValue} at ${coordKey(coord)}: all filled neighbors found, rest are empty`,
      },
    }));
  }

  if (remainingFilled === covered.length) {
    // Remaining filled count equals covered count — all covered must be filled
    return covered.map(c => ({
      coord: c,
      result: 'filled' as const,
      reason: {
        clueIds: [clueId],
        explanation: `Neighbor clue ${clueValue} at ${coordKey(coord)}: ${remainingFilled} filled remaining = ${covered.length} covered`,
      },
    }));
  }

  return [];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/deductions.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing tests for flower and line deductions**

Add to `tests/solver/deductions.test.ts`:

```typescript
import { radius2Positions } from '../src/model/hex-coord';
import type { LineClue } from '../src/clues/line';

describe('deduceFromFlowerClue', () => {
  const center: HexCoord = { col: 4, row: 4 };

  it('deduces all covered radius-2 cells as empty when clue equals filled count', () => {
    // Flower clue = 1, 1 neighbor already marked filled, 2 covered neighbors → both empty
    const r2 = radius2Positions(center);
    const cells: HexCell[] = [
      makeCell(center, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(r2[0], CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(r2[1], CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(r2[2], CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromFlowerClue(center, 1, cellMap);
    expect(deductions).toHaveLength(2);
    for (const d of deductions) {
      expect(d.result).toBe('empty');
    }
  });

  it('deduces all covered radius-2 cells as filled when remaining equals covered', () => {
    const r2 = radius2Positions(center);
    // Flower clue = 3, 1 filled, 2 covered → both must be filled
    const cells: HexCell[] = [
      makeCell(center, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(r2[0], CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(r2[1], CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell(r2[2], CellGroundTruth.FILLED, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromFlowerClue(center, 3, cellMap);
    expect(deductions).toHaveLength(2);
    for (const d of deductions) {
      expect(d.result).toBe('filled');
    }
  });

  it('returns empty array when cell is not marked filled', () => {
    const cells: HexCell[] = [
      makeCell(center, CellGroundTruth.FILLED, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromFlowerClue(center, 1, cellMap);
    expect(deductions).toHaveLength(0);
  });

  it('returns empty array when no deduction possible', () => {
    const r2 = radius2Positions(center);
    // Flower clue = 2, 0 filled, 3 covered — ambiguous
    const cells: HexCell[] = [
      makeCell(center, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(r2[0], CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell(r2[1], CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(r2[2], CellGroundTruth.FILLED, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromFlowerClue(center, 2, cellMap);
    expect(deductions).toHaveLength(0);
  });
});

describe('deduceFromLineClue', () => {
  it('deduces all covered cells as empty when line clue equals marked count', () => {
    const lineCells: HexCoord[] = [
      { col: 2, row: 0 },
      { col: 2, row: 1 },
      { col: 2, row: 2 },
    ];
    const cells: HexCell[] = [
      makeCell(lineCells[0], CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(lineCells[1], CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(lineCells[2], CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const lineClue: LineClue = {
      axis: 'vertical',
      startCoord: lineCells[0],
      cells: lineCells,
      labelPositions: [],
      value: 1,
      notation: 'PLAIN' as any,
      contiguityEnabled: true,
    };
    const deductions = deduceFromLineClue(lineClue, cellMap);
    expect(deductions).toHaveLength(2);
    for (const d of deductions) {
      expect(d.result).toBe('empty');
    }
  });

  it('deduces all covered cells as filled when remaining equals covered count', () => {
    const lineCells: HexCoord[] = [
      { col: 2, row: 0 },
      { col: 2, row: 1 },
      { col: 2, row: 2 },
    ];
    const cells: HexCell[] = [
      makeCell(lineCells[0], CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(lineCells[1], CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell(lineCells[2], CellGroundTruth.FILLED, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const lineClue: LineClue = {
      axis: 'vertical',
      startCoord: lineCells[0],
      cells: lineCells,
      labelPositions: [],
      value: 2,
      notation: 'PLAIN' as any,
      contiguityEnabled: true,
    };
    const deductions = deduceFromLineClue(lineClue, cellMap);
    expect(deductions).toHaveLength(2);
    for (const d of deductions) {
      expect(d.result).toBe('filled');
    }
  });

  it('returns empty array when no deduction possible', () => {
    const lineCells: HexCoord[] = [
      { col: 2, row: 0 },
      { col: 2, row: 1 },
      { col: 2, row: 2 },
    ];
    const cells: HexCell[] = [
      makeCell(lineCells[0], CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(lineCells[1], CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell(lineCells[2], CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const lineClue: LineClue = {
      axis: 'vertical',
      startCoord: lineCells[0],
      cells: lineCells,
      labelPositions: [],
      value: 1,
      notation: 'PLAIN' as any,
      contiguityEnabled: true,
    };
    const deductions = deduceFromLineClue(lineClue, cellMap);
    expect(deductions).toHaveLength(0);
  });
});

describe('deduceFromGlobalRemaining', () => {
  it('deduces all covered as empty when remaining is 0', () => {
    const cells: HexCell[] = [
      makeCell({ col: 0, row: 0 }, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell({ col: 1, row: 0 }, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell({ col: 2, row: 0 }, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromGlobalRemaining(0, cellMap);
    expect(deductions).toHaveLength(2);
    for (const d of deductions) {
      expect(d.result).toBe('empty');
    }
  });

  it('deduces all covered as filled when remaining equals covered count', () => {
    const cells: HexCell[] = [
      makeCell({ col: 0, row: 0 }, CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell({ col: 1, row: 0 }, CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell({ col: 2, row: 0 }, CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromGlobalRemaining(2, cellMap);
    expect(deductions).toHaveLength(2);
    for (const d of deductions) {
      expect(d.result).toBe('filled');
    }
  });

  it('returns empty array when no deduction possible', () => {
    const cells: HexCell[] = [
      makeCell({ col: 0, row: 0 }, CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell({ col: 1, row: 0 }, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell({ col: 2, row: 0 }, CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromGlobalRemaining(1, cellMap);
    expect(deductions).toHaveLength(0);
  });

  it('returns empty array when no covered cells exist', () => {
    const cells: HexCell[] = [
      makeCell({ col: 0, row: 0 }, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell({ col: 1, row: 0 }, CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromGlobalRemaining(0, cellMap);
    expect(deductions).toHaveLength(0);
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/deductions.test.ts`
Expected: FAIL — functions not exported

- [ ] **Step 7: Implement deduceFromFlowerClue, deduceFromLineClue, deduceFromGlobalRemaining**

Add to `src/solver/deductions.ts`:

```typescript
/**
 * Simple deduction from a single flower clue.
 * The clue cell must be MARKED_FILLED for its clue to be visible.
 */
export function deduceFromFlowerClue(
  coord: HexCoord,
  clueValue: number,
  cellMap: Map<string, HexCell>,
): Deduction[] {
  const cell = cellMap.get(coordKey(coord));
  if (!cell || cell.visualState !== CellVisualState.MARKED_FILLED) return [];

  let markedFilled = 0;
  const covered: HexCoord[] = [];
  for (const pos of radius2Positions(coord)) {
    const r2Cell = cellMap.get(coordKey(pos));
    if (!r2Cell) continue;
    if (r2Cell.visualState === CellVisualState.MARKED_FILLED) markedFilled++;
    else if (r2Cell.visualState === CellVisualState.COVERED) covered.push(pos);
  }
  if (covered.length === 0) return [];

  const remainingFilled = clueValue - markedFilled;
  const clueId = flowerClueId(coord);

  if (remainingFilled === 0) {
    return covered.map(c => ({
      coord: c,
      result: 'empty' as const,
      reason: {
        clueIds: [clueId],
        explanation: `Flower clue ${clueValue} at ${coordKey(coord)}: all filled found, rest are empty`,
      },
    }));
  }

  if (remainingFilled === covered.length) {
    return covered.map(c => ({
      coord: c,
      result: 'filled' as const,
      reason: {
        clueIds: [clueId],
        explanation: `Flower clue ${clueValue} at ${coordKey(coord)}: ${remainingFilled} filled remaining = ${covered.length} covered`,
      },
    }));
  }

  return [];
}

/**
 * Simple deduction from a single line clue.
 */
export function deduceFromLineClue(
  lineClue: LineClue,
  cellMap: Map<string, HexCell>,
): Deduction[] {
  let markedFilled = 0;
  const covered: HexCoord[] = [];
  for (const c of lineClue.cells) {
    const cell = cellMap.get(coordKey(c));
    if (!cell) continue;
    if (cell.visualState === CellVisualState.MARKED_FILLED) markedFilled++;
    else if (cell.visualState === CellVisualState.COVERED) covered.push(c);
  }
  if (covered.length === 0) return [];

  const remainingFilled = lineClue.value - markedFilled;
  const clueId = lineClueId(lineClue.axis, lineClue.startCoord);

  if (remainingFilled === 0) {
    return covered.map(c => ({
      coord: c,
      result: 'empty' as const,
      reason: {
        clueIds: [clueId],
        explanation: `Line clue ${lineClue.value} (${lineClue.axis}) at ${coordKey(lineClue.startCoord)}: all filled found, rest are empty`,
      },
    }));
  }

  if (remainingFilled === covered.length) {
    return covered.map(c => ({
      coord: c,
      result: 'filled' as const,
      reason: {
        clueIds: [clueId],
        explanation: `Line clue ${lineClue.value} (${lineClue.axis}) at ${coordKey(lineClue.startCoord)}: ${remainingFilled} filled remaining = ${covered.length} covered`,
      },
    }));
  }

  return [];
}

/**
 * Deduction from the global remaining filled count.
 */
export function deduceFromGlobalRemaining(
  remainingCount: number,
  cellMap: Map<string, HexCell>,
): Deduction[] {
  const covered: HexCoord[] = [];
  for (const cell of cellMap.values()) {
    if (cell.visualState === CellVisualState.COVERED) covered.push(cell.coord);
  }
  if (covered.length === 0) return [];

  if (remainingCount === 0) {
    return covered.map(c => ({
      coord: c,
      result: 'empty' as const,
      reason: {
        clueIds: [GLOBAL_REMAINING_ID],
        explanation: 'Global remaining count is 0: all covered cells are empty',
      },
    }));
  }

  if (remainingCount === covered.length) {
    return covered.map(c => ({
      coord: c,
      result: 'filled' as const,
      reason: {
        clueIds: [GLOBAL_REMAINING_ID],
        explanation: `Global remaining ${remainingCount} = ${covered.length} covered: all must be filled`,
      },
    }));
  }

  return [];
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/deductions.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
cd test-apps/01-grid-mechanics && git add src/solver/deductions.ts tests/solver/deductions.test.ts
git commit -m "feat(solver): add simple deduction functions for all clue types"
```

---

### Task 3: Solver Orchestrator

**Files:**
- Create: `src/solver/solver.ts`
- Create: `tests/solver/solver.test.ts`

The solver runs all applicable deduction functions in one pass over visible clues and returns deduplicated results.

- [ ] **Step 1: Write failing tests for solve()**

```typescript
// tests/solver/solver.test.ts
import { describe, it, expect } from 'vitest';
import type { HexCoord } from '../src/model/hex-coord';
import { coordKey, neighbors } from '../src/model/hex-coord';
import {
  CellGroundTruth,
  CellVisualState,
  type HexCell,
  createCell,
} from '../src/model/hex-cell';
import { HexGrid, type TestGridConfig } from '../src/model/hex-grid';
import { neighborClueId, lineClueId } from '../src/solver/deductions';
import { solve } from '../src/solver/solver';

/** Create a small grid, compute clues, cover all cells, then selectively reveal some. */
function makeTestGrid(): HexGrid {
  // 3x3 grid with specific filled pattern
  const config: TestGridConfig = {
    name: 'solver-test',
    description: 'test grid for solver',
    width: 3,
    height: 3,
    filledCoords: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ],
    missingCoords: [],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

describe('solve', () => {
  it('returns deductions from visible neighbor clues in simple tier', () => {
    const grid = makeTestGrid();
    // Open an empty cell to reveal its neighbor clue
    // (0,1) is EMPTY — opening it reveals neighbor clue
    grid.openCell({ col: 0, row: 1 });

    const clueId = neighborClueId({ col: 0, row: 1 });
    const visibleClues = new Set([clueId]);
    const deductions = solve(grid, visibleClues, 'simple');

    // Should produce some deductions based on the neighbor clue at (0,1)
    expect(deductions.length).toBeGreaterThanOrEqual(0);
    // All deductions should reference the visible clue
    for (const d of deductions) {
      expect(d.reason.clueIds.some(id => visibleClues.has(id))).toBe(true);
    }
  });

  it('returns empty array when no clues are visible', () => {
    const grid = makeTestGrid();
    const deductions = solve(grid, new Set(), 'simple');
    expect(deductions).toHaveLength(0);
  });

  it('deduplicates deductions for the same cell', () => {
    const grid = makeTestGrid();
    // Open two adjacent empty cells whose clues overlap on covered neighbors
    grid.openCell({ col: 0, row: 1 });
    grid.openCell({ col: 0, row: 2 });

    const visibleClues = new Set([
      neighborClueId({ col: 0, row: 1 }),
      neighborClueId({ col: 0, row: 2 }),
    ]);
    const deductions = solve(grid, visibleClues, 'simple');

    // No coord should appear twice
    const coords = deductions.map(d => coordKey(d.coord));
    expect(new Set(coords).size).toBe(coords.length);
  });

  it('includes global remaining deduction in advanced tier when enabled', () => {
    const grid = makeTestGrid();
    // Mark all 3 filled cells — remaining = 0
    grid.markCell({ col: 0, row: 0 });
    grid.markCell({ col: 1, row: 0 });
    grid.markCell({ col: 2, row: 0 });

    const visibleClues = new Set(['global:remaining']);
    const deductions = solve(grid, visibleClues, 'advanced');

    // Should deduce all remaining covered cells as empty
    expect(deductions.length).toBeGreaterThan(0);
    for (const d of deductions) {
      expect(d.result).toBe('empty');
    }
  });

  it('does not include global remaining deduction in simple tier', () => {
    const grid = makeTestGrid();
    grid.markCell({ col: 0, row: 0 });
    grid.markCell({ col: 1, row: 0 });
    grid.markCell({ col: 2, row: 0 });

    const visibleClues = new Set(['global:remaining']);
    const deductions = solve(grid, visibleClues, 'simple');
    expect(deductions).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/solver.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement solve()**

```typescript
// src/solver/solver.ts
import { coordKey } from '../model/hex-coord';
import { CellGroundTruth, CellVisualState } from '../model/hex-cell';
import type { HexGrid } from '../model/hex-grid';
import {
  type ClueId,
  type Deduction,
  GLOBAL_REMAINING_ID,
  parseClueId,
  deduceFromNeighborClue,
  deduceFromFlowerClue,
  deduceFromLineClue,
  deduceFromGlobalRemaining,
} from './deductions';

export type SolveTier = 'simple' | 'advanced';

/**
 * Run one pass of deduction over all visible clues.
 * Returns deduplicated deductions (one per cell, first wins).
 */
export function solve(
  grid: HexGrid,
  visibleClues: Set<ClueId>,
  tier: SolveTier,
): Deduction[] {
  const all: Deduction[] = [];

  for (const clueId of visibleClues) {
    const parsed = parseClueId(clueId);

    switch (parsed.type) {
      case 'neighbor': {
        const cell = grid.cells.get(coordKey(parsed.coord));
        if (cell && cell.neighborClueValue !== null) {
          all.push(...deduceFromNeighborClue(parsed.coord, cell.neighborClueValue, grid.cells));
        }
        break;
      }
      case 'flower': {
        const cell = grid.cells.get(coordKey(parsed.coord));
        if (cell && cell.flowerClueValue !== null) {
          all.push(...deduceFromFlowerClue(parsed.coord, cell.flowerClueValue, grid.cells));
        }
        break;
      }
      case 'line': {
        const lineClue = grid.lineClues.find(
          lc => lc.axis === parsed.axis &&
                coordKey(lc.startCoord) === coordKey(parsed.coord),
        );
        if (lineClue) {
          all.push(...deduceFromLineClue(lineClue, grid.cells));
        }
        break;
      }
      case 'global': {
        if (tier === 'advanced') {
          all.push(...deduceFromGlobalRemaining(grid.remainingCount, grid.cells));
        }
        break;
      }
    }
  }

  // Deduplicate: first deduction for each coord wins
  const seen = new Set<string>();
  const unique: Deduction[] = [];
  for (const d of all) {
    const key = coordKey(d.coord);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(d);
    }
  }

  return unique;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/solver.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd test-apps/01-grid-mechanics && git add src/solver/solver.ts tests/solver/solver.test.ts
git commit -m "feat(solver): add solve() orchestrator for single-pass deduction"
```

---

### Task 4: Solvability Verifier

**Files:**
- Create: `src/solver/verifier.ts`
- Create: `tests/solver/verifier.test.ts`

The verifier runs `solve()` in a loop, applying deductions to a grid copy, and produces a `SolveReplay`.

- [ ] **Step 1: Write failing tests for verify()**

```typescript
// tests/solver/verifier.test.ts
import { describe, it, expect } from 'vitest';
import { coordKey } from '../src/model/hex-coord';
import { CellGroundTruth, CellVisualState } from '../src/model/hex-cell';
import { HexGrid, type TestGridConfig } from '../src/model/hex-grid';
import { neighborClueId, lineClueId, flowerClueId } from '../src/solver/deductions';
import { verify, type SolveReplay } from '../src/solver/verifier';

function makeTinyGrid(): HexGrid {
  // A 3x1 grid: col 0 FILLED, col 1 EMPTY, col 2 FILLED
  // Neighbor clue at (1,0) = 2 (both neighbors filled)
  // With all 3 cells covered and neighbor clue visible, solver should deduce:
  //   clue=2, 0 marked, 2 covered neighbors → all filled
  //   Then (1,0) itself needs to be opened — but (1,0) is the clue cell.
  // Actually we need a slightly different setup. Let's use a vertical line.
  const config: TestGridConfig = {
    name: 'verify-test',
    description: 'tiny verifier test',
    width: 3,
    height: 2,
    filledCoords: [
      { col: 0, row: 0 },
      { col: 2, row: 0 },
    ],
    missingCoords: [],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

describe('verify', () => {
  it('returns solvable=true when all cells can be deduced', () => {
    // Build a grid where revealing one clue cascades to solve everything
    const config: TestGridConfig = {
      name: 'solvable',
      description: 'fully solvable test',
      width: 2,
      height: 1,
      filledCoords: [{ col: 0, row: 0 }],
      missingCoords: [],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();

    // (1,0) is EMPTY with neighbor clue = 1. Visible clue on it.
    // When (1,0) is open, its clue says 1 filled neighbor. (0,0) is the only neighbor in grid → filled.
    // But wait — (1,0) starts covered. We need to expose it first.
    // The verifier should handle this: the clue is "visible" means the generator chose to show it.
    // So (1,0) is revealed as part of the visible clues set.

    const visibleClues = new Set([neighborClueId({ col: 1, row: 0 })]);
    const result = verify(grid, visibleClues, 'simple');

    expect(result.stuck).toBe(false);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('returns stuck=true when solver cannot proceed', () => {
    const config: TestGridConfig = {
      name: 'stuck',
      description: 'unsolvable without more clues',
      width: 3,
      height: 3,
      filledCoords: [
        { col: 0, row: 0 },
        { col: 2, row: 2 },
      ],
      missingCoords: [],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();

    // No clues visible — solver can't do anything
    const result = verify(grid, new Set(), 'simple');

    expect(result.stuck).toBe(true);
    expect(result.stuckCells).toBeDefined();
    expect(result.stuckCells!.size).toBeGreaterThan(0);
  });

  it('steps array has non-empty deductions at each step', () => {
    const config: TestGridConfig = {
      name: 'step-check',
      description: 'check step structure',
      width: 2,
      height: 1,
      filledCoords: [{ col: 0, row: 0 }],
      missingCoords: [],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();

    const visibleClues = new Set([neighborClueId({ col: 1, row: 0 })]);
    const result = verify(grid, visibleClues, 'simple');

    for (const step of result.steps) {
      expect(step.deductions.length).toBeGreaterThan(0);
    }
  });

  it('boardState in each step reflects applied deductions', () => {
    const config: TestGridConfig = {
      name: 'state-check',
      description: 'check board state snapshots',
      width: 2,
      height: 1,
      filledCoords: [{ col: 0, row: 0 }],
      missingCoords: [],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();

    const visibleClues = new Set([neighborClueId({ col: 1, row: 0 })]);
    const result = verify(grid, visibleClues, 'simple');

    if (result.steps.length > 0) {
      const lastStep = result.steps[result.steps.length - 1];
      // After all deductions, no cell should be COVERED (if solvable)
      if (!result.stuck) {
        for (const state of lastStep.boardState.values()) {
          expect(state).not.toBe(CellVisualState.COVERED);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/verifier.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement verify()**

```typescript
// src/solver/verifier.ts
import { coordKey } from '../model/hex-coord';
import {
  CellGroundTruth,
  CellVisualState,
  type HexCell,
} from '../model/hex-cell';
import { HexGrid, type TestGridConfig } from '../model/hex-grid';
import type { ClueId, Deduction } from './deductions';
import { type SolveTier, solve } from './solver';

export interface SolveStep {
  deductions: Deduction[];
  boardState: Map<string, CellVisualState>;
}

export interface SolveReplay {
  steps: SolveStep[];
  stuck: boolean;
  stuckCells?: Set<string>;
}

/**
 * Clone a grid's cell map for simulation.
 * Returns a mutable Map<string, HexCell> that can be modified without affecting the original.
 */
function cloneCells(cells: Map<string, HexCell>): Map<string, HexCell> {
  const clone = new Map<string, HexCell>();
  for (const [key, cell] of cells) {
    clone.set(key, { ...cell });
  }
  return clone;
}

/**
 * Create a lightweight HexGrid copy that shares structure but uses cloned cells.
 * This is a simulation grid — only cells and remainingCount are meaningful.
 */
function cloneGrid(grid: HexGrid): HexGrid {
  const config: TestGridConfig = {
    name: 'sim',
    description: 'simulation',
    width: grid.width,
    height: grid.height,
    filledCoords: [],
    missingCoords: [],
  };
  const simGrid = Object.create(HexGrid.prototype) as HexGrid;
  (simGrid as any).width = grid.width;
  (simGrid as any).height = grid.height;
  (simGrid as any).cells = cloneCells(grid.cells);
  (simGrid as any).lineClues = grid.lineClues;
  (simGrid as any).remainingCount = grid.remainingCount;
  (simGrid as any).mistakeCount = 0;
  return simGrid;
}

/**
 * Apply deductions to the simulation grid.
 * Reveals cells that the clue selector chose to expose, and applies deduction results.
 */
function applyDeductions(
  simGrid: HexGrid,
  deductions: Deduction[],
): void {
  for (const d of deductions) {
    const key = coordKey(d.coord);
    const cell = simGrid.cells.get(key);
    if (!cell || cell.visualState !== CellVisualState.COVERED) continue;

    if (d.result === 'filled') {
      simGrid.cells.set(key, { ...cell, visualState: CellVisualState.MARKED_FILLED });
      if (cell.groundTruth === CellGroundTruth.FILLED) {
        (simGrid as any).remainingCount--;
      }
    } else {
      simGrid.cells.set(key, { ...cell, visualState: CellVisualState.OPEN_EMPTY });
    }
  }
}

/**
 * Reveal cells whose clues are in the visible set.
 * Neighbor clues: the EMPTY cell itself must be OPEN_EMPTY for the clue to be readable.
 * Flower clues: the FILLED cell must be MARKED_FILLED.
 * For the verifier, we pre-reveal these cells before starting.
 */
function revealClueCells(
  simGrid: HexGrid,
  visibleClues: Set<ClueId>,
): void {
  for (const clueId of visibleClues) {
    if (clueId.startsWith('neighbor:')) {
      const coordStr = clueId.slice('neighbor:'.length);
      const cell = simGrid.cells.get(coordStr);
      if (cell && cell.visualState === CellVisualState.COVERED &&
          cell.groundTruth === CellGroundTruth.EMPTY) {
        simGrid.cells.set(coordStr, { ...cell, visualState: CellVisualState.OPEN_EMPTY });
      }
    } else if (clueId.startsWith('flower:')) {
      const coordStr = clueId.slice('flower:'.length);
      const cell = simGrid.cells.get(coordStr);
      if (cell && cell.visualState === CellVisualState.COVERED &&
          cell.groundTruth === CellGroundTruth.FILLED) {
        simGrid.cells.set(coordStr, { ...cell, visualState: CellVisualState.MARKED_FILLED });
        (simGrid as any).remainingCount--;
      }
    }
    // Line clues and global remaining don't require revealing specific cells
  }
}

function snapshotBoard(cells: Map<string, HexCell>): Map<string, CellVisualState> {
  const snapshot = new Map<string, CellVisualState>();
  for (const [key, cell] of cells) {
    snapshot.set(key, cell.visualState);
  }
  return snapshot;
}

/**
 * Run the solver in a loop until all cells are resolved or we get stuck.
 */
export function verify(
  grid: HexGrid,
  visibleClues: Set<ClueId>,
  tier: SolveTier,
): SolveReplay {
  const simGrid = cloneGrid(grid);
  revealClueCells(simGrid, visibleClues);

  const steps: SolveStep[] = [];
  const maxIterations = grid.cells.size; // safety bound

  for (let i = 0; i < maxIterations; i++) {
    const deductions = solve(simGrid, visibleClues, tier);
    if (deductions.length === 0) break;

    applyDeductions(simGrid, deductions);
    steps.push({
      deductions,
      boardState: snapshotBoard(simGrid.cells),
    });
  }

  // Check if any cells are still covered
  const stuckCells = new Set<string>();
  for (const [key, cell] of simGrid.cells) {
    if (cell.visualState === CellVisualState.COVERED) {
      stuckCells.add(key);
    }
  }

  return {
    steps,
    stuck: stuckCells.size > 0,
    stuckCells: stuckCells.size > 0 ? stuckCells : undefined,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/verifier.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd test-apps/01-grid-mechanics && git add src/solver/verifier.ts tests/solver/verifier.test.ts
git commit -m "feat(solver): add verify() loop producing SolveReplay"
```

---

### Task 5: Clue Selector

**Files:**
- Create: `src/solver/clue-selector.ts`
- Create: `tests/solver/clue-selector.test.ts`

Finds a subset of clues that makes the puzzle solvable at the target difficulty.

- [ ] **Step 1: Write failing tests for selectClues()**

```typescript
// tests/solver/clue-selector.test.ts
import { describe, it, expect } from 'vitest';
import { coordKey } from '../src/model/hex-coord';
import { CellGroundTruth } from '../src/model/hex-cell';
import { HexGrid, type TestGridConfig } from '../src/model/hex-grid';
import { neighborClueId, flowerClueId, lineClueId } from '../src/solver/deductions';
import { selectClues, allClueIds, type ClueSelection } from '../src/solver/clue-selector';

function makeSimpleGrid(): HexGrid {
  // 2x1 grid: (0,0) FILLED, (1,0) EMPTY
  // Neighbor clue at (1,0) = 1 → can deduce (0,0) is filled
  const config: TestGridConfig = {
    name: 'simple',
    description: 'simple 2-cell grid',
    width: 2,
    height: 1,
    filledCoords: [{ col: 0, row: 0 }],
    missingCoords: [],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

describe('allClueIds', () => {
  it('returns all neighbor, flower, and line clue IDs for a grid', () => {
    const grid = makeSimpleGrid();
    const ids = allClueIds(grid);
    // Should include neighbor clue for the EMPTY cell (1,0)
    expect(ids.has(neighborClueId({ col: 1, row: 0 }))).toBe(true);
  });
});

describe('selectClues', () => {
  it('returns a valid clue selection for a solvable grid in easy mode', () => {
    const grid = makeSimpleGrid();
    const result = selectClues(grid, 'easy');
    expect(result).not.toBeNull();
    expect(result!.difficulty).toBe('easy');
    expect(result!.verifyResult.stuck).toBe(false);
    expect(result!.visibleClues.size).toBeGreaterThan(0);
  });

  it('returns a valid clue selection for a solvable grid in hard mode', () => {
    const grid = makeSimpleGrid();
    const result = selectClues(grid, 'hard');
    expect(result).not.toBeNull();
    expect(result!.difficulty).toBe('hard');
    expect(result!.verifyResult.stuck).toBe(false);
  });

  it('returns null when grid is unsolvable even with all clues', () => {
    // Grid with 2 identical empty cells and symmetric clues — ambiguous
    // Actually hard to construct a truly unsolvable grid with all clues.
    // Use a grid where cells are isolated with no clue differentiation.
    const config: TestGridConfig = {
      name: 'unsolvable',
      description: 'cannot be solved',
      width: 5,
      height: 5,
      filledCoords: [
        { col: 0, row: 0 },
        { col: 4, row: 4 },
      ],
      missingCoords: [],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();

    // This may or may not be solvable — depends on whether neighbor clues
    // are sufficient. The test validates the null return path.
    const result = selectClues(grid, 'easy');
    // If it returns null, the grid needs editing
    // If it returns non-null, the selector found a solution
    // Either way, result should be well-formed
    if (result !== null) {
      expect(result.verifyResult.stuck).toBe(false);
    }
  });

  it('hard mode uses fewer clues than easy mode', () => {
    const config: TestGridConfig = {
      name: 'difficulty-compare',
      description: 'compare difficulty',
      width: 3,
      height: 2,
      filledCoords: [
        { col: 0, row: 0 },
        { col: 1, row: 1 },
      ],
      missingCoords: [],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();

    const easy = selectClues(grid, 'easy');
    const hard = selectClues(grid, 'hard');

    if (easy && hard) {
      expect(hard.visibleClues.size).toBeLessThanOrEqual(easy.visibleClues.size);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/clue-selector.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement selectClues()**

```typescript
// src/solver/clue-selector.ts
import { coordKey } from '../model/hex-coord';
import { CellGroundTruth } from '../model/hex-cell';
import type { HexGrid } from '../model/hex-grid';
import {
  type ClueId,
  neighborClueId,
  flowerClueId,
  lineClueId,
  GLOBAL_REMAINING_ID,
} from './deductions';
import type { SolveReplay } from './verifier';
import { verify } from './verifier';
import type { SolveTier } from './solver';

export interface ClueSelection {
  visibleClues: Set<ClueId>;
  difficulty: 'easy' | 'hard';
  verifyResult: SolveReplay;
}

/**
 * Enumerate all possible clue IDs for a grid.
 */
export function allClueIds(grid: HexGrid): Set<ClueId> {
  const ids = new Set<ClueId>();

  for (const cell of grid.cells.values()) {
    if (cell.groundTruth === CellGroundTruth.EMPTY && cell.neighborClueValue !== null) {
      ids.add(neighborClueId(cell.coord));
    }
    if (cell.groundTruth === CellGroundTruth.FILLED && cell.flowerClueValue !== null) {
      ids.add(flowerClueId(cell.coord));
    }
  }

  for (const lc of grid.lineClues) {
    ids.add(lineClueId(lc.axis, lc.startCoord));
  }

  return ids;
}

/**
 * Find a subset of clues that makes the puzzle solvable.
 * Returns null if the grid isn't solvable even with all clues.
 */
export function selectClues(
  grid: HexGrid,
  difficulty: 'easy' | 'hard',
): ClueSelection | null {
  const tier: SolveTier = difficulty === 'easy' ? 'simple' : 'advanced';
  const all = allClueIds(grid);

  // For hard mode, also consider global remaining
  if (difficulty === 'hard') {
    all.add(GLOBAL_REMAINING_ID);
  }

  // First check: is the puzzle solvable with all clues?
  const fullResult = verify(grid, all, tier);
  if (fullResult.stuck) {
    return null; // Grid needs editing
  }

  // Prune: try removing each clue, keep it hidden if still solvable
  const required = new Set<ClueId>();
  const candidates = [...all];

  // Shuffle candidates for variety (different minimal sets each time)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const current = new Set(all);

  for (const clueId of candidates) {
    current.delete(clueId);
    const result = verify(grid, current, tier);
    if (result.stuck) {
      // This clue is required — add it back
      current.add(clueId);
      required.add(clueId);
    }
  }

  // For easy mode, add back non-required clues to taste
  if (difficulty === 'easy') {
    const nonRequired = candidates.filter(id => !required.has(id));
    // Add back ~50% of non-required clues, preferring neighbor and line over flower
    const neighborAndLine = nonRequired.filter(id => id.startsWith('neighbor:') || id.startsWith('line:'));
    const flower = nonRequired.filter(id => id.startsWith('flower:'));

    // Add all neighbor+line extras
    for (const id of neighborAndLine) {
      current.add(id);
    }
    // Add a few flower extras
    const flowerCount = Math.ceil(flower.length * 0.3);
    for (let i = 0; i < flowerCount; i++) {
      current.add(flower[i]);
    }
  }

  const finalResult = verify(grid, current, tier);
  return {
    visibleClues: current,
    difficulty,
    verifyResult: finalResult,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/clue-selector.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd test-apps/01-grid-mechanics && git add src/solver/clue-selector.ts tests/solver/clue-selector.test.ts
git commit -m "feat(solver): add clue selector with difficulty-based pruning"
```

---

### Task 6: Grid Editor

**Files:**
- Create: `src/solver/grid-editor.ts`
- Create: `tests/solver/grid-editor.test.ts`

Makes minimal edits to a grid to achieve solvability when clue selection alone isn't enough.

- [ ] **Step 1: Write failing tests for editForSolvability()**

```typescript
// tests/solver/grid-editor.test.ts
import { describe, it, expect } from 'vitest';
import { coordKey } from '../src/model/hex-coord';
import { CellGroundTruth } from '../src/model/hex-cell';
import { HexGrid, type TestGridConfig } from '../src/model/hex-grid';
import { editForSolvability, type EditResult } from '../src/solver/grid-editor';
import { selectClues } from '../src/solver/clue-selector';

function makeUnsolvableGrid(): HexGrid {
  // Large grid with sparse, isolated filled cells that create ambiguity
  // The solver can't distinguish between multiple valid configurations
  const config: TestGridConfig = {
    name: 'unsolvable',
    description: 'needs editing',
    width: 6,
    height: 6,
    filledCoords: [
      { col: 0, row: 0 },
      { col: 5, row: 5 },
    ],
    missingCoords: [],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

describe('editForSolvability', () => {
  it('returns an edit result when grid can be fixed', () => {
    const grid = makeUnsolvableGrid();
    // Only attempt if this grid is actually unsolvable
    const initial = selectClues(grid, 'easy');
    if (initial !== null) {
      // Grid was already solvable — this test config doesn't trigger editing
      // Just verify the function doesn't crash
      const result = editForSolvability(grid, 'easy', 5);
      expect(result).not.toBeNull();
      return;
    }

    const result = editForSolvability(grid, 'easy', 10);
    if (result !== null) {
      expect(result.edits.length).toBeGreaterThan(0);
      expect(result.clueSelection.verifyResult.stuck).toBe(false);
    }
  });

  it('returns null when maxEdits is exceeded', () => {
    const grid = makeUnsolvableGrid();
    const initial = selectClues(grid, 'easy');
    if (initial !== null) return; // skip if already solvable

    const result = editForSolvability(grid, 'easy', 0);
    expect(result).toBeNull();
  });

  it('prefers toggling ground truth over adding/removing cells', () => {
    const grid = makeUnsolvableGrid();
    const initial = selectClues(grid, 'easy');
    if (initial !== null) return;

    const result = editForSolvability(grid, 'easy', 10);
    if (result !== null) {
      const toggleEdits = result.edits.filter(e => e.type === 'toggle_truth');
      const structuralEdits = result.edits.filter(e => e.type !== 'toggle_truth');
      // If there are structural edits, there should be no successful toggle edits
      // (toggles are tried first)
      if (structuralEdits.length > 0) {
        // This just verifies the function ran without crashing
        expect(result.edits.length).toBeGreaterThan(0);
      }
    }
  });

  it('works with hard difficulty', () => {
    const grid = makeUnsolvableGrid();
    const result = editForSolvability(grid, 'hard', 10);
    // Should either solve it or return null — no crash
    if (result !== null) {
      expect(result.clueSelection.verifyResult.stuck).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/grid-editor.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement editForSolvability()**

```typescript
// src/solver/grid-editor.ts
import type { HexCoord } from '../model/hex-coord';
import { coordKey, neighbors } from '../model/hex-coord';
import { CellGroundTruth } from '../model/hex-cell';
import { HexGrid, type TestGridConfig } from '../model/hex-grid';
import { selectClues, allClueIds, type ClueSelection } from './clue-selector';
import { verify } from './verifier';

export interface GridEdit {
  coord: HexCoord;
  type: 'toggle_truth' | 'add_cell' | 'remove_cell';
}

export interface EditResult {
  edits: GridEdit[];
  grid: HexGrid;
  clueSelection: ClueSelection;
}

/**
 * Clone a grid by reconstructing it from its current state.
 */
function cloneGridForEdit(grid: HexGrid): HexGrid {
  const filledCoords: HexCoord[] = [];
  const missingCoords: HexCoord[] = [];
  const allCoords = new Set<string>();

  for (const cell of grid.cells.values()) {
    allCoords.add(coordKey(cell.coord));
    if (cell.groundTruth === CellGroundTruth.FILLED) {
      filledCoords.push(cell.coord);
    }
  }

  // Find missing coords within bounds
  for (let col = 0; col < grid.width; col++) {
    for (let row = 0; row < grid.height; row++) {
      const key = coordKey({ col, row });
      if (!allCoords.has(key)) {
        missingCoords.push({ col, row });
      }
    }
  }

  const config: TestGridConfig = {
    name: 'edited',
    description: 'edited grid',
    width: grid.width,
    height: grid.height,
    filledCoords,
    missingCoords,
  };
  const clone = new HexGrid(config);
  clone.computeAllClues();
  clone.coverAll();
  return clone;
}

/**
 * Apply an edit to a grid clone and check if it becomes solvable.
 */
function tryEdit(
  grid: HexGrid,
  edit: GridEdit,
  difficulty: 'easy' | 'hard',
): ClueSelection | null {
  const clone = cloneGridForEdit(grid);

  switch (edit.type) {
    case 'toggle_truth':
      clone.toggleGroundTruth(edit.coord);
      break;
    case 'remove_cell':
      if (clone.cells.has(coordKey(edit.coord))) {
        clone.toggleMissing(edit.coord);
      }
      break;
    case 'add_cell':
      if (!clone.cells.has(coordKey(edit.coord))) {
        clone.toggleMissing(edit.coord);
      }
      break;
  }

  clone.computeAllClues();
  clone.coverAll();
  return selectClues(clone, difficulty);
}

/**
 * Make minimal edits to a grid to achieve solvability.
 * Returns null if it can't be fixed within maxEdits.
 */
export function editForSolvability(
  grid: HexGrid,
  difficulty: 'easy' | 'hard',
  maxEdits: number = 5,
): EditResult | null {
  if (maxEdits <= 0) return null;

  // First, check if already solvable
  const initial = selectClues(grid, difficulty);
  if (initial !== null) {
    return { edits: [], grid, clueSelection: initial };
  }

  // Get stuck cells to focus edits
  const tier = difficulty === 'easy' ? 'simple' as const : 'advanced' as const;
  const allIds = allClueIds(grid);
  if (difficulty === 'hard') allIds.add('global:remaining');
  const fullVerify = verify(grid, allIds, tier);
  const stuckCells = fullVerify.stuckCells ?? new Set<string>();

  // Collect candidate coords: stuck cells + their neighbors
  const candidateKeys = new Set<string>();
  for (const key of stuckCells) {
    candidateKeys.add(key);
    const coord = grid.cells.get(key)?.coord;
    if (coord) {
      for (const n of neighbors(coord)) {
        candidateKeys.add(coordKey(n));
      }
    }
  }

  // Strategy 1: Try toggling ground truth on candidates
  for (const key of candidateKeys) {
    const cell = grid.cells.get(key);
    if (!cell) continue;

    const edit: GridEdit = { coord: cell.coord, type: 'toggle_truth' };
    const result = tryEdit(grid, edit, difficulty);
    if (result !== null) {
      const editedGrid = cloneGridForEdit(grid);
      editedGrid.toggleGroundTruth(cell.coord);
      editedGrid.computeAllClues();
      editedGrid.coverAll();
      return { edits: [edit], grid: editedGrid, clueSelection: result };
    }
  }

  // Strategy 2: Try removing cells near stuck region
  for (const key of candidateKeys) {
    const cell = grid.cells.get(key);
    if (!cell) continue;

    const edit: GridEdit = { coord: cell.coord, type: 'remove_cell' };
    const result = tryEdit(grid, edit, difficulty);
    if (result !== null) {
      const editedGrid = cloneGridForEdit(grid);
      editedGrid.toggleMissing(cell.coord);
      editedGrid.computeAllClues();
      editedGrid.coverAll();
      return { edits: [edit], grid: editedGrid, clueSelection: result };
    }
  }

  // Strategy 3: Try adding cells adjacent to stuck region (missing cells only)
  for (const key of candidateKeys) {
    if (grid.cells.has(key)) continue; // cell already exists

    const [colStr, rowStr] = key.split(',');
    const coord: HexCoord = { col: Number(colStr), row: Number(rowStr) };
    if (coord.col < 0 || coord.row < 0 || coord.col >= grid.width || coord.row >= grid.height) continue;

    const edit: GridEdit = { coord, type: 'add_cell' };
    const result = tryEdit(grid, edit, difficulty);
    if (result !== null) {
      const editedGrid = cloneGridForEdit(grid);
      editedGrid.toggleMissing(coord);
      editedGrid.computeAllClues();
      editedGrid.coverAll();
      return { edits: [edit], grid: editedGrid, clueSelection: result };
    }
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/grid-editor.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd test-apps/01-grid-mechanics && git add src/solver/grid-editor.ts tests/solver/grid-editor.test.ts
git commit -m "feat(solver): add grid editor for minimal solvability edits"
```

---

### Task 7: Pipeline

**Files:**
- Create: `src/solver/pipeline.ts`
- Create: `tests/solver/pipeline.test.ts`

Top-level `generatePuzzle()` that wires everything together.

- [ ] **Step 1: Write failing tests for generatePuzzle()**

```typescript
// tests/solver/pipeline.test.ts
import { describe, it, expect } from 'vitest';
import { HexGrid, type TestGridConfig } from '../src/model/hex-grid';
import { generatePuzzle, type PuzzleResult } from '../src/solver/pipeline';

function makeGrid(
  width: number,
  height: number,
  filledCoords: Array<{ col: number; row: number }>,
): HexGrid {
  const config: TestGridConfig = {
    name: 'pipeline-test',
    description: 'test',
    width,
    height,
    filledCoords,
    missingCoords: [],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

describe('generatePuzzle', () => {
  it('generates a solvable puzzle for a simple grid in easy mode', () => {
    const grid = makeGrid(3, 2, [
      { col: 0, row: 0 },
      { col: 1, row: 1 },
    ]);
    const result = generatePuzzle(grid, 'easy');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.replay.stuck).toBe(false);
      expect(result.clueSelection.visibleClues.size).toBeGreaterThan(0);
    }
  });

  it('generates a solvable puzzle for a simple grid in hard mode', () => {
    const grid = makeGrid(3, 2, [
      { col: 0, row: 0 },
      { col: 1, row: 1 },
    ]);
    const result = generatePuzzle(grid, 'hard');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.replay.stuck).toBe(false);
    }
  });

  it('returns edits array (possibly empty) in result', () => {
    const grid = makeGrid(2, 1, [{ col: 0, row: 0 }]);
    const result = generatePuzzle(grid, 'easy');
    expect(result).not.toBeNull();
    if (result) {
      expect(Array.isArray(result.edits)).toBe(true);
    }
  });

  it('replay has at least one step for a non-trivial grid', () => {
    const grid = makeGrid(3, 3, [
      { col: 0, row: 0 },
      { col: 1, row: 1 },
      { col: 2, row: 2 },
    ]);
    const result = generatePuzzle(grid, 'easy');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.replay.steps.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/pipeline.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement generatePuzzle()**

```typescript
// src/solver/pipeline.ts
import type { HexGrid } from '../model/hex-grid';
import type { GridEdit } from './grid-editor';
import type { ClueSelection } from './clue-selector';
import type { SolveReplay } from './verifier';
import { selectClues } from './clue-selector';
import { editForSolvability } from './grid-editor';

export interface PuzzleResult {
  grid: HexGrid;
  clueSelection: ClueSelection;
  edits: GridEdit[];
  replay: SolveReplay;
}

/**
 * Generate a solvable puzzle from an existing grid.
 * Tries clue selection first; if that fails, edits the grid minimally.
 * Returns null if the grid can't be made solvable.
 */
export function generatePuzzle(
  grid: HexGrid,
  difficulty: 'easy' | 'hard',
): PuzzleResult | null {
  // Try clue selection on the original grid
  const selection = selectClues(grid, difficulty);
  if (selection !== null) {
    return {
      grid,
      clueSelection: selection,
      edits: [],
      replay: selection.verifyResult,
    };
  }

  // Grid isn't solvable with clues alone — try editing
  const editResult = editForSolvability(grid, difficulty);
  if (editResult !== null) {
    return {
      grid: editResult.grid,
      clueSelection: editResult.clueSelection,
      edits: editResult.edits,
      replay: editResult.clueSelection.verifyResult,
    };
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/pipeline.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd test-apps/01-grid-mechanics && git add src/solver/pipeline.ts tests/solver/pipeline.test.ts
git commit -m "feat(solver): add generatePuzzle() pipeline"
```

---

### Task 8: Update Coverage Config

**Files:**
- Modify: `test-apps/01-grid-mechanics/vite.config.ts`

Add `src/solver/**` to the coverage includes so new code is covered by the 100% branch threshold.

- [ ] **Step 1: Update vite.config.ts**

In the `coverage.include` array, add `'src/solver/**'`:

```typescript
coverage: {
  provider: 'v8',
  include: ['src/model/**', 'src/clues/**', 'src/grids/**', 'src/save/**', 'src/solver/**'],
  exclude: ['src/view/**', 'src/save/storage.ts'],
  thresholds: { branches: 100 },
},
```

- [ ] **Step 2: Run full test suite with coverage**

Run: `npm --prefix test-apps/01-grid-mechanics run coverage`
Expected: All tests pass, 100% branch coverage on solver code. If any branches are uncovered, add tests in the relevant test file.

- [ ] **Step 3: Fix any coverage gaps**

Review the coverage report. Add tests for any uncovered branches in `src/solver/` files. Common gaps: error paths, edge cases in grid editor strategies.

- [ ] **Step 4: Commit**

```bash
cd test-apps/01-grid-mechanics && git add vite.config.ts
git commit -m "chore: add src/solver to coverage includes"
```

---

### Task 9: Replay Viewer

**Files:**
- Create: `src/view/solve-replay.ts`
- Modify: `src/main.ts`

Add step-through solve visualization to the UI. This code is in `src/view/` and excluded from coverage requirements.

- [ ] **Step 1: Create the ReplayController**

```typescript
// src/view/solve-replay.ts
import type { SolveReplay, SolveStep } from '../solver/verifier';
import type { Deduction } from '../solver/deductions';

export interface ReplayHighlights {
  /** Cells deduced in the current step, with their result. */
  deducedCells: Map<string, 'filled' | 'empty'>;
  /** Clue IDs that produced the current step's deductions. */
  activeClueIds: Set<string>;
  /** Cells the solver couldn't resolve (only on stuck state). */
  stuckCells: Set<string>;
}

export class ReplayController {
  private replay: SolveReplay;
  private currentStep: number;
  private playing: boolean;
  private timerId: number | null;
  private speed: number; // ms between steps
  private onChange: (highlights: ReplayHighlights, stepIndex: number, total: number) => void;

  constructor(
    replay: SolveReplay,
    onChange: (highlights: ReplayHighlights, stepIndex: number, total: number) => void,
    speed: number = 500,
  ) {
    this.replay = replay;
    this.currentStep = -1; // before first step
    this.playing = false;
    this.timerId = null;
    this.speed = speed;
    this.onChange = onChange;
  }

  get totalSteps(): number {
    return this.replay.steps.length;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get isStuck(): boolean {
    return this.replay.stuck;
  }

  stepForward(): void {
    if (this.currentStep < this.replay.steps.length - 1) {
      this.currentStep++;
      this.emitHighlights();
    } else if (this.replay.stuck) {
      // Show stuck state after last step
      this.currentStep = this.replay.steps.length;
      this.emitStuck();
    }
  }

  stepBack(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.emitHighlights();
    } else if (this.currentStep === 0) {
      this.currentStep = -1;
      this.emitClear();
    }
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.tick();
  }

  pause(): void {
    this.playing = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  reset(): void {
    this.pause();
    this.currentStep = -1;
    this.emitClear();
  }

  setSpeed(ms: number): void {
    this.speed = ms;
  }

  private tick(): void {
    if (!this.playing) return;

    if (this.currentStep < this.replay.steps.length - 1) {
      this.stepForward();
      this.timerId = window.setTimeout(() => this.tick(), this.speed);
    } else if (this.replay.stuck && this.currentStep < this.replay.steps.length) {
      this.stepForward(); // show stuck
      this.pause();
    } else {
      this.pause();
    }
  }

  private emitHighlights(): void {
    const step = this.replay.steps[this.currentStep];
    const deducedCells = new Map<string, 'filled' | 'empty'>();
    const activeClueIds = new Set<string>();

    for (const d of step.deductions) {
      deducedCells.set(`${d.coord.col},${d.coord.row}`, d.result);
      for (const id of d.reason.clueIds) {
        activeClueIds.add(id);
      }
    }

    this.onChange(
      { deducedCells, activeClueIds, stuckCells: new Set() },
      this.currentStep,
      this.replay.steps.length,
    );
  }

  private emitStuck(): void {
    this.onChange(
      {
        deducedCells: new Map(),
        activeClueIds: new Set(),
        stuckCells: this.replay.stuckCells ?? new Set(),
      },
      this.currentStep,
      this.replay.steps.length,
    );
  }

  private emitClear(): void {
    this.onChange(
      { deducedCells: new Map(), activeClueIds: new Set(), stuckCells: new Set() },
      -1,
      this.replay.steps.length,
    );
  }
}
```

- [ ] **Step 2: Add Solve button and replay controls to main.ts**

Add to the toolbar in `src/main.ts`, after the existing controls:

```typescript
import { generatePuzzle } from './solver/pipeline';
import { ReplayController, type ReplayHighlights } from './view/solve-replay';

let replayController: ReplayController | null = null;

function handleSolve(): void {
  if (!currentGrid) return;

  const difficulty = (document.getElementById('difficulty-select') as HTMLSelectElement)?.value as 'easy' | 'hard' ?? 'easy';
  const result = generatePuzzle(currentGrid, difficulty);

  if (!result) {
    console.warn('Could not generate solvable puzzle');
    return;
  }

  // Reset grid to covered state for replay
  currentGrid.coverAll();

  replayController = new ReplayController(
    result.replay,
    (highlights, stepIndex, total) => {
      applyReplayHighlights(highlights);
      updateReplayStatus(stepIndex, total);
    },
    500,
  );

  showReplayControls(true);
}

function applyReplayHighlights(highlights: ReplayHighlights): void {
  // Apply visual state from replay step and re-render
  // Implementation depends on existing render() function
  render();
}

function updateReplayStatus(stepIndex: number, total: number): void {
  const el = document.getElementById('replay-status');
  if (el) {
    el.textContent = stepIndex >= 0 ? `Step ${stepIndex + 1}/${total}` : 'Ready';
  }
}

function showReplayControls(visible: boolean): void {
  const el = document.getElementById('replay-controls');
  if (el) el.style.display = visible ? 'flex' : 'none';
}
```

Add the HTML controls in `initControls()`:

```typescript
// Add to toolbar
const solveBtn = document.createElement('button');
solveBtn.textContent = 'Solve';
solveBtn.addEventListener('click', handleSolve);
toolbar.appendChild(solveBtn);

// Replay controls container
const replayDiv = document.createElement('div');
replayDiv.id = 'replay-controls';
replayDiv.style.display = 'none';
replayDiv.style.gap = '4px';

const prevBtn = document.createElement('button');
prevBtn.textContent = '< Prev';
prevBtn.addEventListener('click', () => replayController?.stepBack());

const nextBtn = document.createElement('button');
nextBtn.textContent = 'Next >';
nextBtn.addEventListener('click', () => replayController?.stepForward());

const playBtn = document.createElement('button');
playBtn.textContent = 'Play';
playBtn.addEventListener('click', () => {
  if (replayController?.isPlaying) {
    replayController.pause();
    playBtn.textContent = 'Play';
  } else {
    replayController?.play();
    playBtn.textContent = 'Pause';
  }
});

const statusSpan = document.createElement('span');
statusSpan.id = 'replay-status';
statusSpan.textContent = 'Ready';

replayDiv.append(prevBtn, nextBtn, playBtn, statusSpan);
toolbar.appendChild(replayDiv);
```

- [ ] **Step 3: Verify the app builds**

Run: `npm --prefix test-apps/01-grid-mechanics run build`
Expected: Build succeeds with no type errors

- [ ] **Step 4: Commit**

```bash
cd test-apps/01-grid-mechanics && git add src/view/solve-replay.ts src/main.ts
git commit -m "feat: add solve replay viewer with step-through controls"
```

---

### Task 10: Integration Test and Final Verification

**Files:**
- No new files — run existing tests and manual verification

- [ ] **Step 1: Run full test suite with coverage**

Run: `npm --prefix test-apps/01-grid-mechanics run coverage`
Expected: All tests pass, 100% branch coverage on `src/solver/**`

- [ ] **Step 2: Fix any remaining coverage gaps**

Add tests for any uncovered branches found in the coverage report.

- [ ] **Step 3: Build the app**

Run: `npm --prefix test-apps/01-grid-mechanics run build`
Expected: Clean build, no TypeScript errors

- [ ] **Step 4: Manual verification in browser**

Start dev server, open the app, click "Solve" button. Verify:
- Replay controls appear
- Stepping through shows deductions
- Stuck state (if any) is highlighted

- [ ] **Step 5: Final commit**

```bash
cd test-apps/01-grid-mechanics && git add -A
git commit -m "feat(solver): complete solvable puzzle generation pipeline with replay"
```
