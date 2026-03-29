# Retrospective: 01-grid-mechanics Test App

**Date**: 2026-03-29
**App**: `test-apps/01-grid-mechanics/`
**Stack**: TypeScript 5.x (strict) + Vite 6.x + Vitest, no UI framework
**Tests**: 214 passing, 100% branch coverage on all model and clue code

## Decisions Made During Development

### Hex Grid Geometry

- **Flat-top hexagons** in offset-column layout (even-column-down).
- Hex radius: 24px. Vertices at 0°, 60°, 120°, 180°, 240°, 300°.
- Pixel conversion: `x = col * 1.5R`, `y = row * √3R + (odd col ? √3R/2 : 0)`.
- **Bug found**: JavaScript `%` operator returns negative values for negative inputs. `(-1) % 2 === -1`, not `1`. The `toPixel` parity check must use `col % 2 !== 0` instead of `col % 2 === 1` to handle negative column coordinates (used for missing cell positions outside the grid).

### Cell Visual States

- **COVERED** — orange hex, no clue shown. Starting state for game-like testing.
- **OPEN_EMPTY** — dark hex with neighbor clue (white text, bold, 10px).
- **MARKED_FILLED** — blue hex with flower clue (white text, bold, 10px).
- Missing positions have no hex rendered but invisible placeholder polygons for restoration.

### Clue Types

#### Neighbor Clues (empty cells)
- Count of FILLED direct neighbors (0-6) that exist in the grid.
- Contiguity notation: `{n}` if all filled neighbors form one connected group, `-n-` if split into 2+ groups, plain `n` for 0-1 filled, `?` for hidden clue.
- Contiguity detection uses BFS among filled neighbors — two filled neighbors are "adjacent" if they are hex-neighbors of each other in the grid.
- Toggleable via checkbox; when disabled, all notations display as plain numbers except `?` which always renders.

#### Flower Clues (filled cells)
- Count of FILLED cells within 2-hex radius (distance 1 and 2), excluding the cell itself.
- Uses `radius2Positions()` which returns up to 18 surrounding cells.

#### Line Clues (column/diagonal)
- Three axes: vertical, ascending (/), descending (\).
- **Lines span gaps**: missing cells within grid bounds are skipped, not treated as line breaks. Each clue counts filled cells along the entire diagonal lane. Multiple clues may appear along the same diagonal wherever missing cells provide space for the label.
- **Predecessor parity bug found and fixed**: the `predecessor()` function must use the parity of `col-1` (the predecessor column), not the current column. Since `col-1` has opposite parity, the even/odd cases must be swapped.
- Line clues include contiguity notation: `{n}` if all filled cells form one unbroken run, `-n-` if filled cells are separated by empty cells.
- Contiguity toggle applies to line clues as well as neighbor clues.

### Line Clue Label Placement

- **Vertical clues**: label above the topmost cell, horizontal text.
- **Descending (\\) clues**: label upper-left of the start cell, rotated -60° to follow the hex edge.
- **Ascending (/) clues**: label upper-right of the **last** cell (top end of the diagonal), rotated 60° to follow the hex edge.
- Labels skip rendering if they overlap an occupied cell (pixel-distance check, `< RADIUS`).
- Labels skip rendering if they overlap a previously placed label (`< 0.6 * RADIUS`).
- Gap from hex edge matches across all three directions (computed using edge normal offset).

### Line Clue Display States

Four visibility states for line clues, controlled by clicking triangle hit areas:

| State | Appearance | Transitions |
|-------|-----------|-------------|
| `visible` | Full brightness label | Default state |
| `visible-with-line` | Label + 30% white guide line edge-to-edge | Left-click toggles from visible |
| `dimmed` | 30% opacity label, no guide line | Right-click toggles from visible/visible-with-line |
| `invisible` | Hidden, previous state saved | Option-click toggles; restores saved state |

**Guide lines**: 30% opaque white, 2px wide, extending from the edge of the first cell to the edge of the last cell along the axis direction. For single-cell lines, direction is computed from `stepInDirection` to ensure edge-to-edge alignment (not vertex-to-vertex).

