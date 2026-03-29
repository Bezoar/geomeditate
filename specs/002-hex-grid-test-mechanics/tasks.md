# Tasks: Hex Grid Test App for Game Mechanics

**Input**: Design documents from `/specs/002-hex-grid-test-mechanics/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Required per Constitution Principle II (TDD for all game logic). UI rendering exempt.

**Organization**: Tasks grouped by user story. All `model/` and `clues/` code follows TDD (test first, then implement).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US6)
- All paths relative to `test-apps/01-grid-mechanics/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding, build system, test runner

- [x] T001 Initialize project: create `test-apps/01-grid-mechanics/package.json` with vite, vitest, and typescript dependencies
- [x] T002 Create `test-apps/01-grid-mechanics/tsconfig.json` with strict mode enabled
- [x] T003 Create `test-apps/01-grid-mechanics/vite.config.ts` with Vitest integration and coverage configuration
- [x] T004 Create `test-apps/01-grid-mechanics/index.html` with SVG container element and control panel placeholder
- [x] T005 Create directory structure: `src/model/`, `src/clues/`, `src/grids/`, `src/view/`, `tests/`
- [ ] T006 Verify setup: `npm install`, `npm run dev` launches, `npm test` runs with zero tests passing

**Checkpoint**: Project builds, dev server starts, test runner works

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and hex coordinate math that ALL user stories depend on

**TDD**: Tests first, then implementation

### Tests

- [x] T007 [P] Write tests for HexCoord neighbor offsets (even/odd column parity, all 6 directions, edge positions) in `tests/hex-coord.test.ts`
- [x] T008 [P] Write tests for HexCoord line traversal (vertical, ascending-right, descending-right axes) in `tests/hex-coord.test.ts`
- [x] T009 [P] Write tests for HexCoord 2-hex-radius positions (18 surrounding cells, boundary handling) in `tests/hex-coord.test.ts`
- [x] T010 [P] Write tests for HexCoord pixel conversion (cell-to-pixel for flat-top offset-column layout) in `tests/hex-coord.test.ts`
- [x] T011 [P] Write tests for HexCell state transitions (covered→open, covered→marked, open/marked→covered via re-cover, ground truth toggle) in `tests/hex-cell.test.ts`

### Implementation

- [x] T012 Implement HexCoord type, `neighbors()`, `lineAlongAxis()`, `radius2Positions()`, and `toPixel()` in `src/model/hex-coord.ts`
- [x] T013 Implement CellGroundTruth, CellVisualState, ClueNotation enums and HexCell type with state transition functions in `src/model/hex-cell.ts`
- [ ] T014 Verify all foundational tests pass with 100% branch coverage

**Checkpoint**: Foundation ready — all coordinate math and cell types tested and passing

---

## Phase 3: User Story 1 — Display a Predefined Test Grid (Priority: P1) MVP

**Goal**: Launch the app and see a correctly rendered hex grid with all clue types (neighbor, flower, line) displayed in fully revealed state.

**Independent Test**: Launch app, confirm hex grid renders with correct cell positions, colors, and clue numbers matching a known test configuration.

### Tests for US1

> **Write tests FIRST, ensure they FAIL before implementation**

- [ ] T015 [P] [US1] Write tests for neighbor clue computation (count filled neighbors for cells with 0-6 filled neighbors, boundary cells with fewer than 6 neighbors) in `tests/neighbor.test.ts`
- [ ] T016 [US1] Write tests for contiguity detection (single filled neighbor, all contiguous, split into 2+ groups, edge cases: 0 neighbors, 1 neighbor) in `tests/neighbor.test.ts`
- [ ] T017 [P] [US1] Write tests for flower clue computation (filled cells at various positions, boundary cells with fewer than 18 radius-2 positions, 0 filled in radius) in `tests/flower.test.ts`
- [ ] T018 [P] [US1] Write tests for line clue computation (vertical lines, ascending-right diagonals, descending-right diagonals, lines with gaps from missing cells) in `tests/line.test.ts`
- [ ] T019 [P] [US1] Write tests for HexGrid construction from TestGridConfig (cell map creation, missing positions excluded, remaining counter) in `tests/hex-grid.test.ts`
- [ ] T020 [P] [US1] Write tests for HexGrid full clue recomputation (all neighbor, flower, and line clues correct after `computeAllClues()`) in `tests/hex-grid.test.ts`

