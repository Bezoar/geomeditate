# Data Model: Hex Grid Test App for Game Mechanics

**Branch**: `002-hex-grid-test-mechanics` | **Date**: 2026-03-28

## Entities

### HexCoord

Identifies a cell position in the grid.

| Field | Type | Constraints |
|-------|------|-------------|
| col | integer | >= 0 |
| row | integer | >= 0 |

**Identity**: Unique by `(col, row)` pair within a grid.

### CellGroundTruth

The hidden answer for a cell — whether it is filled (a "mine") or empty.

| Value | Meaning |
|-------|---------|
| FILLED | Cell contains a mine |
| EMPTY | Cell does not contain a mine |

### CellVisualState

The player-visible state of a cell.

| Value | Meaning | Visual |
|-------|---------|--------|
| COVERED | Not yet interacted with | Orange hex |
| OPEN_EMPTY | Revealed as empty | Dark hex with neighbor clue |
| MARKED_FILLED | Marked as filled by player | Blue hex with flower clue |

### ClueNotation

How a neighbor clue number is displayed.

| Value | Display | Meaning |
|-------|---------|---------|
| PLAIN | `n` | No contiguity information |
| CONTIGUOUS | `{n}` | All filled neighbors form one connected group |
| DISCONTIGUOUS | `-n-` | Filled neighbors form 2+ disconnected groups |
| NO_CLUE | `?` | Clue intentionally hidden |

### HexCell

A single cell in the grid.

| Field | Type | Constraints |
|-------|------|-------------|
| coord | HexCoord | Unique within grid |
| groundTruth | CellGroundTruth | Immutable in predefined grids; mutable via Option+click in sandbox mode |
| visualState | CellVisualState | Starts as OPEN_EMPTY or MARKED_FILLED in revealed mode |
| neighborClueValue | integer or null | 0-6 for empty cells; null for filled cells |
| neighborClueNotation | ClueNotation | Derived from contiguity analysis; affected by toggle |
| flowerClueValue | integer or null | 0-18 for filled cells; null for empty cells |

**State transitions** (sandbox mode):

```
                  Shift+Option+click
OPEN_EMPTY ──────────────────────> COVERED
MARKED_FILLED ───────────────────> COVERED
                  click
COVERED ─────────────────────────> OPEN_EMPTY (if ground truth = EMPTY)
COVERED ─────────────────────────> MARKED_FILLED (if ground truth = FILLED) ⚠ MISTAKE
                  Shift+click
COVERED ─────────────────────────> MARKED_FILLED (if ground truth = FILLED)
COVERED ─────────────────────────> MARKED_FILLED (if ground truth = EMPTY) ⚠ MISTAKE
```

Mistake rules:
- Clicking a FILLED cell = mistake (player thought it was empty)
- Shift+clicking an EMPTY cell = mistake (player thought it was filled)
- Both still transition the cell; the mistake counter increments alongside the state change

Ground truth toggle (Option+click on any cell):
- FILLED ↔ EMPTY (triggers full clue recomputation)

### HexGrid

The complete game board.

| Field | Type | Constraints |
|-------|------|-------------|
| width | integer | > 0 (columns) |
| height | integer | > 0 (rows) |
| cells | Map<string, HexCell> | Key is `"col,row"`; missing keys = missing hex positions |
| lineClues | LineClue[] | Computed from cell ground truths |

**Derived properties**:
- `remainingCount`: Number of FILLED cells not yet in MARKED_FILLED visual state
- `mistakeCount`: Incremented on incorrect open/mark actions

### LineClue

A clue displayed along one of the three hex axes.

| Field | Type | Constraints |
|-------|------|-------------|
| axis | "vertical" / "ascending" / "descending" | One of three hex axes |
| position | integer | Column index (vertical) or diagonal index |
| value | integer | Count of filled cells along this line |
| startCoord | HexCoord | Where to render the clue label |

### TestGridConfig

A predefined test scenario.

| Field | Type | Constraints |
|-------|------|-------------|
| name | string | Unique, human-readable identifier |
| description | string | What this grid tests |
| width | integer | Grid columns |
| height | integer | Grid rows |
| filledCoords | HexCoord[] | Which cells are filled |
| missingCoords | HexCoord[] | Which positions have no cell |

## Relationships

```
TestGridConfig ──creates──> HexGrid
HexGrid ──contains──> HexCell[] (via cells map)
HexGrid ──contains──> LineClue[] (computed)
HexCell ──has──> HexCoord (identity)
HexCell ──has──> CellGroundTruth (answer)
HexCell ──has──> CellVisualState (display)
HexCell ──has──> ClueNotation (neighbor clue display mode)
```

## Computation Dependencies

When a cell's ground truth changes, the following must recompute:
1. **The changed cell's own clues** (neighbor value if now empty, flower value if now filled)
2. **All neighbor cells' neighbor clue values** (their filled-neighbor count changed)
3. **All neighbor cells' contiguity notation** (the group structure may have changed)
4. **All cells within 2-hex radius' flower clue values** (if they are filled)
5. **All line clues on axes passing through the changed cell**
6. **The REMAINING counter**
