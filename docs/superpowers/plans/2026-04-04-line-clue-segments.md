# Line Clue Segments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split line clues at gaps into independently-valued segments so the solver can activate and reason about each segment independently, matching what the renderer already shows.

**Architecture:** Add `LineSegment` to the line clue data model. Each segment is a contiguous run of cells between gaps with its own value, contiguity, and contiguityEnabled flag. The solver gets a new `lineseg` clue type for per-segment deduction. The renderer already computes per-label partial values — the data model catches up to match.

**Tech Stack:** TypeScript 5.x (strict mode), Vitest, Vite 6.x

**Testing:** 100% branch coverage required. Run with `npm --prefix test-apps/01-grid-mechanics test`.

---

## File Structure

```
Modify: src/clues/line.ts          — add LineSegment, compute segments in computeLineClue
Modify: src/solver/deductions.ts   — add lineSegClueId, deduceFromLineSegment, update parseClueId
Modify: src/solver/solver.ts       — handle 'lineseg' clue type
Modify: src/solver/clue-selector.ts — include segment clue IDs in allClueIds
Modify: src/solver/progressive.ts  — include segment clues as candidates

Modify: tests/line.test.ts                    — test segment computation
Modify: tests/solver/deductions.test.ts        — test segment deduction + clue IDs
Modify: tests/solver/solver.test.ts            — test lineseg handling
Modify: tests/solver/clue-selector.test.ts     — test segment clue enumeration
```

---

### Task 1: Add LineSegment to the Data Model

**Files:**
- Modify: `src/clues/line.ts`
- Modify: `tests/line.test.ts`

- [ ] **Step 1: Write failing tests for segment computation**

Add to `tests/line.test.ts`:

```typescript
import { ClueNotation } from '../src/model/hex-cell';

describe('LineClue segments', () => {
  it('produces one segment when line has no gaps', () => {
    // Vertical line (2,0)→(2,1)→(2,2), no gaps
    const cellMap = buildCellMap([
      [2, 0, F], [2, 1, E], [2, 2, F],
    ]);
    const clue = computeLineClue({ col: 2, row: 0 }, 'vertical', cellMap);
    expect(clue.segments).toHaveLength(1);
    expect(clue.segments[0].cells).toHaveLength(3);
    expect(clue.segments[0].value).toBe(2);
  });

  it('splits into two segments when there is one gap', () => {
    // Vertical line with a gap: (2,0), (2,1) present, (2,2) missing, (2,3) present
    const cellMap = buildCellMap([
      [2, 0, F], [2, 1, F], [2, 3, E],
    ]);
    const clue = computeLineClue({ col: 2, row: 0 }, 'vertical', cellMap);
    expect(clue.segments).toHaveLength(2);
    expect(clue.segments[0].cells).toHaveLength(2);
    expect(clue.segments[0].value).toBe(2);
    expect(clue.segments[1].cells).toHaveLength(1);
    expect(clue.segments[1].value).toBe(0);
  });

  it('computes contiguity per segment independently', () => {
    // Segment with 2 filled = CONTIGUOUS, segment with 1 filled = PLAIN
    const cellMap = buildCellMap([
      [2, 0, F], [2, 1, F], [2, 3, F],
    ]);
    const clue = computeLineClue({ col: 2, row: 0 }, 'vertical', cellMap);
    expect(clue.segments[0].notation).toBe(ClueNotation.CONTIGUOUS);
    expect(clue.segments[1].notation).toBe(ClueNotation.PLAIN);
  });

  it('each segment has contiguityEnabled defaulting to true', () => {
    const cellMap = buildCellMap([
      [2, 0, F], [2, 3, E],
    ]);
    const clue = computeLineClue({ col: 2, row: 0 }, 'vertical', cellMap);
    for (const seg of clue.segments) {
      expect(seg.contiguityEnabled).toBe(true);
    }
  });

  it('assigns labelPosition to each segment from the gap after it', () => {
    // Vertical: (2,0), (2,1) present, (2,2) missing, (2,3) present
    // Gap at (2,2) is between seg0 and seg1
    const cellMap = buildCellMap([
      [2, 0, F], [2, 1, F], [2, 3, E],
    ]);
    const clue = computeLineClue({ col: 2, row: 0 }, 'vertical', cellMap);
    // seg0 ends at (2,1), gap at (2,2) follows → seg1's labelPosition = (2,2)
    expect(clue.segments[1].labelPosition).toEqual({ col: 2, row: 2 });
    // seg0 has no preceding gap → labelPosition is null
    expect(clue.segments[0].labelPosition).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/line.test.ts`