### Implementation for US1

- [ ] T021 [P] [US1] Implement neighbor clue computation and contiguity detection in `src/clues/neighbor.ts`
- [ ] T022 [P] [US1] Implement flower clue computation (2-hex-radius filled count) in `src/clues/flower.ts`
- [ ] T023 [P] [US1] Implement line clue computation (3 axes) in `src/clues/line.ts`
- [ ] T024 [US1] Implement HexGrid (cell map, `computeAllClues()` orchestration, remaining counter, mistake counter) in `src/model/hex-grid.ts`
- [ ] T025 [US1] Create at least 3 predefined TestGridConfig instances in `src/grids/test-grids.ts`: (a) basic neighbor clues grid, (b) flower clues grid, (c) line clues grid. Include at least one small grid (3 cells) and one large grid (50+ cells) to verify SC-006 scale rendering. At least one grid should include a cell with `?` (NO_CLUE) notation to verify rendering of hidden clues.
- [ ] T026 [US1] Implement SVG hex grid renderer (flat-top polygon generation, cell-to-pixel positioning, cell state coloring per design principles) in `src/view/grid-renderer.ts`
- [ ] T027 [US1] Implement clue text renderer (neighbor clues inside empty cells, flower clues on filled cells, line clues along axes, notation formatting) in `src/view/clue-renderer.ts`
- [ ] T028 [US1] Wire up `src/main.ts`: load first test grid, create HexGrid, compute clues, render SVG in fully revealed state
- [ ] T029 [US1] Verify all US1 tests pass with 100% branch coverage on `src/model/hex-grid.ts`, `src/clues/*.ts`

**Checkpoint**: App launches, displays a hex grid with correct neighbor/flower/line clues. Manual playability validation.

---

## Phase 4: User Story 2 — Interact with Cells in Developer Sandbox Mode (Priority: P2)

**Goal**: Click opens, Shift+click marks, Option+click toggles ground truth (with live clue recomputation), Shift+Option+click re-covers.

**Independent Test**: Click cells with various modifier combinations; verify state changes and clue updates.

**Depends on**: US1 (needs rendered grid)

### Tests for US2

- [ ] T030 [P] [US2] Write tests for HexGrid.openCell() (open covered cell → OPEN_EMPTY if empty / MARKED_FILLED if filled, no-op on non-covered) in `tests/hex-grid.test.ts`
- [ ] T031 [P] [US2] Write tests for HexGrid.markCell() (mark covered cell → MARKED_FILLED, no-op on non-covered) in `tests/hex-grid.test.ts`
- [ ] T032 [P] [US2] Write tests for HexGrid.toggleGroundTruth() (FILLED↔EMPTY, triggers clue recomputation for affected cells, updates remaining counter) in `tests/hex-grid.test.ts`
- [ ] T033 [P] [US2] Write tests for HexGrid.recoverCell() (open/marked → COVERED, no-op on already covered) in `tests/hex-grid.test.ts`
- [ ] T034 [P] [US2] Write tests for mistake detection (click on filled cell increments mistake counter and reveals as filled, Shift+click on empty cell increments mistake counter and marks as filled, correct actions do not increment) in `tests/hex-grid.test.ts`

### Implementation for US2

- [ ] T035 [US2] Implement `openCell()`, `markCell()`, `toggleGroundTruth()`, `recoverCell()` methods on HexGrid in `src/model/hex-grid.ts`
- [ ] T036 [US2] Implement targeted clue recomputation in `toggleGroundTruth()` (recompute only affected neighbors, radius-2 cells, and lines per data-model.md computation dependencies) in `src/model/hex-grid.ts`
- [ ] T037 [US2] Wire click event handlers with modifier detection on SVG hex elements (click → open, Shift+click → mark, Option+click → toggle ground truth, Shift+Option+click → re-cover) in `src/view/grid-renderer.ts`
- [ ] T038 [US2] Update SVG rendering after each interaction (re-render affected cells and clues, update remaining counter display) in `src/view/grid-renderer.ts`
- [ ] T039 [US2] Verify all US2 tests pass with 100% branch coverage on new HexGrid methods

