# Line Clue Segments

## Goal

Split line clues at gaps into independently-valued segments. Each segment shows the filled count for its contiguous run of cells, with its own contiguity notation. The edge label retains the full-line total. Each segment is independently activatable by the solver and has independently toggleable contiguity.

## Current Model (being replaced)

One `LineClue` per axis per start position. One value, one contiguity notation. Labels at gap positions all show the same value.

## New Model

A line is split at gaps into **segments**. Each segment is a contiguous run of cells between gaps (or between a gap and the grid edge).

```
Line: [A, B, _, C, D, E, _, F]
       seg0     seg1        seg2
```

### LineSegment

Each segment has:
- `cells: HexCoord[]` — the contiguous run of cells in this segment
- `value: number` — count of filled cells in this segment only
- `notation: ClueNotation` — contiguity computed for this segment's cells only
- `contiguityEnabled: boolean` — independently toggleable per segment
- `labelPosition: HexCoord` — the gap position where this segment's label renders

### LineClue (updated)

The overall line keeps:
- `axis`, `startCoord` — unchanged
- `cells: HexCoord[]` — all cells across the full diagonal (unchanged)
- `labelPositions: HexCoord[]` — all gap positions (unchanged)
- `value: number` — total filled count across all segments
- `notation: ClueNotation` — contiguity for the full line
- `contiguityEnabled: boolean` — for the full-line edge label
- `segments: LineSegment[]` — new field

### Label rendering

- **Edge label** (first `labelPosition`, at grid boundary): shows the full-line `value` and `notation`
- **Interior gap labels**: each shows its adjacent segment's `value` and `notation`
- Lines without gaps have no label positions (unchanged behavior) but the solver can still use them

### Label-to-segment mapping

Gap positions along a line are assigned to segments as follows:

1. The **first** gap position (closest to the line's start, at the grid boundary) is the **edge label** — it shows the full-line total value.
2. Each **subsequent** gap position is associated with the segment that **follows** it (the segment whose first cell comes after the gap, walking along the line's direction). It shows that segment's value.

This means each segment (except possibly the first) has a label at the gap preceding it. The first segment's value is only shown if there happens to be a gap before it (which would be the edge label, but that shows the total instead). The first segment's value can be deduced from (total - sum of other segments).

For the ascending line from (0,4) with two segments:
- Edge gap label: full diagonal total
- Interior gap label: second segment's value

## Solver Integration

### Clue IDs

- Full line: `line:axis:col,row` (unchanged)
- Segment: `lineseg:axis:col,row:N` where N is the segment index (0-based)

### Progressive solver

- Line clue activations can target the full line or individual segments
- `findBestClue` evaluates both full-line and per-segment clues as candidates
- Full-line activation shows the edge label
- Segment activation shows that segment's gap label
- Deduction logic: same all-filled/all-empty logic applied per-segment (segment value vs marked/covered within that segment's cells)

### Deduction functions

- `deduceFromLineClue` continues to work on full lines (unchanged)
- New `deduceFromLineSegment` works on a single segment's cells with its value

## Hard Mode Contiguity

- Each segment's `contiguityEnabled` is independently toggleable
- Hard puzzles can disable contiguity on specific segments to reduce information
- The full-line `contiguityEnabled` is also independent

## Files Changed

- `src/clues/line.ts` — add `LineSegment` interface, update `computeLineClue` to compute segments, add `computeSegmentContiguity`
- `src/solver/deductions.ts` — add `lineSegClueId`, `deduceFromLineSegment`, update `parseClueId` for `lineseg:` prefix
- `src/solver/solver.ts` — handle `lineseg` clue type in `solve()`
- `src/solver/clue-selector.ts` — include segment clue IDs in `allClueIds`
- `src/solver/progressive.ts` — include segment clues as candidates
- `src/view/clue-renderer.ts` — render different values per label position
- Tests for all of the above