Expected: FAIL — `segments` property doesn't exist

- [ ] **Step 3: Add LineSegment interface and compute segments**

Add to `src/clues/line.ts`:

```typescript
export interface LineSegment {
  cells: HexCoord[];
  value: number;
  notation: ClueNotation;
  contiguityEnabled: boolean;
  /** Gap position where this segment's label renders, or null if no preceding gap. */
  labelPosition: HexCoord | null;
}
```

Add `segments: LineSegment[]` to the `LineClue` interface.

Update `computeLineClue` to compute segments by splitting the cells array at gap positions. Walk the line from start, collecting cells. When a gap is encountered, close the current segment, record the gap as the next segment's `labelPosition`, and start a new segment. After walking, compute each segment's `value` and `notation` using the existing `computeLineContiguity` logic applied to each segment's cells.

```typescript
function computeSegments(
  cells: HexCoord[],
  labelPositions: HexCoord[],
  cellMap: Map<string, HexCell>,
): LineSegment[] {
  if (labelPositions.length === 0) {
    // No gaps — single segment covering all cells
    const filledFlags = cells.map(c => {
      const cell = cellMap.get(coordKey(c));
      return cell !== undefined && cell.groundTruth === CellGroundTruth.FILLED;
    });
    const value = filledFlags.filter(Boolean).length;
    return [{
      cells: [...cells],
      value,
      notation: computeLineContiguity(filledFlags, value),
      contiguityEnabled: true,
      labelPosition: null,
    }];
  }

  // Build ordered list of all positions (cells + gaps) along the line
  // by interleaving based on their position in the walk order.
  // Since computeLineClue already walks in order and separates cells/gaps,
  // we can reconstruct segments by walking the line again.
  const gapSet = new Set(labelPositions.map(coordKey));
  const segments: LineSegment[] = [];
  let currentCells: HexCoord[] = [];
  let currentLabelPos: HexCoord | null = null;

  // Walk all positions in order (cells array is in walk order, gaps are interspersed)
  // We need to reconstruct the full walk order including gaps
  // Use the existing cells + labelPositions, sorted by their position along the line
  const allPositions: Array<{ coord: HexCoord; isGap: boolean }> = [];
  // Rebuild by re-walking from startCoord
  // Actually, cells[] and labelPositions[] are already in walk order from computeLineClue
  // We need to merge them back in order.
  let cellIdx = 0;
  let gapIdx = 0;
  // The walk order produced cells[] and labelPositions[] — gaps appear between cells
  // We can reconstruct by using the bounds-walking approach from computeLineClue
  // For simplicity, just iterate cells and check if there's a gap before each cell

  // Simpler approach: for each cell, check if the predecessor position is in gapSet
  // A gap between cell[i-1] and cell[i] means they're in different segments
  for (let i = 0; i < cells.length; i++) {
    if (i > 0) {
      // Check if there are gaps between cells[i-1] and cells[i]
      // Walk from cells[i-1] forward and see if we hit a gap before cells[i]
      // For simplicity, check if cells[i] is NOT the direct successor of cells[i-1]
      // If there are gaps, close the current segment
      // The gap positions between these two cells will be in labelPositions
      const prevKey = coordKey(cells[i - 1]);
      const currKey = coordKey(cells[i]);
      // Check labelPositions for any gap that falls between prev and current
      // Since gaps are in walk order, we can use gapIdx
      while (gapIdx < labelPositions.length) {
        const gapKey = coordKey(labelPositions[gapIdx]);
        // This gap is between current segment and next
        // Close current segment, record this gap as next segment's label
        if (currentCells.length > 0) {
          const filledFlags = currentCells.map(c => {
            const cell = cellMap.get(coordKey(c));
            return cell !== undefined && cell.groundTruth === CellGroundTruth.FILLED;
          });
          const value = filledFlags.filter(Boolean).length;
          segments.push({
            cells: [...currentCells],
            value,
            notation: computeLineContiguity(filledFlags, value),
            contiguityEnabled: true,
            labelPosition: currentLabelPos,
          });
          currentCells = [];
        }
        currentLabelPos = labelPositions[gapIdx];
        gapIdx++;
        break;
      }
    }
    currentCells.push(cells[i]);
  }

  // Close final segment
  if (currentCells.length > 0) {
    const filledFlags = currentCells.map(c => {
      const cell = cellMap.get(coordKey(c));
      return cell !== undefined && cell.groundTruth === CellGroundTruth.FILLED;
    });
    const value = filledFlags.filter(Boolean).length;
    segments.push({
      cells: [...currentCells],
      value,
      notation: computeLineContiguity(filledFlags, value),
      contiguityEnabled: true,
      labelPosition: currentLabelPos,
    });
  }

  return segments;
}
```

