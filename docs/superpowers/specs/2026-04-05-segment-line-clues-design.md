# Segment-Based Line Clue Redesign

**Date:** 2026-04-05
**App:** test-apps/04-game-mechanics (new, forked from 01-grid-mechanics)
**Status:** Design approved

## Goal

Redesign line clues so that segments — not whole lines — are the primary game unit. Each segment extends from a clue position (edge or gap) to the far end of its column or diagonal. Segments along the same physical path overlap but are independent. This matches how players actually reason about line clues.

All existing functionality from 01-grid-mechanics must be preserved: cell model, neighbor clues, flower clues, play state, action history, save/load.

## Terminology Changes

| Old (01-grid-mechanics) | New (02-game-mechanics) |
|------------------------|------------------------|
| `ascending` | `left-facing` (clue rotated +60°, reads down-left) |
| `descending` | `right-facing` (clue rotated −60°, reads down-right) |
| `LineClue` | `Segment` + `LineGroup` |

The "facing" direction describes how the rotated clue number reads "down" through the grid from its point of view. The font baseline is parallel to the nearest hex edge on the diagonal.

## Data Model

### LineAxis

```typescript
type LineAxis = 'vertical' | 'left-facing' | 'right-facing';
```

### Segment (primary game unit)

```typescript
interface Segment {
  id: string;                    // "seg:<axis>:<col>,<row>" using clue position
  lineGroupId: string;           // reference to parent LineGroup
  axis: LineAxis;
  cluePosition: HexCoord;       // where the clue renders (edge predecessor or gap)
  cells: HexCoord[];             // game cells this segment covers, in traversal order
  value: number;                 // count of filled cells among cells[]
  notation: ClueNotation;        // PLAIN / CONTIGUOUS / DISCONTIGUOUS
  isEdgeClue: boolean;           // true for the full-line segment at the edge
}
```

**Key invariant:** `cells[]` contains only game cells (no gaps). Consecutive entries are always adjacent for contiguity purposes. This eliminates the gap-breaks-contiguity bug by construction.

### LineGroup (rendering and identification)

```typescript
interface LineGroup {
  id: string;                    // "line:<axis>:<col>,<row>" using first cell
  axis: LineAxis;
  allCells: HexCoord[];          // all game cells along this physical path, in order
  gapPositions: HexCoord[];      // grid positions where gaps exist (not game cells)
  segmentIds: string[];          // segment IDs, ordered from edge to far end
  startCoord: HexCoord;          // first game cell on the line
  endCoord: HexCoord;            // last game cell on the line
}
```

LineGroup exists for guide line rendering and segment grouping. Game logic only touches Segments.

### HexGrid changes

```typescript
// Replace:
//   lineClues: LineClue[]
// With:
segments: Map<string, Segment>;
lineGroups: Map<string, LineGroup>;
```

### Unchanged from 01-grid-mechanics

- `HexCell` interface (coord, groundTruth, visualState, neighborClueValue, neighborClueNotation, contiguityEnabled, flowerClueValue)
- `CellGroundTruth` enum (FILLED / EMPTY)
- `CellVisualState` enum (COVERED / OPEN_EMPTY / MARKED_FILLED)
- `ClueNotation` enum (PLAIN / CONTIGUOUS / DISCONTIGUOUS / NO_CLUE)
- `HexCoord` interface and all coordinate utilities
- Neighbor clue computation
- Flower clue computation

## Computation Pipeline

### Full computation (grid load / shape change)

1. **Walk lines:** For each axis, find start positions (cells with no predecessor in the grid). Walk forward along the axis, collecting game cells and gap positions.
2. **Produce LineGroups:** Each walk yields one LineGroup with `allCells[]`, `gapPositions[]`, `startCoord`, `endCoord`.
3. **Derive Segments from each LineGroup:**
   - **Edge segment:** Clue at the predecessor position of the first cell along the axis. Covers all of `allCells`.
   - **Gap segments:** One per entry in `gapPositions`. Covers the suffix of `allCells` starting from the first cell after the gap position.
