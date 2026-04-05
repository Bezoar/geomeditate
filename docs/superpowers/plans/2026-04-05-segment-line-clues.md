# Segment-Based Line Clue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork 01-grid-mechanics as 04-game-mechanics and replace the flat LineClue model with a Segment + LineGroup two-tier model where segments are the primary game unit.

**Architecture:** Walk grid lines to produce LineGroups (physical paths with gaps), derive independent Segments from each group (edge + one per gap). Segments own their cell lists (gaps excluded) so contiguity is correct by construction. Guide lines render per-LineGroup with non-stacking opacity.

**Tech Stack:** TypeScript 5.x (strict mode), Vite 6.x, Vitest

---

### Task 1: Fork 01-grid-mechanics as 04-game-mechanics

**Files:**
- Create: `test-apps/04-game-mechanics/` (copy of `test-apps/01-grid-mechanics/`)
- Modify: `test-apps/04-game-mechanics/package.json`
- Modify: `test-apps/04-game-mechanics/index.html`

- [ ] **Step 1: Copy the directory**

```bash
cp -r test-apps/01-grid-mechanics test-apps/04-game-mechanics
```

- [ ] **Step 2: Update package.json name**

In `test-apps/04-game-mechanics/package.json`, change:
```json
"name": "01-grid-mechanics"
```
to:
```json
"name": "04-game-mechanics"
```

- [ ] **Step 3: Update index.html title**

In `test-apps/04-game-mechanics/index.html`, change:
```html
<title>Grid Mechanics Test App</title>
```
to:
```html
<title>Game Mechanics Test App</title>
```

- [ ] **Step 4: Install dependencies and verify tests pass**

```bash
cd test-apps/04-game-mechanics && npm install && npm test
```

Expected: all tests pass (same as 01-grid-mechanics).

- [ ] **Step 5: Commit**

```bash
git add test-apps/04-game-mechanics
git commit -m "Fork 01-grid-mechanics as 04-game-mechanics"
```

---

### Task 2: Rename LineAxis values

Rename `'ascending'` → `'left-facing'` and `'descending'` → `'right-facing'` across all source and test files.

**Files:**
- Modify: `test-apps/04-game-mechanics/src/model/hex-coord.ts`
- Modify: `test-apps/04-game-mechanics/src/clues/line.ts`
- Modify: `test-apps/04-game-mechanics/src/model/hex-grid.ts`
- Modify: `test-apps/04-game-mechanics/src/view/clue-renderer.ts`
- Modify: `test-apps/04-game-mechanics/src/view/line-clue-state.ts`
- Modify: `test-apps/04-game-mechanics/src/save/progress-mapper.ts`
- Modify: `test-apps/04-game-mechanics/src/save/puzzle-mapper.ts`
- Modify: `test-apps/04-game-mechanics/tests/line.test.ts`
- Modify: `test-apps/04-game-mechanics/tests/hex-grid.test.ts`
- Modify: `test-apps/04-game-mechanics/tests/hex-coord.test.ts`
- Modify: `test-apps/04-game-mechanics/tests/save-file.test.ts`
- Modify: `test-apps/04-game-mechanics/tests/puzzle-mapper.test.ts`
- Modify: `test-apps/04-game-mechanics/tests/progress-mapper.test.ts`

- [ ] **Step 1: Update hex-coord.ts type and stepInDirection**

In `test-apps/04-game-mechanics/src/model/hex-coord.ts`:

Change line 44:
```typescript
export type LineAxis = 'vertical' | 'left-facing' | 'right-facing';
```

Update `stepInDirection` (lines 52-65):
```typescript
export function stepInDirection(coord: HexCoord, axis: LineAxis): HexCoord {
  if (axis === 'vertical') {
    return { col: coord.col, row: coord.row + 1 };
  }
  const offsets = coord.col % 2 === 0 ? EVEN_COL_OFFSETS : ODD_COL_OFFSETS;
  if (axis === 'left-facing') {
    // Upper-right direction
    const [dc, dr] = offsets[0];
    return { col: coord.col + dc, row: coord.row + dr };
  }
  // right-facing: right direction
  const [dc, dr] = offsets[1];
  return { col: coord.col + dc, row: coord.row + dr };
}
```

Update JSDoc for `stepInDirection` (lines 46-51):
```typescript
/**
 * Step one cell in a given axis direction.
 * - vertical: same column, row + 1
 * - left-facing: upper-right neighbor (index 0 in offset table)
 * - right-facing: right neighbor (index 1 in offset table)
 */
```

- [ ] **Step 2: Update line.ts axis references**

In `test-apps/04-game-mechanics/src/clues/line.ts`:

Change line 44 (`predecessor` function):
```typescript
  if (axis === 'left-facing') {
```

Change line 131:
```typescript
const ALL_AXES: readonly LineAxis[] = ['vertical', 'left-facing', 'right-facing'];
```

- [ ] **Step 3: Update clue-renderer.ts axis references**

In `test-apps/04-game-mechanics/src/view/clue-renderer.ts`:

Update `lineClueOffset` (lines 64-71):
```typescript
    case 'left-facing':
      return { dx: colStep * 0.65, dy: -rowStep * 0.325, rotation: 60 };
    case 'right-facing':
      return { dx: -colStep * 0.65, dy: -rowStep * 0.325, rotation: -60 };
```

Update `clueHitTriangle` (lines 107-117):
```typescript
    case 'right-facing':
      // Label is upper-left → wedge points lower-right: center → v0 → v1
      i1 = 0; i2 = 1;
      break;
    case 'left-facing':
      // Label is upper-right → wedge points lower-left: center → v2 → v3
      i1 = 2; i2 = 3;
      break;
```

Update edge label anchor logic (lines 351-363), replace `'ascending'` with `'left-facing'`:
```typescript
    const anchorCoord =
      clue.axis === 'left-facing'
        ? clue.cells[clue.cells.length - 1]
        : clue.startCoord;
    ...
    const edgeCoord =
      clue.axis === 'left-facing'
        ? stepInDirection(clue.cells[clue.cells.length - 1], 'left-facing')
        : predecessor(clue.startCoord, clue.axis);
```

Update interior label logic (line 386):
```typescript
      if (clue.axis === 'left-facing') {
        const pred = predecessor(mp, 'left-facing');
```

- [ ] **Step 4: Update save/load axis abbreviations**

In `test-apps/04-game-mechanics/src/save/progress-mapper.ts`:

Update `toSaveLineKey` (line 29):
```typescript
  const abbrev = axis === 'vertical' ? 'v' : axis === 'left-facing' ? 'l' : 'r';
```

Update `toInternalLineKey` (line 38):
```typescript
  const axis = abbrev === 'v' ? 'vertical' : abbrev === 'l' ? 'left-facing' : 'right-facing';
```

In `test-apps/04-game-mechanics/src/save/puzzle-mapper.ts`:

Update `lineClueKey` (line 14) — the first character of `'left-facing'` is `'l'` and `'right-facing'` is `'r'`, so update to be explicit:
```typescript
function lineClueKey(clue: LineClue): string {
  const abbrev = clue.axis === 'vertical' ? 'v' : clue.axis === 'left-facing' ? 'l' : 'r';
  return `${abbrev}:${coordKey(clue.startCoord)}`;
}
```

- [ ] **Step 5: Update all test files**

