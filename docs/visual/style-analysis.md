# Visual Style Analysis: Hexcells Infinite

Source screenshot: `docs/screenshots/hexcells-infinite-board.jpg`

## Game Identity

**Hexcells Infinite** is a logic/deduction puzzle game played on a hexagonal grid.
The player determines which hex cells are "filled" vs "empty" using numeric
constraint clues, similar to Minesweeper or Picross but on a hex lattice.

---

## Grid Geometry

### Hex Orientation
- **Flat-top** hexagons (the flat edge is on top and bottom; vertices point left and right).
- Arranged in an **offset/staggered** column layout (even columns shifted down by half a cell height).

### Cell Size
- Each hex is approximately 28-32px wide at the screenshot's native resolution.
- The aspect ratio of each hex is roughly 1 : 0.87 (width : height), consistent with regular hexagons.

### Grid Boundary
- The puzzle boundary is **irregular and organic** -- not a rectangle or convex shape.
- The cluster has peninsulas, inlets, and jagged edges, forming an asymmetric silhouette.
- Approximately 200-250 total cells are visible in this puzzle.

### Cell Spacing
- Cells are packed tightly with a **thin dark gap** (~1-2px) between adjacent hexes.
- The gap color matches or is very close to the background, making cells appear to float individually.

---

## Cell States

The game has four visually distinct cell states:

### 1. Covered (Orange/Amber)
- **Role**: Cells the player has not yet acted on. Could be filled (mined) or empty — the player must deduce which. The primary interactive surface.
- **Fill**: Warm amber/orange with a very subtle top-to-bottom gradient (lighter crown, slightly darker base), giving a gentle 3D pillow effect.
- **Text**: White numerals centered inside, denoting constraint clues. Some cells have no visible number.
- **Prevalence**: Dominant color in mid-game. This is the first color the eye is drawn to.

### 2. Marked Filled (Blue)
- **Role**: Cells the player has correctly marked as filled/mined. The player marks cells they believe are filled; if correct, the cell turns blue. Marking an empty cell triggers a mistake.
- **Fill**: Medium-saturated blue, also with a subtle gradient/bevel matching the orange cells' treatment.
- **Text**: White numerals where applicable. A number inside a blue cell is a **"flower"** — it indicates the count of filled cells within a **2-hex radius** of that cell (not just the immediate 6 neighbors, but the wider ring of 18 cells). For example, an "8" flower means 8 cells within 2 grid hexes of it are filled.
- **Prevalence**: Distributed throughout the grid wherever the player has identified filled cells. Clusters tend to form as adjacent filled cells are found.

### 3. Open Empty (Dark)
- **Role**: Cells that have been opened and confirmed as empty. Opening a covered cell that is not filled reveals it as an open empty cell.
- **Fill**: Very dark grey, just barely distinguishable from the background. The hex shape is preserved via a faint outline.
- **Text**: Small white numerals — clue numbers indicating how many of the cell's six neighbors are filled. Not every open cell has a clue. Clue numbers may be plain, curly-braced `{n}`, or dashed `-n-` (see Numbers and Symbols).
- **Prevalence**: Forms corridors and channels through the grid — the revealed structure between filled regions.

### 4. Missing Hex (Grey Outline)
- **Role**: Hex positions that are absent from the puzzle. Not part of gameplay — the player cannot interact with them.
- **Fill**: None (transparent or background-colored).
- **Border**: Thin grey stroke (~1px), just enough to indicate the hex position exists in the underlying grid.
- **Prevalence**: Scattered throughout the grid, including interior voids (not just edges). These gaps shape the puzzle's irregular silhouette and affect neighbor counts for adjacent cells.

---

## Numbers and Symbols

### In-Cell Clue Numbers — Open Empty Cells (Neighbor Count)
Numbers inside open empty cells indicate how many of that cell's six immediate hex
neighbors are filled. Some open empty cells display a `?` instead of a number,
indicating that no clue is available for that cell. Three number notations exist:

- **Plain number** (e.g., `3`): Exactly 3 neighbors are filled. No information about whether they are adjacent to each other.
- **Curly-braced** (e.g., `{3}`): Exactly 3 neighbors are filled, and they are **contiguous** — all connected in a single unbroken group around the cell's ring.
- **Dashed** (e.g., `-3-`): Exactly 3 neighbors are filled, and they are **discontiguous** — separated into two or more groups with gaps between them.

### Flower Clue Numbers — Blue Filled Cells (2-Hex Radius)
A number inside a **blue** (filled) cell is called a "flower." It counts the number of
filled cells within a **2-hex radius** — the 18 cells in the two concentric rings around
the blue cell. For example, the "8" flower visible in the lower-right of the screenshot
means 8 of those 18 surrounding cells are filled.

Flowers likely support the same three notations (plain, curly-braced, dashed) to indicate
contiguity of the filled cells within that wider radius.

### Line Clue Numbers (Column/Diagonal Count)
Numbers positioned at the end of a column or diagonal indicate the total count of
filled cells along that line. They appear in three locations:

- **Top edge**: Column clues for vertical lines.
- **Left and right sides**: Diagonal clues for the two diagonal axes.
- **Inside the grid in missing hex positions**: These provide clues for a **partial**
  column or diagonal — counting filled cells from the clue's position to the edge
  of the grid, not the entire line.

They follow the same three notations:

- **Plain**: Total filled count along the line, no contiguity information.
- **Curly-braced** `{n}`: All filled cells along the line form one contiguous run.
- **Dashed** `-n-`: Filled cells along the line are split into two or more separate groups.