NOTE: The above is a sketch — the implementer should verify the gap detection logic against actual hex line walking. The key invariant: gaps from `labelPositions` appear between cells in walk order, and each gap splits the line into a new segment.

Add a call to `computeSegments` at the end of `computeLineClue`, and include `segments` in the returned `LineClue` object.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/line.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `npm --prefix test-apps/01-grid-mechanics test`
Expected: All tests pass (existing tests may need `segments` added to expected objects if they do exact-match assertions)

- [ ] **Step 6: Commit**

```bash
cd test-apps/01-grid-mechanics && git add src/clues/line.ts tests/line.test.ts
git commit -m "feat(line): add LineSegment — split line clues at gaps into segments"
```

---

### Task 2: Add Segment Clue IDs and Deduction Function

**Files:**
- Modify: `src/solver/deductions.ts`
- Modify: `tests/solver/deductions.test.ts`

- [ ] **Step 1: Write failing tests for lineSegClueId and parseClueId**

Add to `tests/solver/deductions.test.ts`:

```typescript
import { lineSegClueId } from '../../src/solver/deductions';

describe('line segment clue IDs', () => {
  it('creates line segment clue ID', () => {
    expect(lineSegClueId('ascending', { col: 0, row: 4 }, 1)).toBe('lineseg:ascending:0,4:1');
  });

  it('parses line segment clue ID', () => {
    const parsed = parseClueId('lineseg:ascending:0,4:1');
    expect(parsed).toEqual({ type: 'lineseg', axis: 'ascending', coord: { col: 0, row: 4 }, segIndex: 1 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/deductions.test.ts`
Expected: FAIL — `lineSegClueId` not exported

- [ ] **Step 3: Implement lineSegClueId, update parseClueId, add ParsedClueId variant**

In `src/solver/deductions.ts`:

```typescript
export function lineSegClueId(axis: LineAxis, startCoord: HexCoord, segIndex: number): ClueId {
  return `lineseg:${axis}:${coordKey(startCoord)}:${segIndex}`;
}
```

Update `ParsedClueId` to include:
```typescript
  | { type: 'lineseg'; axis: LineAxis; coord: HexCoord; segIndex: number }
```

Update `parseClueId` to handle the `lineseg:` prefix. **IMPORTANT:** The `lineseg:` check must come BEFORE the `line:` check, since `lineseg:` also starts with `line`:
```typescript
  if (id.startsWith('lineseg:')) {
    const rest = id.slice('lineseg:'.length);
    const parts = rest.split(':');
    const axis = parts[0] as LineAxis;
    const coord = parseCoordKey(parts[1]);
    const segIndex = Number(parts[2]);
    return { type: 'lineseg', axis, coord, segIndex };
  }
```