**Checkpoint**: All four interaction types work. Ground truth toggle recomputes clues within same frame.

---

## Phase 5: User Story 3 — Toggle Contiguity Hint Notation (Priority: P3)

**Goal**: Toggle between `{n}`/`-n-` decorated notation and plain number display.

**Independent Test**: Display grid with contiguous/discontiguous clue situations, toggle, verify notation changes.

**Depends on**: US1 (needs clues displayed)

### Tests for US3

- [ ] T040 [US3] Write tests for clue notation formatting: plain number, `{n}` contiguous, `-n-` discontiguous, `?` no-clue (verify `?` renders regardless of contiguity toggle state), and plain-only mode (contiguity disabled) in `tests/neighbor.test.ts`

### Implementation for US3

- [ ] T041 [US3] Add contiguity toggle state to app and notation formatting function (enabled → decorated, disabled → plain numbers) in `src/clues/neighbor.ts`
- [ ] T042 [US3] Implement contiguity toggle UI control in `src/view/controls.ts`
- [ ] T043 [US3] Wire toggle to re-render all clue text elements via clue-renderer in `src/main.ts`
- [ ] T044 [US3] Verify US3 tests pass with 100% branch coverage on notation formatting

**Checkpoint**: Contiguity toggle switches all clue displays instantly.

---

## Phase 6: User Story 4 — Switch Between Test Grids (Priority: P4)

**Goal**: Select from a dropdown of predefined test grids; switching replaces the current grid entirely.

**Independent Test**: Select different grids from dropdown, verify display updates with correct cells and clues each time.

**Depends on**: US1 (needs grid rendering), benefits from US2/US3 being complete

### Implementation for US4

- [ ] T045 [US4] Implement grid selector dropdown populated from test-grids registry in `src/view/controls.ts`
- [ ] T046 [US4] Wire grid selector to full grid replacement: create new HexGrid from selected TestGridConfig, recompute clues, re-render SVG in `src/main.ts`
- [ ] T047 [US4] Ensure grid switch resets all state (no carried-over visual states, counters reset to zero)

**Checkpoint**: Switching between any two grids works within 1 second with fully correct display.

---

## Phase 7: User Story 5 — Restart the Current Grid (Priority: P5)

**Goal**: One-action reset to initial revealed state. Also "cover all" action for game-like testing.

**Independent Test**: Interact with cells, restart, verify all cells return to initial state.

**Depends on**: US1 (needs grid), US2 (needs interaction to dirty the state)

### Tests for US5

- [ ] T048 [US5] Write tests for `restart()` and `coverAll()` (verify visual states reset, counters reset, cover-all sets all to COVERED) in `tests/hex-grid.test.ts`

### Implementation for US5

- [ ] T049 [US5] Implement `restart()` method on HexGrid (reset all visual states to initial revealed state, reset counters) in `src/model/hex-grid.ts`
- [ ] T050 [US5] Implement `coverAll()` method on HexGrid (set all cells to COVERED) in `src/model/hex-grid.ts`
- [ ] T051 [US5] Add Restart and Cover All buttons in `src/view/controls.ts`
- [ ] T052 [US5] Wire buttons to HexGrid methods and SVG re-render in `src/main.ts`

**Checkpoint**: Restart returns grid to revealed state. Cover All sets all cells to covered.

---

## Phase 8: User Story 6 — Generate a Random Grid (Priority: P6)

**Goal**: Generate a random hex grid with configurable dimensions and fill density (~33% default).

**Independent Test**: Generate random grids multiple times, verify different arrangements with correct clues.

**Depends on**: US1 (needs grid rendering and clue computation)

### Tests for US6

- [ ] T053 [P] [US6] Write tests for random grid generator: respects dimensions, respects fill density, produces non-deterministic output, edge cases (0% density, 100% density, 1-cell grid, all-filled grid computes correct zero-count clues, all-empty grid computes correct clues) in `tests/random-grid.test.ts`