Do a find-and-replace across all test files in `test-apps/04-game-mechanics/tests/`:
- Replace `'ascending'` with `'left-facing'`
- Replace `'descending'` with `'right-facing'`

This affects: `line.test.ts`, `hex-grid.test.ts`, `hex-coord.test.ts`, `save-file.test.ts`, `puzzle-mapper.test.ts`, `progress-mapper.test.ts`.

Also update saved JSON fixture strings in test files that contain `"a:"` (ascending abbreviation) — change to `"l:"` (left-facing). And `"d:"` to `"r:"`.

- [ ] **Step 6: Run tests**

```bash
cd test-apps/04-game-mechanics && npm test
```

Expected: all tests pass with renamed axis values.

- [ ] **Step 7: Commit**

```bash
git add test-apps/04-game-mechanics
git commit -m "Rename ascending/descending to left-facing/right-facing"
```

---

### Task 3: Define Segment and LineGroup types

Replace `LineClue` with `Segment` and `LineGroup` types, plus ID helper functions.

**Files:**
- Modify: `test-apps/04-game-mechanics/src/clues/line.ts`
- Test: `test-apps/04-game-mechanics/tests/line.test.ts`

- [ ] **Step 1: Write tests for ID functions**

Replace the top of `tests/line.test.ts` (keep `buildCellMap` helper and constants) and add new tests at the top of the describe block:

```typescript
import { describe, it, expect } from 'vitest';
import { coordKey, type HexCoord } from '../src/model/hex-coord';
import { CellGroundTruth, createCell, type HexCell } from '../src/model/hex-cell';
import {
  segmentId,
  lineGroupId,
  type Segment,
  type LineGroup,
} from '../src/clues/line';

// --- helpers ---

function buildCellMap(
  entries: Array<[number, number, CellGroundTruth]>,
): Map<string, HexCell> {
  const map = new Map<string, HexCell>();
  for (const [col, row, gt] of entries) {
    const coord: HexCoord = { col, row };
    map.set(coordKey(coord), createCell(coord, gt));
  }
  return map;
}

const F = CellGroundTruth.FILLED;
const E = CellGroundTruth.EMPTY;

describe('segmentId', () => {
  it('produces seg:<axis>:<col>,<row> format', () => {
    expect(segmentId('vertical', { col: 0, row: -1 })).toBe('seg:vertical:0,-1');
    expect(segmentId('left-facing', { col: 3, row: 2 })).toBe('seg:left-facing:3,2');
    expect(segmentId('right-facing', { col: 1, row: 0 })).toBe('seg:right-facing:1,0');
  });
});

describe('lineGroupId', () => {
  it('produces line:<axis>:<col>,<row> format', () => {
    expect(lineGroupId('vertical', { col: 2, row: 0 })).toBe('line:vertical:2,0');
    expect(lineGroupId('left-facing', { col: 0, row: 3 })).toBe('line:left-facing:0,3');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd test-apps/04-game-mechanics && npx vitest run tests/line.test.ts
```

Expected: FAIL — `segmentId` and `lineGroupId` not exported from `line.ts`.

- [ ] **Step 3: Define types and ID functions in line.ts**

Replace the `LineClue` interface and add new types at the top of `test-apps/04-game-mechanics/src/clues/line.ts` (after imports):

```typescript
import type { HexCoord, LineAxis } from '../model/hex-coord';
import { coordKey, stepInDirection } from '../model/hex-coord';
import { CellGroundTruth, ClueNotation, type HexCell } from '../model/hex-cell';

export interface Segment {
  id: string;
  lineGroupId: string;
  axis: LineAxis;
  cluePosition: HexCoord;
  cells: HexCoord[];
  value: number;
  notation: ClueNotation;
  isEdgeClue: boolean;
  contiguityEnabled: boolean;
}

export interface LineGroup {
  id: string;
  axis: LineAxis;
  allCells: HexCoord[];
  gapPositions: HexCoord[];
  segmentIds: string[];
  startCoord: HexCoord;
  endCoord: HexCoord;
}

export function segmentId(axis: LineAxis, cluePosition: HexCoord): string {
  return `seg:${axis}:${coordKey(cluePosition)}`;
}

export function lineGroupId(axis: LineAxis, startCoord: HexCoord): string {
  return `line:${axis}:${coordKey(startCoord)}`;
}
```

Keep the old `LineClue` interface and all existing functions for now — they'll be removed once replaced.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd test-apps/04-game-mechanics && npx vitest run tests/line.test.ts
```

Expected: ID tests pass. Old tests still pass (old code not removed yet).

- [ ] **Step 5: Commit**

```bash
git add test-apps/04-game-mechanics/src/clues/line.ts test-apps/04-game-mechanics/tests/line.test.ts
git commit -m "Define Segment and LineGroup types with ID functions"
```

---

### Task 4: Implement segment computation pipeline

Core TDD task: implement `computeAllSegmentsAndGroups` which walks lines, builds LineGroups, and derives Segments.

**Files:**
- Modify: `test-apps/04-game-mechanics/src/clues/line.ts`
- Modify: `test-apps/04-game-mechanics/tests/line.test.ts`

- [ ] **Step 1: Write tests for segment computation**

Append to `tests/line.test.ts`:

```typescript
import {
  segmentId,
  lineGroupId,
  computeAllSegmentsAndGroups,
  type Segment,
  type LineGroup,
} from '../src/clues/line';

// (keep existing helper and constants)