### Line Clue Hit Areas

- Each line clue has a triangle-shaped hit area in the **missing hex cell** where the label sits (not on any grid cell).
- The triangle is one of the 6 wedges of the missing hex, pointing **toward** the grid:
  - Vertical: bottom wedge (v1→v2)
  - Descending: lower-right wedge (v0→v1)
  - Ascending: lower-left wedge (v2→v3)
- Hit area is positioned at the center of the missing hex cell using `toPixel()` on the predecessor/successor coordinate.
- For descending clues, the missing cell Y uses `toPixel` on the predecessor coordinate directly (fixed by the negative-column parity bug fix).
- Triangle outlines rendered at 20% white opacity for debugging (kept for now).

### Interaction Scheme

All interactions use left-click or right-click with modifier keys:

| Action | Input | Behavior |
|--------|-------|----------|
| Mark as filled | Click | Marks cell blue. If ground truth is EMPTY → mistake (cell stays COVERED). |
| Open (reveal) | Right-click | Reveals cell. If ground truth is FILLED → mistake (cell stays COVERED). |
| Toggle ground truth | Option+click | Switches FILLED↔EMPTY. Visual state updates to match (unless COVERED). All clues recompute. |
| Re-cover | Option+right-click | Returns cell to COVERED state. |
| Toggle missing | Option+Shift+click | Removes cell from grid (missing) or restores it as EMPTY. |
| Toggle clue visibility | Cmd+click | Toggles flower clue visibility on filled cells. |

**Mistake behavior**: mistakes increment the counter but the cell stays COVERED — the player doesn't learn which cells are filled from mistakes.

**Right-click on macOS**: `contextmenu` event intercepted with `preventDefault()` to suppress the OS context menu.

**Text selection**: disabled on the grid container via `user-select: none` to prevent accidental text selection during gameplay.

**Pointer events**: all clue text elements have `pointer-events: none` so clicks pass through to the hex cell or hit area beneath.

### Line Clue Hit Area Interactions

| Action | Input | Effect |
|--------|-------|--------|
| Toggle guide line | Click on hit area | visible ↔ visible-with-line |
| Toggle dimmed | Right-click on hit area | visible/visible-with-line → dimmed, dimmed → visible |
| Toggle invisible | Cmd+click on hit area | saves state → invisible, or restores saved state |

### SVG Rendering

- SVG namespace elements created via `document.createElementNS`.
- ViewBox computed from cell bounds with padding.
- Cells rendered as `<g>` groups with `data-coord` attribute containing `"col,row"`.
- Hex polygons use FILL_COLORS map: COVERED=#e67e22, OPEN_EMPTY=#2c3e50, MARKED_FILLED=#3498db.
- Stroke: #1a1a2e, width 2.
- All text: bold, `text-anchor: middle`, `dominant-baseline: central`.
- Cell clue font size: 10px (same for neighbor and flower clues).
- Line clue font size: 10px, color #95a5a6.

### Grid State Management

- `HexGrid` class owns cells (Map<string, HexCell>), lineClues, remainingCount, mistakeCount.
- Constructor creates cells from `TestGridConfig`, reveals all cells by default.
- `coverAll()`: sets all cells to COVERED, resets counters.
- `restart()`: reveals all cells, resets counters, preserves clue values.
- `computeAllClues()`: full recomputation of all neighbor, flower, and line clues.
- `toggleGroundTruth()`: targeted recomputation — updates the cell, its neighbors, radius-2 flower clues, and all line clues.
- `toggleMissing()`: removes or restores a cell, recomputes surrounding clues.
- Line clue display states stored separately in a `Map<string, LineClueState>` in the view layer (main.ts), keyed by `axis:col,row`.

### Controls UI

Single row of controls: grid selector dropdown, Restart button, Cover All button, Cell contiguity checkbox, Line contiguity checkbox, Hit areas checkbox, Select checkbox, separator, width/height number inputs, density slider with percentage label, Random button.