- [ ] **Step 4: Write failing tests for deduceFromLineSegment**

```typescript
import type { LineSegment } from '../../src/clues/line';
import { deduceFromLineSegment } from '../../src/solver/deductions';

describe('deduceFromLineSegment', () => {
  it('deduces all covered as empty when segment value equals marked count', () => {
    const seg: LineSegment = {
      cells: [{ col: 2, row: 0 }, { col: 2, row: 1 }, { col: 2, row: 2 }],
      value: 1,
      notation: 'PLAIN' as any,
      contiguityEnabled: true,
      labelPosition: null,
    };
    const cells: HexCell[] = [
      makeCell({ col: 2, row: 0 }, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell({ col: 2, row: 1 }, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell({ col: 2, row: 2 }, CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromLineSegment(seg, 'vertical', { col: 2, row: 0 }, 0, cellMap);
    expect(deductions).toHaveLength(2);
    for (const d of deductions) {
      expect(d.result).toBe('empty');
    }
  });

  it('deduces all covered as filled when remaining equals covered', () => {
    const seg: LineSegment = {
      cells: [{ col: 2, row: 0 }, { col: 2, row: 1 }],
      value: 2,
      notation: 'CONTIGUOUS' as any,
      contiguityEnabled: true,
      labelPosition: null,
    };
    const cells: HexCell[] = [
      makeCell({ col: 2, row: 0 }, CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell({ col: 2, row: 1 }, CellGroundTruth.FILLED, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromLineSegment(seg, 'vertical', { col: 2, row: 0 }, 0, cellMap);
    expect(deductions).toHaveLength(2);
    for (const d of deductions) {
      expect(d.result).toBe('filled');
    }
  });

  it('returns empty when no deduction possible', () => {
    const seg: LineSegment = {
      cells: [{ col: 2, row: 0 }, { col: 2, row: 1 }, { col: 2, row: 2 }],
      value: 1,
      notation: 'PLAIN' as any,
      contiguityEnabled: true,
      labelPosition: null,
    };
    const cells: HexCell[] = [
      makeCell({ col: 2, row: 0 }, CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell({ col: 2, row: 1 }, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell({ col: 2, row: 2 }, CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const deductions = deduceFromLineSegment(seg, 'vertical', { col: 2, row: 0 }, 0, cellMap);
    expect(deductions).toHaveLength(0);
  });
});
```

- [ ] **Step 5: Implement deduceFromLineSegment**

```typescript
import type { LineSegment } from '../clues/line';

export function deduceFromLineSegment(
  segment: LineSegment,
  axis: LineAxis,
  lineStartCoord: HexCoord,
  segIndex: number,
  cellMap: Map<string, HexCell>,
): Deduction[] {
  const { markedFilled, covered } = countStates(segment.cells, cellMap);
  const id = lineSegClueId(axis, lineStartCoord, segIndex);
  return applyDeduction(segment.value, markedFilled, covered, id, (result) =>
    result === 'empty'
      ? `${axis} segment ${segIndex} shows ${segment.value} filled, ${markedFilled} found`
      : `${axis} segment ${segIndex} shows ${segment.value} filled, ${markedFilled} found, ${covered.length} covered`,
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm --prefix test-apps/01-grid-mechanics test -- --run tests/solver/deductions.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd test-apps/01-grid-mechanics && git add src/solver/deductions.ts tests/solver/deductions.test.ts
git commit -m "feat(solver): add line segment clue IDs and deduction function"
```

---

### Task 3: Wire Segments into Solver and Clue Selector

**Files:**
- Modify: `src/solver/solver.ts`
- Modify: `src/solver/clue-selector.ts`
- Modify: `src/solver/progressive.ts`
- Modify: `tests/solver/solver.test.ts`
- Modify: `tests/solver/clue-selector.test.ts`