describe('computeAllSegmentsAndGroups', () => {
  describe('simple vertical column (no gaps)', () => {
    it('produces one LineGroup and one edge Segment per axis for a column', () => {
      const cellMap = buildCellMap([
        [2, 0, F],
        [2, 1, E],
        [2, 2, F],
      ]);
      const { segments, lineGroups } = computeAllSegmentsAndGroups(cellMap);

      // Find vertical line group for column 2
      const vGroup = [...lineGroups.values()].find(
        g => g.axis === 'vertical' && coordKey(g.startCoord) === '2,0',
      )!;
      expect(vGroup).toBeDefined();
      expect(vGroup.allCells.map(coordKey)).toEqual(['2,0', '2,1', '2,2']);
      expect(vGroup.gapPositions).toEqual([]);
      expect(vGroup.segmentIds).toHaveLength(1); // edge only, no gaps

      // Edge segment covers full line
      const edgeSeg = segments.get(vGroup.segmentIds[0])!;
      expect(edgeSeg.isEdgeClue).toBe(true);
      expect(edgeSeg.cells.map(coordKey)).toEqual(['2,0', '2,1', '2,2']);
      expect(edgeSeg.value).toBe(2);
      expect(edgeSeg.cluePosition).toEqual({ col: 2, row: -1 });
    });
  });

  describe('vertical column with gap', () => {
    it('produces edge segment + gap segment', () => {
      // Col 0: rows 0,1 exist, gap at 2, row 3 exists
      const cellMap = buildCellMap([
        [0, 0, F],
        [0, 1, F],
        // gap at (0,2)
        [0, 3, F],
      ]);
      const { segments, lineGroups } = computeAllSegmentsAndGroups(cellMap);

      const vGroup = [...lineGroups.values()].find(
        g => g.axis === 'vertical' && coordKey(g.startCoord) === '0,0',
      )!;
      expect(vGroup.allCells.map(coordKey)).toEqual(['0,0', '0,1', '0,3']);
      expect(vGroup.gapPositions.map(coordKey)).toEqual(['0,2']);
      expect(vGroup.segmentIds).toHaveLength(2);

      // Edge segment: covers full line (all 3 cells)
      const edgeSeg = segments.get(vGroup.segmentIds[0])!;
      expect(edgeSeg.isEdgeClue).toBe(true);
      expect(edgeSeg.cells.map(coordKey)).toEqual(['0,0', '0,1', '0,3']);
      expect(edgeSeg.value).toBe(3);
      expect(edgeSeg.cluePosition).toEqual({ col: 0, row: -1 });

      // Gap segment: covers cells after gap (0,3 only)
      const gapSeg = segments.get(vGroup.segmentIds[1])!;
      expect(gapSeg.isEdgeClue).toBe(false);
      expect(gapSeg.cells.map(coordKey)).toEqual(['0,3']);
      expect(gapSeg.value).toBe(1);
      expect(gapSeg.cluePosition).toEqual({ col: 0, row: 2 });
    });
  });

  describe('contiguity ignores gaps', () => {
    it('filled cells on both sides of a gap are contiguous in edge segment', () => {
      // Col 0: rows 0-4 exist, gap at 2, filled at 1,3
      const cellMap = buildCellMap([
        [0, 0, E],
        [0, 1, F],
        // gap at (0,2)
        [0, 3, F],
        [0, 4, E],
      ]);
      const { segments, lineGroups } = computeAllSegmentsAndGroups(cellMap);

      const vGroup = [...lineGroups.values()].find(
        g => g.axis === 'vertical' && coordKey(g.startCoord) === '0,0',
      )!;

      const edgeSeg = segments.get(vGroup.segmentIds[0])!;
      // cells = [0,0], [0,1], [0,3], [0,4] (gap at 0,2 excluded)
      // filled at indices 1 and 2 (0,1 and 0,3) — consecutive → CONTIGUOUS
      expect(edgeSeg.value).toBe(2);
      expect(edgeSeg.notation).toBe(ClueNotation.CONTIGUOUS);
    });
  });

  describe('discontiguous filled cells (no gap involved)', () => {
    it('empty cell between filled cells causes DISCONTIGUOUS', () => {
      const cellMap = buildCellMap([
        [0, 0, F],
        [0, 1, E],
        [0, 2, F],
      ]);
      const { segments } = computeAllSegmentsAndGroups(cellMap);

      const edgeSeg = [...segments.values()].find(
        s => s.axis === 'vertical' && s.isEdgeClue && s.cells.map(coordKey).includes('0,0'),
      )!;
      expect(edgeSeg.value).toBe(2);
      expect(edgeSeg.notation).toBe(ClueNotation.DISCONTIGUOUS);
    });
  });

  describe('multiple gaps', () => {
    it('produces one edge segment + one gap segment per gap', () => {
      // Col 0: rows 0,1, gap at 2, row 3, gap at 4, rows 5,6
      const cellMap = buildCellMap([
        [0, 0, F],
        [0, 1, F],
        // gap at (0,2)
        [0, 3, F],
        // gap at (0,4)
        [0, 5, F],
        [0, 6, F],
      ]);
      const { segments, lineGroups } = computeAllSegmentsAndGroups(cellMap);

      const vGroup = [...lineGroups.values()].find(
        g => g.axis === 'vertical' && coordKey(g.startCoord) === '0,0',
      )!;
      expect(vGroup.gapPositions.map(coordKey)).toEqual(['0,2', '0,4']);
      expect(vGroup.segmentIds).toHaveLength(3); // edge + 2 gaps

      // Edge: all 5 cells
      const edge = segments.get(vGroup.segmentIds[0])!;
      expect(edge.cells).toHaveLength(5);
      expect(edge.value).toBe(5);

      // Gap at (0,2): covers 0,3 + 0,5 + 0,6
      const gap1 = segments.get(vGroup.segmentIds[1])!;
      expect(gap1.cluePosition).toEqual({ col: 0, row: 2 });
      expect(gap1.cells.map(coordKey)).toEqual(['0,3', '0,5', '0,6']);
      expect(gap1.value).toBe(3);

      // Gap at (0,4): covers 0,5 + 0,6
      const gap2 = segments.get(vGroup.segmentIds[2])!;
      expect(gap2.cluePosition).toEqual({ col: 0, row: 4 });
      expect(gap2.cells.map(coordKey)).toEqual(['0,5', '0,6']);
      expect(gap2.value).toBe(2);
    });
  });

  describe('diagonal segments', () => {
    it('produces segments for left-facing diagonal', () => {
      // Left-facing (ascending): (0,1) → (1,0) → (2,0)
      const cellMap = buildCellMap([
        [0, 1, F],
        [1, 0, E],
        [2, 0, F],
      ]);
      const { segments, lineGroups } = computeAllSegmentsAndGroups(cellMap);

      const lfGroup = [...lineGroups.values()].find(
        g => g.axis === 'left-facing' && coordKey(g.startCoord) === '0,1',
      )!;
      expect(lfGroup).toBeDefined();
      expect(lfGroup.allCells.map(coordKey)).toEqual(['0,1', '1,0', '2,0']);
    });

    it('produces segments for right-facing diagonal', () => {
      // Right-facing (descending): (0,0) → (1,0) → (2,1)
      const cellMap = buildCellMap([
        [0, 0, F],
        [1, 0, E],
        [2, 1, F],
      ]);
      const { segments, lineGroups } = computeAllSegmentsAndGroups(cellMap);

      const rfGroup = [...lineGroups.values()].find(
        g => g.axis === 'right-facing' && coordKey(g.startCoord) === '0,0',
      )!;
      expect(rfGroup).toBeDefined();
      expect(rfGroup.allCells.map(coordKey)).toEqual(['0,0', '1,0', '2,1']);
    });
  });

  describe('single-cell line', () => {
    it('produces 3 segments for an isolated cell (one per axis)', () => {
      const cellMap = buildCellMap([[5, 5, F]]);
      const { segments } = computeAllSegmentsAndGroups(cellMap);

      const segs = [...segments.values()].filter(
        s => s.cells.map(coordKey).includes('5,5'),
      );
      const axes = new Set(segs.map(s => s.axis));
      expect(axes).toEqual(new Set(['vertical', 'left-facing', 'right-facing']));
      for (const seg of segs) {
        expect(seg.cells).toHaveLength(1);
        expect(seg.value).toBe(1);
        expect(seg.isEdgeClue).toBe(true);
      }
    });
  });

  describe('empty cellMap', () => {
    it('returns empty maps', () => {
      const { segments, lineGroups } = computeAllSegmentsAndGroups(new Map());
      expect(segments.size).toBe(0);
      expect(lineGroups.size).toBe(0);
    });
  });

  describe('segment IDs are unique', () => {
    it('all segment IDs are unique across a multi-cell grid', () => {
      const cellMap = buildCellMap([
        [0, 0, F], [1, 0, E], [2, 0, F],
        [0, 1, E], [1, 1, F], [2, 1, E],
      ]);
      const { segments } = computeAllSegmentsAndGroups(cellMap);
      const ids = [...segments.keys()];
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd test-apps/04-game-mechanics && npx vitest run tests/line.test.ts
```

Expected: FAIL — `computeAllSegmentsAndGroups` not exported.

- [ ] **Step 3: Implement computeAllSegmentsAndGroups**

In `test-apps/04-game-mechanics/src/clues/line.ts`, add after the existing ID functions and before the old `LineClue` code:

```typescript
function computeSegmentContiguity(filledFlags: boolean[], count: number): ClueNotation {
  if (count <= 1) return ClueNotation.PLAIN;
  let runs = 0;
  let inRun = false;
  for (const filled of filledFlags) {
    if (filled && !inRun) { runs++; inRun = true; }
    else if (!filled) { inRun = false; }
  }
  return runs === 1 ? ClueNotation.CONTIGUOUS : ClueNotation.DISCONTIGUOUS;
}

function computeSegmentValue(
  cells: HexCoord[],
  cellMap: Map<string, HexCell>,
): { value: number; notation: ClueNotation } {
  const filledFlags = cells.map(c => {
    const cell = cellMap.get(coordKey(c));
    return cell !== undefined && cell.groundTruth === CellGroundTruth.FILLED;
  });
  const value = filledFlags.filter(Boolean).length;
  const notation = computeSegmentContiguity(filledFlags, value);
  return { value, notation };
}

interface GridBounds {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

function computeBounds(cellMap: Map<string, HexCell>): GridBounds {
  let minCol = Infinity, maxCol = -Infinity;
  let minRow = Infinity, maxRow = -Infinity;
  for (const cell of cellMap.values()) {
    minCol = Math.min(minCol, cell.coord.col);
    maxCol = Math.max(maxCol, cell.coord.col);
    minRow = Math.min(minRow, cell.coord.row);
    maxRow = Math.max(maxRow, cell.coord.row);
  }
  return { minCol, maxCol, minRow, maxRow };
}

function isWithinBounds(coord: HexCoord, bounds: GridBounds): boolean {
  return coord.col >= bounds.minCol && coord.col <= bounds.maxCol &&
         coord.row >= bounds.minRow && coord.row <= bounds.maxRow;
}

function isDiagonalStart(
  coord: HexCoord,
  axis: LineAxis,
  cellMap: Map<string, HexCell>,
  bounds: GridBounds,
): boolean {
  let pred = predecessor(coord, axis);
  while (isWithinBounds(pred, bounds)) {
    if (cellMap.has(coordKey(pred))) return false;
    pred = predecessor(pred, axis);
  }
  return true;
}

const ALL_AXES: readonly LineAxis[] = ['vertical', 'left-facing', 'right-facing'];

export function computeAllSegmentsAndGroups(
  cellMap: Map<string, HexCell>,
): { segments: Map<string, Segment>; lineGroups: Map<string, LineGroup> } {
  const segments = new Map<string, Segment>();
  const lineGroups = new Map<string, LineGroup>();

  if (cellMap.size === 0) return { segments, lineGroups };

  const bounds = computeBounds(cellMap);

  for (const cell of cellMap.values()) {
    for (const axis of ALL_AXES) {
      if (!isDiagonalStart(cell.coord, axis, cellMap, bounds)) continue;

      // Walk the line, collecting cells and gaps
      const allCells: HexCoord[] = [];
      const gapPositions: HexCoord[] = [];
      let current = cell.coord;
      while (isWithinBounds(current, bounds)) {
        if (cellMap.has(coordKey(current))) {
          allCells.push(current);
        } else {
          gapPositions.push(current);
        }
        current = stepInDirection(current, axis);
      }

      if (allCells.length === 0) continue;

      // Build LineGroup
      const groupId = lineGroupId(axis, allCells[0]);
      const segIds: string[] = [];

      // Edge segment: covers all cells, clue at predecessor of first cell
      const edgeCluePos = predecessor(allCells[0], axis);
      const edgeSegId = segmentId(axis, edgeCluePos);
      const edgeValue = computeSegmentValue(allCells, cellMap);
      segments.set(edgeSegId, {
        id: edgeSegId,
        lineGroupId: groupId,
        axis,
        cluePosition: edgeCluePos,
        cells: allCells,
        value: edgeValue.value,
        notation: edgeValue.notation,
        isEdgeClue: true,
        contiguityEnabled: true,
      });
      segIds.push(edgeSegId);

      // Gap segments: one per gap, covering cells after the gap
      for (const gap of gapPositions) {
        // Find the first cell in allCells that comes after this gap in traversal order
        // We determine "after" by walking from the gap forward and finding the next cell
        let nextAfterGap: HexCoord | null = null;
        let walker = stepInDirection(gap, axis);
        while (isWithinBounds(walker, bounds)) {
          if (cellMap.has(coordKey(walker))) {
            nextAfterGap = walker;
            break;
          }
          walker = stepInDirection(walker, axis);
        }
        if (!nextAfterGap) continue; // gap is at the end of the line, no segment

        // Suffix of allCells starting from nextAfterGap
        const nextIdx = allCells.findIndex(c => coordKey(c) === coordKey(nextAfterGap!));
        if (nextIdx === -1) continue;

        const gapCells = allCells.slice(nextIdx);
        const gapSegId = segmentId(axis, gap);
        const gapValue = computeSegmentValue(gapCells, cellMap);
        segments.set(gapSegId, {
          id: gapSegId,
          lineGroupId: groupId,
          axis,
          cluePosition: gap,
          cells: gapCells,
          value: gapValue.value,
          notation: gapValue.notation,
          isEdgeClue: false,
          contiguityEnabled: true,
        });
        segIds.push(gapSegId);
      }

      lineGroups.set(groupId, {
        id: groupId,
        axis,
        allCells,
        gapPositions,
        segmentIds: segIds,
        startCoord: allCells[0],
        endCoord: allCells[allCells.length - 1],
      });
    }
  }

  return { segments, lineGroups };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd test-apps/04-game-mechanics && npx vitest run tests/line.test.ts
```

Expected: all new segment tests pass. Old LineClue tests still pass.

- [ ] **Step 5: Commit**

```bash
git add test-apps/04-game-mechanics/src/clues/line.ts test-apps/04-game-mechanics/tests/line.test.ts
git commit -m "Implement segment computation pipeline with TDD"
```

---

### Task 5: Update HexGrid to use segments

Replace `lineClues: LineClue[]` with `segments: Map<string, Segment>` and `lineGroups: Map<string, LineGroup>`.

**Files:**
- Modify: `test-apps/04-game-mechanics/src/model/hex-grid.ts`
- Modify: `test-apps/04-game-mechanics/tests/hex-grid.test.ts`

- [ ] **Step 1: Update hex-grid.ts**

In `test-apps/04-game-mechanics/src/model/hex-grid.ts`:

Update imports (line 16-18):
```typescript
import { computeAllSegmentsAndGroups, type Segment, type LineGroup } from '../clues/line';

export type { Segment, LineGroup };
```

Remove the old `LineClue` re-export.

Update `HexGrid` class properties (lines 33-34):
```typescript
  segments: Map<string, Segment>;
  lineGroups: Map<string, LineGroup>;
```

Update constructor (line 40):
```typescript
    this.segments = new Map();
    this.lineGroups = new Map();
```

Update `recomputeCluesAround` — use full segment recomputation (handles both value changes and structural changes like toggleMissing):
```typescript
  private recomputeCluesAround(coord: HexCoord): void {
    this.recomputeCellClue(coord);
    for (const n of neighbors(coord)) {
      this.recomputeCellClue(n);
    }
    for (const r2 of radius2Positions(coord)) {
      const r2Key = coordKey(r2);
      const r2Cell = this.cells.get(r2Key);
      if (r2Cell && r2Cell.groundTruth === CellGroundTruth.FILLED) {
        const flowerValue = computeFlowerClue(r2, this.cells);
        this.cells.set(r2Key, { ...r2Cell, flowerClueValue: flowerValue });
      }
    }
    // Full recompute of segments (structural changes like toggleMissing change line shape)
    const result = computeAllSegmentsAndGroups(this.cells);
    this.segments = result.segments;
    this.lineGroups = result.lineGroups;
  }
```

Update `computeAllClues` (line 241):
```typescript
    const result = computeAllSegmentsAndGroups(this.cells);
    this.segments = result.segments;
    this.lineGroups = result.lineGroups;
```

Add an import for `ClueNotation` if not already imported:
```typescript
import { CellGroundTruth, CellVisualState, ClueNotation, type HexCell, ... } from './hex-cell';
```

- [ ] **Step 2: Update hex-grid.test.ts**

Replace all references to `grid.lineClues` with segment-based equivalents. The key changes:

Replace `LineClue` import with `Segment`:
```typescript
import { HexGrid, type Segment, type TestGridConfig } from '../src/model/hex-grid';
```

Replace `lineClues` array tests with segment Map tests:

```typescript
  it('populates segments map', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    expect(grid.segments.size).toBeGreaterThan(0);
  });

  it('segments cover all three axes', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    const axes = new Set([...grid.segments.values()].map((s: Segment) => s.axis));
    expect(axes.has('vertical')).toBe(true);
    expect(axes.has('left-facing')).toBe(true);
    expect(axes.has('right-facing')).toBe(true);
  });

  it('vertical segments count FILLED cells correctly', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    const verticalSegs = [...grid.segments.values()].filter(
      (s: Segment) => s.axis === 'vertical' && s.isEdgeClue,
    );
    for (const seg of verticalSegs) {
      expect(seg.value).toBe(1);
    }
  });

  it('segment cells array contains coords along the line', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    for (const seg of grid.segments.values()) {
      expect(seg.cells.length).toBeGreaterThan(0);
      for (const c of seg.cells) {
        expect(grid.cells.has(coordKey(c))).toBe(true);
      }
    }
  });

  it('segment value equals actual FILLED count along segment cells', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    for (const seg of grid.segments.values()) {
      const actualFilled = seg.cells.filter(
        (c: HexCoord) => grid.cells.get(coordKey(c))!.groundTruth === CellGroundTruth.FILLED,
      ).length;
      expect(seg.value).toBe(actualFilled);
    }
  });
```

Similarly update the all-empty grid tests and the `toggleGroundTruth` recomputation tests that reference `lineClues`.

- [ ] **Step 3: Run tests**

```bash
cd test-apps/04-game-mechanics && npm test
```

Expected: all tests pass. (Save-file and puzzle-mapper tests may still reference old types — they'll be updated in Task 7.)

- [ ] **Step 4: Commit**

```bash
git add test-apps/04-game-mechanics/src/model/hex-grid.ts test-apps/04-game-mechanics/tests/hex-grid.test.ts
git commit -m "Update HexGrid to use segments and lineGroups"
```

---

### Task 6: Rename line-clue-state to segment-state

**Files:**
- Delete: `test-apps/04-game-mechanics/src/view/line-clue-state.ts`
- Create: `test-apps/04-game-mechanics/src/view/segment-state.ts`

- [ ] **Step 1: Create segment-state.ts**

Create `test-apps/04-game-mechanics/src/view/segment-state.ts`:

```typescript
import type { Segment } from '../clues/line';

export type SegmentVisibility = 'invisible' | 'visible' | 'visible-with-line' | 'dimmed';

export interface SegmentState {
  visibility: SegmentVisibility;
  savedVisibility: 'visible' | 'visible-with-line' | 'dimmed';
  activated: boolean;
}

export function defaultState(): SegmentState {
  return { visibility: 'visible', savedVisibility: 'visible', activated: true };
}

export function getState(
  states: Map<string, SegmentState>,
  segment: Segment,
): SegmentState {
  const existing = states.get(segment.id);
  if (existing) return existing;
  return defaultState();
}

export function toggleGuideLine(state: SegmentState): SegmentState {
  if (state.visibility === 'dimmed' || state.visibility === 'invisible') {
    return state;
  }
  const newVis: SegmentVisibility =
    state.visibility === 'visible' ? 'visible-with-line' : 'visible';
  return { ...state, visibility: newVis, savedVisibility: newVis };
}

export function toggleDimmed(state: SegmentState): SegmentState {
  if (state.visibility === 'invisible') return state;
  if (state.visibility === 'dimmed') {
    return { ...state, visibility: state.savedVisibility };
  }
  return { ...state, visibility: 'dimmed', savedVisibility: state.visibility as 'visible' | 'visible-with-line' };
}

export function toggleInvisible(state: SegmentState): SegmentState {
  if (state.visibility === 'invisible') {
    return { ...state, visibility: state.savedVisibility };
  }
  const saved: 'visible' | 'visible-with-line' | 'dimmed' =
    state.visibility === 'invisible' ? state.savedVisibility : state.visibility;
  return { ...state, visibility: 'invisible', savedVisibility: saved };
}
```

- [ ] **Step 2: Delete old line-clue-state.ts**

```bash
rm test-apps/04-game-mechanics/src/view/line-clue-state.ts
```

- [ ] **Step 3: Update all imports from line-clue-state to segment-state**

Files to update:
- `src/view/clue-renderer.ts`: change import path and type names
- `src/save/progress-mapper.ts`: change import path and type names
- `src/save/save-file.ts`: change import path and type names
- `src/main.ts`: change import path and type names

In each file, replace:
```typescript
import { type LineClueState, ... } from './line-clue-state';
```
with:
```typescript
import { type SegmentState, ... } from './segment-state';
```

And rename `LineClueState` → `SegmentState` in all type annotations.

- [ ] **Step 4: Run tests**

```bash
cd test-apps/04-game-mechanics && npm test
```

Expected: all tests pass (or type errors that need fixing in save/view files — fix any remaining `LineClueState` references).

- [ ] **Step 5: Commit**

```bash
git add -A test-apps/04-game-mechanics
git commit -m "Rename line-clue-state to segment-state with activation"
```

---

### Task 7: Update save/load serialization

Update the persistence layer to use segment IDs and SegmentState.

**Files:**
- Modify: `test-apps/04-game-mechanics/src/save/types.ts`
- Modify: `test-apps/04-game-mechanics/src/save/puzzle-mapper.ts`
- Modify: `test-apps/04-game-mechanics/src/save/progress-mapper.ts`
- Modify: `test-apps/04-game-mechanics/src/save/save-file.ts`
- Modify: `test-apps/04-game-mechanics/tests/puzzle-mapper.test.ts`
- Modify: `test-apps/04-game-mechanics/tests/progress-mapper.test.ts`
- Modify: `test-apps/04-game-mechanics/tests/save-file.test.ts`

- [ ] **Step 1: Update save types**

In `types.ts`, `LineClueDef` and `ProgressLineClueDef` stay as-is (the save format uses abbreviated keys, same structure). No changes needed to the types themselves.

- [ ] **Step 2: Update puzzle-mapper.ts**

Replace `LineClue` references with `Segment`:

```typescript
import type { PuzzleDef, CluesDef, NeighborClueDef, LineClueDef } from './types';
import type { HexGrid } from '../model/hex-grid';
import type { Segment } from '../clues/line';
import { CellGroundTruth, type HexCell } from '../model/hex-cell';
import { coordKey, parseCoordKey } from '../model/hex-coord';
import { encodeGridString, decodeGridString } from './grid-string';
import { HexGrid as HexGridClass } from '../model/hex-grid';

function groundTruthChar(cell: HexCell): string {
  return cell.groundTruth === CellGroundTruth.FILLED ? 'F' : 'E';
}

function segmentSaveKey(seg: Segment): string {
  const abbrev = seg.axis === 'vertical' ? 'v' : seg.axis === 'left-facing' ? 'l' : 'r';
  return `${abbrev}:${coordKey(seg.cluePosition)}`;
}
```

Update `serializePuzzle` to iterate `grid.segments`:
```typescript
  const lineOverrides: Record<string, LineClueDef> = {};
  for (const seg of grid.segments.values()) {
    if (!seg.contiguityEnabled) {
      lineOverrides[segmentSaveKey(seg)] = { contiguity: false };
    }
  }
```

Update `deserializePuzzle` to restore contiguity on segments:
```typescript
  if (puzzle.clues?.lines) {
    for (const [key, def] of Object.entries(puzzle.clues.lines)) {
      if (def.contiguity === false) {
        for (const [id, seg] of grid.segments) {
          if (segmentSaveKey(seg) === key) {
            grid.segments.set(id, { ...seg, contiguityEnabled: false });
          }
        }
      }
    }
  }
```

- [ ] **Step 3: Update progress-mapper.ts**

Update imports:
```typescript
import type { SegmentState } from '../view/segment-state';
```

Update `toSaveLineKey` and `toInternalLineKey` to handle segment ID format:
```typescript
/** Convert segment ID "seg:axis:col,row" to save format "l:col,row". */
function toSaveSegmentKey(segId: string): string {
  // segId format: "seg:<axis>:<col>,<row>"
  const parts = segId.split(':');
  const axis = parts[1];
  const coord = parts[2];
  const abbrev = axis === 'vertical' ? 'v' : axis === 'left-facing' ? 'l' : 'r';
  return `${abbrev}:${coord}`;
}

/** Convert save format "l:col,row" to segment ID "seg:left-facing:col,row". */
function toSegmentId(saveKey: string): string {
  const colonIdx = saveKey.indexOf(':');
  const abbrev = saveKey.substring(0, colonIdx);
  const coord = saveKey.substring(colonIdx + 1);
  const axis = abbrev === 'v' ? 'vertical' : abbrev === 'l' ? 'left-facing' : 'right-facing';
  return `seg:${axis}:${coord}`;
}
```

Update `serializeProgress` signature and body:
```typescript
export function serializeProgress(
  grid: HexGrid,
  segmentStates: Map<string, SegmentState>,
  hiddenFlowerClues: Set<string>,
  dimmedFlowerClues: Set<string>,
  flowerGuideClues: Set<string>,
): ProgressState {
  // ... cell encoding unchanged ...

  // Collect segment state overrides
  const lineOverrides: Record<string, ProgressLineClueDef> = {};
  for (const [segId, state] of segmentStates) {
    if (state.visibility !== 'visible') {
      lineOverrides[toSaveSegmentKey(segId)] = { visibility: state.visibility };
    }
  }

  // ... rest unchanged ...
}
```

Update `DeserializedProgress` and `deserializeProgress`:
```typescript
export interface DeserializedProgress {
  segmentStates: Map<string, SegmentState>;
  hiddenFlowerClues: Set<string>;
  dimmedFlowerClues: Set<string>;
  flowerGuideClues: Set<string>;
}

export function deserializeProgress(
  progress: ProgressState,
  grid: HexGrid,
): DeserializedProgress {
  // ... cell state restoration unchanged ...

  const segmentStates = new Map<string, SegmentState>();
  if (progress.clues?.lines) {
    for (const [saveKey, def] of Object.entries(progress.clues.lines)) {
      const segId = toSegmentId(saveKey);
      if (def.visibility) {
        segmentStates.set(segId, {
          visibility: def.visibility,
          savedVisibility: def.visibility === 'invisible' ? 'visible' : def.visibility,
          activated: true,
        });
      }
    }
  }

  return { segmentStates, hiddenFlowerClues, dimmedFlowerClues, flowerGuideClues };
}
```

- [ ] **Step 4: Update save-file.ts**

Update types:
```typescript
import type { SegmentState } from '../view/segment-state';

export interface SaveFileInput {
  grid: HexGrid;
  name: string;
  description: string;
  segmentStates: Map<string, SegmentState>;
  hiddenFlowerClues: Set<string>;
  dimmedFlowerClues: Set<string>;
  flowerGuideClues: Set<string>;
  history: ActionHistory;
}

export interface SaveFileOutput extends DeserializedProgress {
  grid: HexGrid;
  name: string;
  description: string;
  history: ActionHistory;
}
```

Update `serializeSaveFile`:
```typescript
  const progress = serializeProgress(
    input.grid,
    input.segmentStates,
    input.hiddenFlowerClues,
    input.dimmedFlowerClues,
    input.flowerGuideClues,
  );
```

Update `deserializeSaveFile` default:
```typescript
  let progressResult: DeserializedProgress = {
    segmentStates: new Map(),
    hiddenFlowerClues: new Set(),
    dimmedFlowerClues: new Set(),
    flowerGuideClues: new Set(),
  };
```

- [ ] **Step 5: Update test files**

Update `tests/puzzle-mapper.test.ts`, `tests/progress-mapper.test.ts`, and `tests/save-file.test.ts` to use `segmentStates` instead of `lineClueStates`, `SegmentState` instead of `LineClueState`, and the new save key format (`l:` for left-facing, `r:` for right-facing).

Replace all `lineClueStates` with `segmentStates` in test code and assertions.
Replace `LineClueState` type references with `SegmentState`.
Update any serialized JSON fixture strings to use new key abbreviations.

- [ ] **Step 6: Run tests**

```bash
cd test-apps/04-game-mechanics && npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add test-apps/04-game-mechanics
git commit -m "Update save/load serialization for segment model"
```

---

### Task 8: Update clue-renderer to use segments

Replace LineClue-based rendering with Segment + LineGroup rendering.

**Files:**
- Modify: `test-apps/04-game-mechanics/src/view/clue-renderer.ts`

- [ ] **Step 1: Update imports**

```typescript
import type { HexGrid } from '../model/hex-grid';
import type { Segment, LineGroup } from '../clues/line';
import { CellGroundTruth, CellVisualState, ClueNotation } from '../model/hex-cell';
import { coordKey, toPixel, stepInDirection, neighbors, radius2Positions } from '../model/hex-coord';
import type { HexCoord, LineAxis } from '../model/hex-coord';
import { formatNeighborClue } from '../clues/neighbor';
import {
  type SegmentState,
  getState,
  toggleGuideLine,
  toggleDimmed,
  toggleInvisible,
} from './segment-state';
```

- [ ] **Step 2: Remove computePartialContiguity**

Delete the `computePartialContiguity` function (lines 17-26). It's no longer needed — gap segments have precomputed values.

- [ ] **Step 3: Update lineClueOffset to handle new axis names**

```typescript
function lineClueOffset(axis: LineAxis): { dx: number; dy: number; rotation: number } {
  const rowStep = RADIUS * Math.sqrt(3);
  const colStep = RADIUS * 1.5;

  switch (axis) {
    case 'vertical':
      return { dx: 0, dy: -rowStep * 0.65, rotation: 0 };
    case 'left-facing':
      return { dx: colStep * 0.65, dy: -rowStep * 0.325, rotation: 60 };
    case 'right-facing':
      return { dx: -colStep * 0.65, dy: -rowStep * 0.325, rotation: -60 };
  }
}
```

- [ ] **Step 4: Update renderGuideLine to use LineGroup**

```typescript
function renderGuideLine(
  lineGroup: LineGroup,
  svgContainer: SVGElement,
): void {
  if (lineGroup.allCells.length === 0) return;

  const first = toPixel(lineGroup.startCoord, RADIUS);
  const last = toPixel(lineGroup.endCoord, RADIUS);
  const apothem = RADIUS * Math.sqrt(3) / 2;

  let x1: number, y1: number, x2: number, y2: number;

  if (lineGroup.allCells.length === 1) {
    const nextCoord = stepInDirection(lineGroup.allCells[0], lineGroup.axis);
    const next = toPixel(nextCoord, RADIUS);
    const ddx = next.x - first.x;
    const ddy = next.y - first.y;
    const dlen = Math.sqrt(ddx * ddx + ddy * ddy);
    const dux = ddx / dlen;
    const duy = ddy / dlen;
    x1 = first.x - dux * apothem;
    y1 = first.y - duy * apothem;
    x2 = first.x + dux * apothem;
    y2 = first.y + duy * apothem;
  } else {
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len;
    const uy = dy / len;
    x1 = first.x - ux * apothem;
    y1 = first.y - uy * apothem;
    x2 = last.x + ux * apothem;
    y2 = last.y + uy * apothem;
  }

  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', String(x1));
  line.setAttribute('y1', String(y1));
  line.setAttribute('x2', String(x2));
  line.setAttribute('y2', String(y2));
  line.setAttribute('stroke', '#ffffff');
  line.setAttribute('stroke-opacity', '0.3');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-linecap', 'round');
  svgContainer.appendChild(line);
}
```

- [ ] **Step 5: Update SegmentInteraction type**

```typescript
export interface SegmentInteraction {
  (segmentId: string, newState: SegmentState): void;
}

export interface ClueRenderOptions {
  showHitAreaOutlines: boolean;
  selectionEnabled: boolean;
}
```

- [ ] **Step 6: Rewrite the line clue rendering section of renderClues**

Replace the entire `// Render line clues with display state` block (lines 334-438) with segment-based rendering:

```typescript
  // Render guide lines per LineGroup (non-stacking: one line per group)
  const renderedGuideGroups = new Set<string>();
  for (const seg of grid.segments.values()) {
    const state = getState(segmentStates, seg);
    if (!state.activated) continue;
    if (state.visibility === 'visible-with-line' && !renderedGuideGroups.has(seg.lineGroupId)) {
      renderedGuideGroups.add(seg.lineGroupId);
      const group = grid.lineGroups.get(seg.lineGroupId);
      if (group) renderGuideLine(group, svgContainer);
    }
  }

  // Render segment labels and hit areas
  const renderedLabelPositions: Array<{ x: number; y: number }> = [];
  const LABEL_MIN_DIST = RADIUS * 0.6;

  // Sort: edge clues first (higher priority for collision avoidance)
  const sortedSegments = [...grid.segments.values()].sort((a, b) =>
    (a.isEdgeClue ? 0 : 1) - (b.isEdgeClue ? 0 : 1),
  );

  for (const seg of sortedSegments) {
    const state = getState(segmentStates, seg);
    if (!state.activated) continue;

    const { dx, dy, rotation } = lineClueOffset(seg.axis);
    const label = formatNeighborClue(seg.value, seg.notation, seg.contiguityEnabled);

    // Label position: offset from the first cell of the segment (toward the clue position)
    const hitPos = toPixel(seg.cluePosition, RADIUS);
    let labelX: number, labelY: number;

    if (seg.isEdgeClue) {
      // Edge label: offset from anchor cell
      const anchorCoord =
        seg.axis === 'left-facing'
          ? seg.cells[seg.cells.length - 1]
          : seg.cells[0];
      const anchor = toPixel(anchorCoord, RADIUS);
      labelX = anchor.x + dx;
      labelY = anchor.y + dy;
    } else {
      // Gap label: offset from the adjacent cell
      if (seg.axis === 'left-facing') {
        // For left-facing, the cell before the gap (predecessor direction)
        // seg.cells[0] is the first cell AFTER the gap; we need the cell before
        // Use the predecessor of the clue position to find adjacent cell
        const group = grid.lineGroups.get(seg.lineGroupId)!;
        const gapIdx = group.allCells.findIndex(c =>
          coordKey(c) === coordKey(seg.cells[0]),
        );
        const adjacentCell = gapIdx > 0 ? group.allCells[gapIdx - 1] : seg.cells[0];
        const adjPixel = toPixel(adjacentCell, RADIUS);
        labelX = adjPixel.x + dx;
        labelY = adjPixel.y + dy;
      } else {
        // For vertical/right-facing, offset from the first cell after the gap
        const firstAfter = toPixel(seg.cells[0], RADIUS);
        labelX = firstAfter.x + dx;
        labelY = firstAfter.y + dy;
      }
    }

    if (overlapsCell(labelX, labelY, grid)) continue;

    const tooClose = renderedLabelPositions.some(p => {
      const px = labelX - p.x;
      const py = labelY - p.y;
      return px * px + py * py < LABEL_MIN_DIST * LABEL_MIN_DIST;
    });
    if (tooClose) continue;

    renderedLabelPositions.push({ x: labelX, y: labelY });
    renderSegmentLabel(
      labelX, labelY, hitPos.x, hitPos.y, label, rotation,
      state, seg.axis, seg.id, svgContainer, options, onSegmentInteraction,
    );
  }
```

- [ ] **Step 7: Update renderLineLabel to renderSegmentLabel**

Rename the function and update the interaction type:

```typescript
function renderSegmentLabel(
  textX: number, textY: number,
  hitX: number, hitY: number,
  label: string, rotation: number,
  state: SegmentState, axis: LineAxis,
  segId: string, svgContainer: SVGElement,
  opts: ClueRenderOptions,
  onSegmentInteraction?: SegmentInteraction,
): void {
  if (state.visibility !== 'invisible') {
    const opacity = state.visibility === 'dimmed' ? DIMMED_OPACITY : undefined;
    svgContainer.appendChild(
      createTextElement(textX, textY, label, '#95a5a6', 10, rotation, opacity),
    );
  }

  const hitArea = document.createElementNS(SVG_NS, 'polygon');
  hitArea.setAttribute('points', clueHitTriangle(hitX, hitY, axis));
  hitArea.setAttribute('fill', 'transparent');
  if (opts.showHitAreaOutlines) {
    hitArea.setAttribute('stroke', '#ffffff');
    hitArea.setAttribute('stroke-opacity', '0.2');
    hitArea.setAttribute('stroke-width', '1');
  }
  hitArea.style.cursor = 'pointer';

  hitArea.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    if (opts.selectionEnabled) {
      svgContainer.querySelectorAll('.clue-selection').forEach(el => el.remove());
      const sel = document.createElementNS(SVG_NS, 'polygon');
      sel.setAttribute('points', clueHitTriangle(hitX, hitY, axis));
      sel.setAttribute('fill', 'none');
      sel.setAttribute('stroke', '#ffff00');
      sel.setAttribute('stroke-width', '3');
      sel.setAttribute('pointer-events', 'none');
      sel.classList.add('clue-selection');
      svgContainer.appendChild(sel);
      return;
    }
    if (onSegmentInteraction) {
      if (e.metaKey) {
        onSegmentInteraction(segId, toggleInvisible(state));
      } else {
        onSegmentInteraction(segId, toggleGuideLine(state));
      }
    }
  });

  hitArea.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSegmentInteraction) {
      onSegmentInteraction(segId, toggleDimmed(state));
    }
  });

  svgContainer.appendChild(hitArea);
}
```

- [ ] **Step 8: Update renderClues signature**

```typescript
export function renderClues(
  grid: HexGrid,
  svgContainer: SVGElement,
  options: ClueRenderOptions,
  segmentStates: Map<string, SegmentState>,
  hiddenFlowerClues: Set<string>,
  dimmedFlowerClues: Set<string>,
  flowerGuideClues: Set<string>,
  onSegmentInteraction?: SegmentInteraction,
): void {
```

- [ ] **Step 9: Verify build compiles**

```bash
cd test-apps/04-game-mechanics && npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 10: Commit**

```bash
git add test-apps/04-game-mechanics/src/view/clue-renderer.ts
git commit -m "Update clue-renderer to use segments and per-LineGroup guide lines"
```

---

### Task 9: Update main.ts and controls

Wire segment state throughout the application entry point.

**Files:**
- Modify: `test-apps/04-game-mechanics/src/main.ts`
- Modify: `test-apps/04-game-mechanics/src/view/controls.ts`

- [ ] **Step 1: Update main.ts**

Replace all `LineClueState` / `lineClueStates` with `SegmentState` / `segmentStates`:

```typescript
import type { SegmentState } from './view/segment-state';
```

```typescript
let segmentStates = new Map<string, SegmentState>();
```

Update `render()`:
```typescript
function render(): void {
  renderGrid(currentGrid, svgEl, handleCellClick, clueOptions.selectionEnabled);
  renderClues(currentGrid, svgEl, clueOptions, segmentStates, hiddenFlowerClues, dimmedFlowerClues, flowerGuideClues, handleSegmentInteraction);
  updateHud();
}
```

Update interaction handler:
```typescript
function handleSegmentInteraction(segId: string, newState: SegmentState): void {
  segmentStates.set(segId, newState);
  render();
}
```

Update grid loading functions to reset `segmentStates`:
```typescript
function loadGrid(index: number): void {
  const config = TEST_GRIDS[index];
  currentGrid = new HexGrid(config);
  currentGrid.computeAllClues();
  segmentStates = new Map();
  // ... rest unchanged ...
}
```

Update `bulkSetLineContiguity` to use segments:
```typescript
function bulkSetLineContiguity(enabled: boolean): void {
  for (const [id, seg] of currentGrid.segments) {
    currentGrid.segments.set(id, { ...seg, contiguityEnabled: enabled });
  }
  render();
}
```

Update `handleSave`:
```typescript
function handleSave(): void {
  const json = serializeSaveFile({
    grid: currentGrid,
    name: currentGrid.width + 'x' + currentGrid.height,
    description: '',
    segmentStates,
    hiddenFlowerClues,
    dimmedFlowerClues,
    flowerGuideClues,
    history: actionHistory,
  });
  // ... rest unchanged ...
}
```

Update `loadFromJson`:
```typescript
function loadFromJson(json: string): void {
  const result = deserializeSaveFile(json);
  currentGrid = result.grid;
  segmentStates = result.segmentStates;
  hiddenFlowerClues = result.hiddenFlowerClues;
  dimmedFlowerClues = result.dimmedFlowerClues;
  flowerGuideClues = result.flowerGuideClues;
  actionHistory = result.history;
  render();
}
```

- [ ] **Step 2: Verify build and tests**

```bash
cd test-apps/04-game-mechanics && npx tsc --noEmit && npm test
```

Expected: compiles cleanly, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add test-apps/04-game-mechanics/src/main.ts test-apps/04-game-mechanics/src/view/controls.ts
git commit -m "Wire segment state through main.ts and controls"
```

---

### Task 10: Clean up old LineClue code and remove dead exports

**Files:**
- Modify: `test-apps/04-game-mechanics/src/clues/line.ts`
- Modify: `test-apps/04-game-mechanics/tests/line.test.ts`

- [ ] **Step 1: Remove old LineClue interface and functions from line.ts**

Remove from `line.ts`:
- The `LineClue` interface
- The old `computeLineClue` function
- The old `computeAllLineClues` function
- The old `computeLineContiguity` function (the one outside the new code)
- Any internal helpers now duplicated (old `computeBounds`, `isWithinBounds`, `isDiagonalStart` — keep the versions used by the new code)

Keep: `predecessor` (still used by clue-renderer.ts — actually check if it's still needed).

Check if `predecessor` is still imported anywhere:
- If `clue-renderer.ts` no longer imports it (after Task 8 changes), remove the export.
- If tests reference it, update or remove those tests.

- [ ] **Step 2: Remove old tests from line.test.ts**

Remove the old `describe('computeLineClue', ...)` and `describe('computeAllLineClues', ...)` test blocks. Keep only the new segment-based tests.

- [ ] **Step 3: Run full test suite**

```bash
cd test-apps/04-game-mechanics && npm test
```

Expected: all tests pass, no unused imports or variables.

- [ ] **Step 4: Run TypeScript strict check**

```bash
cd test-apps/04-game-mechanics && npx tsc --noEmit
```

Expected: no errors, no unused locals warnings.

- [ ] **Step 5: Commit**

```bash
git add test-apps/04-game-mechanics
git commit -m "Remove old LineClue code, clean up dead exports"
```

---

### Task 11: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite with coverage**

```bash
cd test-apps/04-game-mechanics && npm run coverage
```

Expected: all tests pass, 100% branch coverage on model/clues/grids/save layers.

- [ ] **Step 2: Start dev server and test manually**

```bash
cd test-apps/04-game-mechanics && npm run dev
```

Verify:
- Grid loads and renders correctly
- Cell clicks work (open, mark, recover)
- Segment clue labels appear at edge and gap positions
- Left-click on segment toggles guide line (renders along full LineGroup path)
- Right-click on segment toggles dimmed
- Option-click on segment toggles invisible
- Multiple guide lines on same LineGroup don't stack opacity
- Save/load preserves segment states
- Grid selector and random generation work
- Contiguity toggle works for segments

- [ ] **Step 3: Commit any fixes and update CLAUDE.md**

Update CLAUDE.md to list 04-game-mechanics under Active Technologies.

```bash
git add -A
git commit -m "End-to-end verification complete, update CLAUDE.md"
```
