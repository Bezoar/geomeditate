# Implementation Plan: Hex Grid Test App for Game Mechanics

**Branch**: `002-hex-grid-test-mechanics` | **Date**: 2026-03-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-hex-grid-test-mechanics/spec.md`

## Summary

Build a self-contained browser test app (`test-apps/01-grid-mechanics/`) that renders a flat-top hex grid with full clue computation (neighbor, flower, line), developer sandbox interactions (open, mark, re-cover, toggle ground truth), predefined test grids, a random grid generator, and a contiguity hint toggle. The app uses TypeScript + Vite for the build system, SVG for hex rendering, and Vitest for unit testing.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Vite 6.x (build/dev server), no UI framework
**Storage**: N/A (all state in memory; test grids hardcoded in source)
**Testing**: Vitest (unit tests for all game logic; 100% branch coverage per constitution)
**Target Platform**: Modern desktop browser (Chrome/Firefox/Safari), macOS primary
**Project Type**: Single-page web app (developer test tool)
**Performance Goals**: Same-frame clue recomputation on ground truth toggle (FR-023, Constitution Principle VI)
**Constraints**: Grids up to 100 cells must render without layout issues; no external dependencies beyond Vite/Vitest
**Scale/Scope**: Single page, 6 user stories, ~15 source files, ~7 test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-App-First | PASS | This IS a test app under `test-apps/01-grid-mechanics/`. Independently runnable via `npm run dev`. Single concern: grid mechanics and clue computation. |
| II. TDD | PASS | All game logic (hex-coord, hex-cell, hex-grid, neighbor/flower/line clue computation, random grid) will be developed test-first with Vitest. UI rendering is exempt per constitution but will have manual playability validation. |
| III. Incremental Integration | N/A | This is a test app, not a main game integration. No previously-untested technology being integrated. |
| IV. Playability at Every Milestone | PASS | App will be launchable and interactable at every milestone. Revealed-by-default view ensures immediate visual feedback. |
| V. Simplicity (YAGNI) | PASS | No UI framework. No persistent storage. No build complexity beyond Vite. SVG chosen over Canvas for simpler hit testing. Vanilla TS + DOM. |
| VI. Responsiveness / Low Latency | PASS | Clue recomputation targets same-frame response (FR-021). SVG re-renders are synchronous DOM updates. For grids up to 100 cells the computation is O(cells) which is sub-millisecond. |
| Test Coverage | PASS | 100% branch coverage required for all game logic. Coverage exceptions (if any) will be documented in `docs/tracking/test-coverage-exceptions.md`. |

**Gate result**: PASS — no violations. Complexity Tracking table not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-hex-grid-test-mechanics/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: technology decisions
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: setup and usage guide
└── tasks.md             # Phase 2: implementation tasks (via /speckit.tasks)
```

### Source Code (repository root)

```text
test-apps/01-grid-mechanics/
├── index.html                  # Entry HTML with SVG container and controls
├── package.json                # Dependencies: vite, vitest, typescript
├── tsconfig.json               # Strict TypeScript config
├── vite.config.ts              # Vite config with Vitest integration
├── src/
│   ├── main.ts                 # App bootstrap: wire events, load initial grid
│   ├── model/
│   │   ├── hex-coord.ts        # HexCoord type, neighbor offsets, line traversal, 2-hex-radius positions
│   │   ├── hex-cell.ts         # HexCell type, CellGroundTruth, CellVisualState, state transitions
│   │   └── hex-grid.ts         # HexGrid: cell map, clue recomputation orchestration, remaining/mistake counters
│   ├── clues/
│   │   ├── neighbor.ts         # Neighbor clue: count filled neighbors, contiguity detection
│   │   ├── flower.ts           # Flower clue: count filled cells in 2-hex radius
│   │   └── line.ts             # Line clue: count filled cells along 3 axes
│   ├── grids/
│   │   ├── test-grids.ts       # Predefined TestGridConfig instances (>=3 grids)
│   │   └── random-grid.ts      # Random grid generator with configurable dimensions and fill density
│   └── view/
│       ├── grid-renderer.ts    # SVG rendering: hex polygons, cell coloring, positioning
│       ├── clue-renderer.ts    # SVG text elements for clue display, notation toggle logic
│       └── controls.ts         # DOM controls: grid selector, restart, cover all, contiguity toggle, density slider
└── tests/
    ├── hex-coord.test.ts       # Neighbor offsets, line traversal, radius-2 positions
    ├── hex-cell.test.ts        # State transitions, ground truth toggle
    ├── hex-grid.test.ts        # Grid construction, remaining counter, clue recomputation orchestration
    ├── neighbor.test.ts        # Neighbor count, contiguity detection (contiguous, discontiguous, edge cases)
    ├── flower.test.ts          # Flower clue for various arrangements
    ├── line.test.ts            # Line clue along all 3 axes
    └── random-grid.test.ts     # Dimension/density validation, non-determinism
```

**Structure Decision**: Single flat project under `test-apps/01-grid-mechanics/` with `src/` for source and `tests/` at the top level. The `model/` directory contains pure game logic (fully testable, no DOM). The `clues/` directory isolates each clue algorithm. The `view/` directory handles SVG rendering and DOM controls (exempt from unit coverage per constitution; validated by manual playability). The `grids/` directory contains test data and generation logic.

## Complexity Tracking

> No violations detected. Table not needed.

## Post-Design Constitution Re-Check

| Principle | Status | Delta from pre-research |
|-----------|--------|------------------------|
| I. Test-App-First | PASS | No change |
| II. TDD | PASS | No change — Vitest confirmed as test runner |
| III. Incremental Integration | N/A | No change |
| IV. Playability at Every Milestone | PASS | No change |
| V. Simplicity (YAGNI) | PASS | No change — zero frameworks, minimal dependencies |
| VI. Responsiveness / Low Latency | PASS | No change — SVG DOM updates are synchronous, clue computation is O(n) for n cells |
| Test Coverage | PASS | No change — all `model/` and `clues/` code covered; `view/` exempt |