- [ ] **Step 1: Update solver.ts to handle lineseg clue type**

Add `deduceFromLineSegment` to imports in `solver.ts`. Add a new case in the `solve` function:

```typescript
    } else if (parsed.type === 'lineseg') {
      const lineClue = grid.lineClues.find(
        (lc) =>
          lc.axis === parsed.axis &&
          coordKey(lc.startCoord) === coordKey(parsed.coord),
      );
      if (lineClue !== undefined && parsed.segIndex < lineClue.segments.length) {
        all.push(...deduceFromLineSegment(
          lineClue.segments[parsed.segIndex],
          parsed.axis,
          parsed.coord,
          parsed.segIndex,
          grid.cells,
        ));
      }
    }
```

- [ ] **Step 2: Update allClueIds in clue-selector.ts to include segment clue IDs**

```typescript
  for (const lc of grid.lineClues) {
    ids.add(lineClueId(lc.axis, lc.startCoord));
    for (let i = 0; i < lc.segments.length; i++) {
      ids.add(lineSegClueId(lc.axis, lc.startCoord, i));
    }
  }
```

Add `lineSegClueId` to imports.

- [ ] **Step 3: Update progressive.ts**

The progressive solver's `findBestClue` and activation logic already handle any clue type through `parseClueId`. Line segment clues (`lineseg:...`) don't reveal cells (same as `line:` clues), so the existing fallback path for non-cell clues handles them. Update the activation message:

In the `else` branch that handles non-cell clues, update the explanation:

```typescript
      const explanation = parsed.type === 'line'
        ? `Solver activated ${parsed.axis} line clue at (${coordKey(parsed.coord)})`
        : parsed.type === 'lineseg'
        ? `Solver activated ${parsed.axis} segment ${parsed.segIndex} at (${coordKey(parsed.coord)})`
        : `Solver activated global remaining count`;
```

- [ ] **Step 4: Add tests for solver.ts lineseg handling**

Add a test to `tests/solver/solver.test.ts` that adds a `lineseg:` clue ID to the visible set and verifies `solve()` produces deductions from the segment.

- [ ] **Step 5: Add test for allClueIds including segments**

Add a test to `tests/solver/clue-selector.test.ts` verifying that `allClueIds` returns `lineseg:` IDs when the grid has line clues with segments.

- [ ] **Step 6: Run full test suite**

Run: `npm --prefix test-apps/01-grid-mechanics test`
Expected: All pass

- [ ] **Step 7: Run coverage**

Run: `npm --prefix test-apps/01-grid-mechanics run coverage`
Expected: 100% branches

- [ ] **Step 8: Commit**

```bash
cd test-apps/01-grid-mechanics && git add src/solver/solver.ts src/solver/clue-selector.ts src/solver/progressive.ts tests/solver/solver.test.ts tests/solver/clue-selector.test.ts
git commit -m "feat(solver): wire line segments into solver, clue selector, and progressive solver"
```

---

### Task 4: Fix Coverage Gaps and Final Verification

**Files:**
- Various test files as needed

- [ ] **Step 1: Run coverage**

Run: `npm --prefix test-apps/01-grid-mechanics run coverage`
Check for any uncovered branches in modified files.

- [ ] **Step 2: Add tests for any uncovered branches**

Common gaps: the `lineseg` branch in `parseClueId`, the `segIndex >= segments.length` guard in `solver.ts`, the segment activation message in `progressive.ts`.

- [ ] **Step 3: Build the app**

Run: `npm --prefix test-apps/01-grid-mechanics run build`
Expected: Clean build

- [ ] **Step 4: Manual verification in browser**

Start dev server, load Large Grid, click Solve, step through. Verify:
- Line clue activations and segment activations appear as separate steps
- Segment deductions reference the correct segment index
- Edge labels still show full-line totals

- [ ] **Step 5: Commit any remaining fixes**

```bash
cd test-apps/01-grid-mechanics && git add -A
git commit -m "test: fix coverage gaps for line segment clues"
```