4. **Compute values:** For each segment, count filled cells in `cells[]` and determine notation via run-counting on the filled flags.

### Incremental recomputation (cell ground truth toggle)

When a cell's ground truth changes, only recompute `value` and `notation` for segments whose `cells[]` includes that cell. No need to rewalk lines or recompute structural data (cells, gaps, clue positions). This is an improvement over 01-grid-mechanics which recomputes all line clues from scratch on every cell change.

### Contiguity algorithm

Same run-counting algorithm as before, operating on the segment's `cells[]` array:

```
filledFlags = cells.map(c => cellMap.get(c).groundTruth === FILLED)
count runs of consecutive true values in filledFlags
0-1 filled → PLAIN
1 run → CONTIGUOUS
2+ runs → DISCONTIGUOUS
```

Because `cells[]` excludes gaps, consecutive cells are always adjacent. A gap between two filled cells does not break contiguity.

## State Management

### Segment state

```typescript
type SegmentVisibility = 'invisible' | 'visible' | 'visible-with-line' | 'dimmed';

interface SegmentState {
  visibility: SegmentVisibility;
  savedVisibility: 'visible' | 'visible-with-line' | 'dimmed';
  activated: boolean;
}
```

State is stored in a `Map<string, SegmentState>` keyed by segment ID.

### Visibility transitions (same as 01-grid-mechanics)

- **Left-click:** `visible` ↔ `visible-with-line` (no-op when dimmed)
- **Right-click:** `visible | visible-with-line` ↔ `dimmed` (no-op when invisible)
- **Option-click:** Toggles `invisible`, saving/restoring previous visibility

### Activation

`activated` controls whether a segment's clue appears at all. An inactive segment has no rendered label and no hit area. Visibility controls only apply to active segments. All segments start activated; selective deactivation is a future concern for puzzle presentation.

### Guide line rendering rule

Guide lines render per LineGroup, not per segment. If **any** segment in a LineGroup has `visible-with-line`, the guide line renders along the full LineGroup path (from `startCoord` to `endCoord`) at fixed opacity (0.3). Multiple segments with `visible-with-line` in the same group do not stack opacity.

## Rendering

### Clue labels

One label per active segment, positioned at `cluePosition`. Rotation: +60° for left-facing, −60° for right-facing, 0° for vertical. Text shows formatted value with notation (`3`, `{3}`, `-3-`). Only rendered when visibility is not `invisible`. Dimmed renders at reduced opacity (0.15).

### Hit areas

One triangle per active segment at its `cluePosition`. Always present regardless of visibility state (enables clicking invisible clues to cycle state). Triangle geometry determined by axis, same as 01-grid-mechanics.

### Guide lines

One per LineGroup. Rendered along full path from `startCoord` to `endCoord` at opacity 0.3 if any segment in the group has `visible-with-line`. Not rendered otherwise.

### Label collision avoidance

Same minimum-distance check as 01-grid-mechanics. If two segment clue positions are too close, edge segments take priority over gap segments.

### What the renderer no longer does

The renderer no longer walks cells, computes partial contiguity, or derives clue values. It reads `segment.value` and `segment.notation` directly. The old interior-label partial-contiguity logic in the renderer is eliminated — gap segments are just segments with precomputed values.

## Save/Load

Same serialization approach as 01-grid-mechanics. Changes:

- Segment states are serialized keyed by segment ID (`"seg:<axis>:<col>,<row>"`) instead of the old line clue key (`"<axis>:<col>,<row>"`).
- Grid structure (LineGroups, Segments) is recomputed on load from the grid shape — only segment states (visibility, activation) need to be persisted.

## App Scope

04-game-mechanics is a new test app under `test-apps/`. It forks from 01-grid-mechanics and replaces the line clue system while preserving everything else. Same tech stack: TypeScript 5.x (strict mode) + Vite 6.x, no UI framework.