### Implementation for US6

- [ ] T054 [US6] Implement random grid generator (accept width, height, fill density; return TestGridConfig with randomly assigned filled/empty cells) in `src/grids/random-grid.ts`
- [ ] T055 [US6] Add random grid controls: dimension inputs (width/height), fill density slider (default ~33%), generate button in `src/view/controls.ts`
- [ ] T056 [US6] Wire generate button to create random TestGridConfig, build HexGrid, compute clues, render SVG in `src/main.ts`
- [ ] T057 [US6] Verify US6 tests pass with 100% branch coverage on `src/grids/random-grid.ts`

**Checkpoint**: Random grid generation produces different valid grids with correct clues each time.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories

- [ ] T058 Run full test suite with coverage report; verify 100% branch coverage on all `src/model/` and `src/clues/` files
- [ ] T059 Manual playability validation: test all 6 user stories end-to-end in browser
- [ ] T060 Verify quickstart.md instructions work from scratch (`npm install`, `npm run dev`, `npm test`)
- [ ] T061 Document any coverage exceptions in `docs/tracking/test-coverage-exceptions.md` (if needed)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — this is the MVP
- **US2 (Phase 4)**: Depends on US1 (needs rendered grid to interact with)
- **US3 (Phase 5)**: Depends on US1 (needs clues to toggle notation)
- **US4 (Phase 6)**: Depends on US1 (needs grid rendering); benefits from US2/US3
- **US5 (Phase 7)**: Depends on US1 + US2 (needs interaction to dirty state for restart testing)
- **US6 (Phase 8)**: Depends on US1 (needs grid rendering + clue computation)
- **Polish (Phase 9)**: Depends on all phases complete

### User Story Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundation) → Phase 3 (US1 - MVP)
                                              │
                                              ├── Phase 4 (US2 - Interactions)
                                              │       │
                                              │       └── Phase 7 (US5 - Restart)
                                              │
                                              ├── Phase 5 (US3 - Contiguity Toggle)
                                              ├── Phase 6 (US4 - Grid Switching)
                                              └── Phase 8 (US6 - Random Grid)
```

### Parallel Opportunities

After US1 is complete, these can proceed in parallel:
- US3 (contiguity toggle) — independent UI control + notation logic
- US4 (grid switching) — independent UI control + grid loading
- US6 (random grid) — independent generator + UI controls

US2 (interactions) should complete before US5 (restart) since restart is most useful after interactions.

### Within Each User Story (TDD Order)

1. Write tests → verify they fail
2. Implement model/logic code
3. Implement view/UI code
4. Verify tests pass with coverage
5. Manual playability validation

---

## Parallel Example: US1 Clue Computation

```
# These test files can be written in parallel (different files):
T015: tests/neighbor.test.ts
T016: tests/neighbor.test.ts (contiguity section)
T017: tests/flower.test.ts
T018: tests/line.test.ts
T019: tests/hex-grid.test.ts (construction)
T020: tests/hex-grid.test.ts (clue recomputation)

# These implementations can be written in parallel (different files):
T021: src/clues/neighbor.ts
T022: src/clues/flower.ts
T023: src/clues/line.ts
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (hex-coord + hex-cell)
3. Complete Phase 3: US1 (clue computation + rendering + test grids)
4. **STOP and VALIDATE**: Launch app, verify grid renders with correct clues
5. This is a useful tool even without interaction

### Incremental Delivery

1. Setup + Foundation → project compiles and tests run
2. US1 → viewable hex grid with clues (MVP)
3. US2 → interactive sandbox (core value add)
4. US3 → contiguity toggle (debug feature)
5. US4 → grid switching (testing convenience)
6. US5 → restart/cover all (iteration speed)
7. US6 → random grid generation (future solvability work)

Each increment is independently useful and testable.

---

## Notes

- TDD is mandatory per Constitution Principle II. Tests for game logic MUST be written before implementation.
- UI rendering code (`src/view/`) is exempt from unit test coverage per constitution. Validated by manual playability.
- All paths are relative to `test-apps/01-grid-mechanics/`.
- Commit after each task or logical group.
- Stop at any checkpoint to validate the story independently.
