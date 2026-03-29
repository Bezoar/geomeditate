# Research: Hex Grid Test App for Game Mechanics

**Branch**: `002-hex-grid-test-mechanics` | **Date**: 2026-03-28

## Technology Stack

### Decision: TypeScript + Vite + SVG

**Rationale**: This is a self-contained browser-based test app for a hex grid puzzle game. The other test apps in the roadmap (02-hex-shatter, 03-tap-to-tone) also target the browser. TypeScript provides type safety for the hex coordinate math and clue computation logic, which are non-trivial. Vite provides a single-command dev server (`npm run dev`) satisfying Constitution Principle I (independently runnable).

**Alternatives considered**:
- **Plain JavaScript**: Rejected — the hex coordinate math (neighbor offsets, contiguity detection, line traversal) benefits from type safety to catch off-by-one and parity errors at compile time.
- **React/Vue/Svelte**: Rejected — YAGNI (Constitution Principle V). A test app with a single page, a grid, and a few controls does not need a component framework. Vanilla TS + DOM manipulation is sufficient.
- **Canvas 2D**: Rejected for rendering — SVG provides native per-element click/hover events, which is ideal for the cell interaction model (click with modifier keys: Shift, Option). Canvas would require manual hit testing for hex shapes. For grids up to ~100 cells, SVG performance is adequate.

### Decision: Vitest for unit testing

**Rationale**: Vitest is TypeScript-native, fast, and integrates seamlessly with the Vite build system. It supports the same config and module resolution as the dev build. Constitution Principle II mandates TDD for game logic; Vitest is the lowest-friction choice for this stack.

**Alternatives considered**:
- **Jest**: Works but requires separate TypeScript transform config. Vitest shares Vite's config, reducing boilerplate.
- **Node built-in test runner**: Lacks TypeScript support without additional setup.

### Decision: SVG for hex rendering

**Rationale**: Each hex cell is an SVG `<polygon>` element. SVG gives us:
- Native DOM events per cell (click with modifier detection) — no manual hit testing needed.
- CSS styling for cell states (fill colors, hover effects).
- Text elements (`<text>`) for clue numbers, positioned at cell centers.
- Inspector-friendly debugging (each cell visible in browser DevTools).

For the test app's scale (1–100 cells), SVG DOM overhead is negligible. The 02-hex-shatter test app may need Canvas for fragment animation, but this app does not.

### Decision: No persistent storage

**Rationale**: Test grids are hardcoded in source. Random grids are generated on the fly. No save/load functionality is needed for a developer test app. State lives in memory only.

## Hex Geometry

### Coordinate system confirmed

The project's hex geometry documentation (`docs/visual/hex-geometry.md`) defines:
- Flat-top hexagons
- Offset column layout (even columns shifted down)
- Circumradius R, with column step = 1.5R and row step = R*sqrt(3)
- Six neighbor offsets varying by column parity (even vs odd)

This is the canonical reference for all coordinate math in this test app.

### Contiguity detection algorithm

To determine whether the filled neighbors of a cell form a contiguous group or are discontiguous:
1. Find all filled neighbors of the cell (up to 6).
2. If 0 or 1 filled neighbors: contiguity is not applicable (plain number).
3. Build an adjacency graph among the filled neighbors (two filled neighbors are adjacent if they are also neighbors of each other in the hex grid).
4. Run a connected components check on this subgraph.
5. If exactly 1 connected component: contiguous → display as `{n}`.
6. If 2+ connected components: discontiguous → display as `-n-`.

### Flower clue radius

The flower clue counts filled cells within a 2-hex radius (the 18 cells surrounding the center cell at distance 1 and 2). The center cell itself is not counted. This is documented in the project spec and matches Hexcells Infinite behavior.

### Line traversal

Lines follow three axes on a flat-top hex grid:
1. **Vertical**: Same column, varying row.
2. **Upper-left to lower-right (ascending-right diagonal)**: Step via the neighbor offset tables.
3. **Upper-right to lower-left (descending-right diagonal)**: Step via the neighbor offset tables.

For each axis at each edge position, a line clue counts the total filled cells along that line within the grid bounds.