**Debug toggles**:
- **Cell contiguity**: toggles `{n}`/`-n-` notation on neighbor clues
- **Line contiguity**: independent toggle for contiguity notation on line clues
- **Hit areas**: shows/hides triangle outlines on line clue hit areas
- **Select**: clicking cells/hit areas highlights them in yellow for inspection instead of performing actions

### Flower Clue Visibility

- Cmd+click on a filled cell toggles its flower clue between visible and hidden.
- No extra SVG elements needed — the cell hex polygon handles the click.
- Hidden flower clue state stored as a `Set<string>` of coordKeys in main.ts.
- State resets when switching grids.

### Test Grids

6 predefined grids:
1. **Basic Neighbor Clues** — 3×3, 7 cells, 2 missing, mix of filled/empty
2. **Flower Clues** — 8×5, 36 cells, interior filled cluster
3. **Line Clues** — 5×6, vertical + diagonal filled lines
4. **Large Grid** — 10×7, 62 cells, scattered fills, 8 missing
5. **Tiny 3-Cell** — 3×1, minimal grid
6. **Really Large Grid** — 30×20, ~8% missing cells, ~35% fill density, seeded PRNG for reproducibility

### Random Grid Generator

- `generateRandomGrid(width, height, fillDensity)` returns a `TestGridConfig`.
- Fisher-Yates shuffle to select filled cells, no missing cells.
- Density clamped to [0, 1].
- Name format: `"Random ${width}x${height}"`.

### Architecture

```
src/
  model/
    hex-coord.ts    — HexCoord, neighbors, lineAlongAxis, radius2Positions, toPixel, stepInDirection
    hex-cell.ts     — CellGroundTruth, CellVisualState, ClueNotation, HexCell, state transitions
    hex-grid.ts     — HexGrid class, TestGridConfig, all game logic
  clues/
    neighbor.ts     — computeNeighborClue, computeContiguity, formatNeighborClue
    flower.ts       — computeFlowerClue
    line.ts         — LineClue, computeLineClue, computeAllLineClues (with gap-spanning)
  grids/
    test-grids.ts   — 6 predefined TestGridConfig instances
    random-grid.ts  — generateRandomGrid
  view/
    grid-renderer.ts    — SVG hex rendering, click handlers, missing cell placeholders
    clue-renderer.ts    — neighbor/flower/line clue text, guide lines, hit areas
    controls.ts         — UI controls (dropdown, buttons, checkbox, inputs)
    line-clue-state.ts  — LineClueState type, state transition functions
  main.ts           — app bootstrap, state management, event wiring
```

### Interior Line Clues

- Interior line clue labels appear at missing cells along a diagonal where the next cell in the **forward** direction is active (for vertical/descending) or the **predecessor** is active (for ascending).
- All labels face "downward": they describe cells going down/down-right/down-left from the label position.
- Interior labels show **partial counts** — the number of filled cells from that point to the end of the diagonal in the downward direction.
- Interior label text is positioned using the adjacent active cell as anchor with the standard edge offset, not centered in the missing cell.
- Ascending interior labels use negated offset direction (lower-left from anchor) and count backward from predecessor to diagonal start.
- Contiguity notation on interior labels reflects the partial cell subset.

### Key Bugs Fixed

1. **Predecessor parity**: `predecessor()` in line.ts used current cell's column parity instead of predecessor's (opposite) parity, causing diagonal lines to split incorrectly at column boundaries.
2. **toPixel negative columns**: `col % 2 === 1` fails for negative columns in JavaScript. Fixed to `col % 2 !== 0`.
3. **Guide line direction**: single-cell diagonal guide lines used hardcoded angles (±60°) that pointed to vertices instead of edge midpoints. Fixed to use `stepInDirection` to compute the actual axis direction.
4. **Line gap handling**: lines originally stopped at missing cells. Changed to span gaps — one clue per diagonal lane, counting all filled cells regardless of missing cells in between.

### Design Principles Confirmed

- TDD mandatory for all game logic (model + clues). View code exempt from unit tests.
- 100% branch coverage on model and clue code.
- Dark background (#141414), orange/blue/dark cell colors.
- Test app is throwaway — technology choices may differ from final game.
- Crowded diagonal clue labels acceptable for now; final game will have fewer clues.