### Font
- Clean geometric sans-serif, white, ~8-10px, centered within each cell.
- Possibly a custom bitmap font or something in the Montserrat/Roboto Condensed family.

---

## Color Palette

### Background
| Swatch | Hex | Role |
|--------|-----|------|
| | `#141414` | Primary background (dark, near-black, very slightly warm) |
| | `#1A1A1A` | Subtle background gradient / vignette edge |

### Cells
| Swatch | Hex | Role |
|--------|-----|------|
| | `#E8952A` | Orange cell base (unrevealed) |
| | `#D4862A` | Orange cell shadow/darker variant |
| | `#F0A030` | Orange cell highlight/lighter variant |
| | `#4A8AC4` | Blue cell base (confirmed filled) |
| | `#3D74A8` | Blue cell shadow/darker variant |
| | `#5A9AD4` | Blue cell highlight/lighter variant |
| | `#2A2A2A` | Dark cell fill (revealed empty) |
| | `#3A3A3A` | Dark cell border |
| | `#555555` | Grey outline cell border |

### UI / HUD
| Swatch | Hex | Role |
|--------|-----|------|
| | `#4A8AC4` | "REMAINING" badge background (matches blue cells) |
| | `#D94040` | "MISTAKES" badge background (red/coral) |
| | `#FFFFFF` | HUD text and cell numerals |
| | `#AAAAAA` | MENU and secondary UI text |

### Full Palette Summary
The palette is intentionally constrained to two warm/cool accent colors against a dark neutral:

- **Orange** (warm, active, unsolved) vs **Blue** (cool, settled, solved) creates a clear semantic dichotomy.
- **Dark grey** background provides maximum contrast without the harshness of pure black.
- **White** text is the only text color used, relying on the cell fill for state differentiation.
- The **red** of the mistakes counter is the only "alarm" color and appears only in the HUD.

---

## HUD / Chrome

### Top-Right Stats Panel
- Two stacked badges, right-aligned, with generous padding from the screen edge.
- **"REMAINING 71"**: White uppercase label, large bold numeral below, on a blue rounded-rectangle badge.
- **"MISTAKES 0"**: Same layout, on a red/coral badge.
- The badges are the same width, forming a neat vertical stack.

### Top-Left Menu
- **"MENU"** in muted grey/white, stacked vertically (letters reading top-to-bottom), below the macOS window control buttons.
- Very low visual weight -- the game de-emphasizes navigation chrome to keep focus on the puzzle.

### Window Title Bar
- Standard OS window chrome showing "Hexcells Infinite" centered.
- The game does not use a custom title bar.

### Overall HUD Philosophy
- **Minimal**: Only two data points (remaining count, mistake count) are shown during play.
- **Non-intrusive**: HUD elements hug the corners and use muted styling.
- **No decorative borders, gradients, or embellishments** on the HUD -- just clean rectangles with text.

---

## Typography

| Context | Style | Size (est.) | Weight | Color |
|---------|-------|-------------|--------|-------|
| Cell numerals | Geometric sans-serif | 8-10px | Regular/Medium | White |
| HUD numbers | Same family | 20-24px | Bold | White |
| HUD labels | Same family, uppercase | 10-12px | Regular | White |
| Menu text | Same family | 10-12px | Regular | Grey (#AAA) |

The game appears to use a single typeface family throughout, possibly **Montserrat**, **Josefin Sans**, or a custom geometric sans. All text is anti-aliased and crisp.

---

## Visual Effects and Rendering

### Cell Shading
- Cells are **not perfectly flat**. There is a very subtle top-lit gradient giving each hex a gentle 3D "pillow" or "button" quality.
- The effect is restrained enough to read as modern/minimal rather than skeuomorphic.

### Background
- The dark background may have a **very faint radial vignette** (slightly darker at edges, marginally lighter at center), drawing the eye inward.
- No visible texture or pattern -- clean solid dark fill.

### Shadows / Depth
- No drop shadows on cells.
- No glow effects.
- Depth is communicated purely through the cell fill gradient and the color differentiation between states.

### Animation (inferred, not visible in static screenshot)
- Hexcells games typically animate cell reveals with a brief color transition and a subtle "pop" scale effect.
- The constraint numbers fade in as cells are revealed.

---

## Spatial Composition

- The puzzle grid sits roughly **centered** in the viewport with comfortable margins on all sides.
- The irregular grid silhouette is roughly **landscape-oriented**, wider than it is tall.
- The largest contiguous orange region is in the upper-left quadrant, suggesting the player has been solving from the lower-right inward (or the puzzle naturally has more constraints at the bottom-right).
- Blue clusters dominate the right side and bottom edge.
- Dark revealed-empty cells create corridors and channels through the middle.

---

## Design Principles (Summary)

1. **Two-color semantic system**: Orange = unknown/active, Blue = known/resolved. No ambiguity.
2. **Dark-background-first**: Maximum cell contrast, reduced eye strain for long puzzle sessions.
3. **Minimal chrome**: The puzzle IS the interface. HUD is nearly invisible.
4. **Flat-with-depth**: Modern flat aesthetic with just enough 3D shading to give cells tactile presence.
5. **Information density through geometry**: The hex grid itself carries the complexity; visual styling stays simple to avoid competing with the logical content.
6. **Constrained palette**: Five effective colors total (orange, blue, dark grey, red, white). Discipline over variety.
