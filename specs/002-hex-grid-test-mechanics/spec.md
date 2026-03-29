# Feature Specification: Hex Grid Test App for Game Mechanics

**Feature Branch**: `002-hex-grid-test-mechanics`
**Created**: 2026-03-28
**Updated**: 2026-03-29
**Status**: Implemented
**Input**: User description: "I want to have an app that generates a test grid of hex cells that I can use to test clue computation and game mechanics. I want to be able to restart easily, and switch between test grids. I also want to be able to create a random grid of cells, that we will use as a basis for preconditioning the map to be solvable."

## Clarifications

### Session 2026-03-28

- Q: How should cell interactions be triggered (open, mark, toggle ground truth, re-cover)? → A: Click opens, right-click marks, Option+click toggles ground truth (empty↔filled), Option+right-click re-covers a cell.
- Q: Should grids start covered or revealed? → A: Start fully revealed (debug view). In the eventual game, only enough cells will be open/marked to make the puzzle solvable, but for now reveal everything. A "cover all" action is available for game-like testing.
- Q: Should random grid fill density be configurable? → A: Yes, configurable with a slider defaulting to ~33% filled. The method will change eventually but this is a good starting point.

### Session 2026-03-29

- Q: Cmd+right-click triggers macOS context menu. Alternative? → A: Use right-click for mark and Option+right-click for re-cover. Intercept `contextmenu` event with `preventDefault()`.
- Q: Should mistakes reveal the cell? → A: No. Mistakes (clicking a filled cell or marking an empty cell) increment the counter but the cell stays COVERED.
- Q: Should ground truth toggle update the visual state? → A: Yes. When toggling a revealed cell's ground truth, the visual state updates immediately (FILLED→OPEN_EMPTY, EMPTY→MARKED_FILLED). COVERED cells stay COVERED.
- Q: How should line clues handle gaps from missing cells? → A: Lines span gaps. One clue per diagonal lane, counting all filled cells regardless of missing cells in between.
- Q: How should line clue contiguity work? → A: Line clues show contiguity notation (`{n}`/`-n-`) based on whether filled cells form one unbroken run or are separated by gaps. Controlled by the same contiguity toggle as neighbor clues.
- Q: Should developers be able to toggle line clue visibility? → A: Yes. Four display states: invisible, visible, visible-with-line (guide line), dimmed. Controlled via click interactions on triangle hit areas in the missing cell space adjacent to each clue label.
- Q: How should guide lines appear? → A: 30% opaque white, 2px wide, extending from edge-to-edge of the first and last cells along the axis direction.
- Q: What should the hit area for line clue interactions be? → A: A triangle wedge inside the missing hex cell where the clue label sits, pointing toward the grid. Not overlapping any grid cell.
- Q: Should users be able to delete/restore hex cells? → A: Yes. Option+Shift+click toggles a cell between present and missing. Missing positions render invisible placeholder polygons so they can be clicked to restore.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Display a Predefined Test Grid (Priority: P1)

As a developer, I want to launch the test app and see a hex grid rendered from a predefined test configuration so that I can visually verify that the grid rendering, cell states, and clue display are working correctly.

**Why this priority**: Without a visible, correctly rendered hex grid, no other feature (clue computation, interaction, random generation) can be verified. This is the foundational capability everything else builds on.

**Independent Test**: Can be fully tested by launching the app and confirming a hex grid appears with cells in the correct positions, displaying the expected cell states (covered, empty, filled, missing) and clue numbers matching the test configuration.

**Acceptance Scenarios**:

1. **Given** the app is launched with a predefined test grid selected, **When** the grid loads, **Then** flat-top hexagonal cells are rendered in the correct offset-column positions in a fully revealed state — filled cells shown as blue with flower clues, empty cells shown as dark with neighbor clues, missing positions with invisible placeholder polygons.
2. **Given** the grid is displayed, **When** a cell has a neighbor clue, **Then** the clue number is displayed inside the cell using the correct notation (plain number, `{n}` for contiguous, `-n-` for discontiguous, `?` for no clue).
3. **Given** the grid is displayed, **When** a cell has a flower clue (filled cell with 2-hex-radius count), **Then** the flower clue value is displayed correctly on the cell.
4. **Given** the grid is displayed, **When** line clues are present, **Then** line clue values appear along the corresponding hex axes (vertical, upper-left-to-lower-right, upper-right-to-lower-left) with contiguity notation, positioned in the missing cell space adjacent to the grid edge.

---

### User Story 2 - Interact with Cells in Developer Sandbox Mode (Priority: P2)

As a developer, I want to interact with cells beyond normal game rules — opening, marking, re-covering, toggling ground truth, and toggling missing state — so that I can experiment with clue computation and game mechanics without being constrained by normal play flow.

**Why this priority**: The core purpose of this test app is to experiment with mechanics. Without interaction, the grid is view-only and cannot be used to test clue behavior dynamically. This is the key differentiator from a static display.

**Independent Test**: Can be tested by launching a grid and performing all interaction types on cells, verifying each produces the expected state change and that clues update in response.

**Acceptance Scenarios**:

1. **Given** a covered cell with ground truth EMPTY, **When** the user clicks it, **Then** the cell is opened and revealed as empty with its neighbor clue.
2. **Given** a covered cell with ground truth FILLED, **When** the user clicks it, **Then** the mistake counter increments and the cell stays COVERED (the player does not learn which cells are filled from mistakes).
3. **Given** a covered cell, **When** the user right-clicks it, **Then** the cell is marked as filled (blue) if ground truth is FILLED; if ground truth is EMPTY, the mistake counter increments and the cell stays COVERED.
4. **Given** any cell (covered, open, or marked), **When** the user Option+clicks it, **Then** the cell's ground truth toggles between empty and filled, the visual state updates to match the new ground truth (unless COVERED), and all affected clues (neighbor, flower, line) recompute and update on the grid immediately.
5. **Given** an open or marked cell, **When** the user Option+right-clicks it, **Then** the cell returns to the covered state.
6. **Given** any cell, **When** the user Option+Shift+clicks it, **Then** the cell is removed from the grid (made missing) or restored as an empty revealed cell if already missing. All surrounding clues recompute.
7. **Given** a cell whose ground truth was toggled, **When** examining neighboring cells' clues, **Then** all neighbor clues, flower clues, and line clues reflect the updated ground truth.

---

### User Story 3 - Toggle Contiguity Hint Notation (Priority: P3)

As a developer, I want to toggle contiguity hints on and off so that I can see how clues display with and without the `{n}` (contiguous) and `-n-` (discontiguous) notation.

**Why this priority**: Contiguity hints are a key differentiator in clue presentation. Being able to toggle them lets the developer verify both display modes and test whether clue computation handles the distinction correctly.

**Independent Test**: Can be tested by displaying a grid with contiguous/discontiguous clue situations, toggling the hint setting, and confirming the notation changes while the underlying number remains correct.

**Acceptance Scenarios**:

1. **Given** a grid with neighbor and line clues displayed, **When** contiguity hints are enabled (default), **Then** clues show `{n}` for contiguous groups and `-n-` for discontiguous groups where applicable.
2. **Given** contiguity hints are enabled, **When** the user toggles them off, **Then** all clues display as plain numbers only (no curly braces or dashes). `?` (NO_CLUE) always renders regardless of toggle state.
3. **Given** contiguity hints are off, **When** the user toggles them back on, **Then** the `{n}` and `-n-` notation reappears on applicable clues.

---

### User Story 4 - Switch Between Test Grids (Priority: P4)

As a developer, I want to choose from a selection of predefined test grids so that I can test different clue types, grid sizes, and edge cases without modifying code.

**Why this priority**: Multiple test grids are essential for covering different game mechanic scenarios (various clue types, grid sizes, boundary conditions). This enables systematic testing without rebuilding.

**Independent Test**: Can be tested by launching the app, selecting a different test grid from the available options, and confirming the display updates to show the newly selected grid configuration.

**Acceptance Scenarios**:

1. **Given** the app is running, **When** the user opens the grid selector, **Then** a list of available predefined test grids is shown with descriptive names.
2. **Given** a test grid is currently displayed, **When** the user selects a different test grid, **Then** the display replaces the current grid with the newly selected one.
3. **Given** the user selects a test grid, **When** the grid loads, **Then** the grid state is fully reset (no carried-over state from the previous grid), including line clue display states.

---

### User Story 5 - Restart the Current Grid (Priority: P5)

As a developer, I want to reset the current grid to its initial state so that I can re-test game mechanics from a clean starting point without re-selecting the grid.

**Why this priority**: Quick iteration is critical for testing. Being able to restart without navigating menus speeds up the development feedback loop significantly.

**Independent Test**: Can be tested by interacting with a grid (changing some cell states), then triggering restart and confirming all cells return to their initial state.

**Acceptance Scenarios**:

1. **Given** a grid is displayed and some cells have been interacted with, **When** the user triggers a restart, **Then** all cells return to the fully revealed initial state (filled cells as blue, empty cells as dark with clues). Clue values are preserved.
2. **Given** the user restarts the grid, **When** the grid reloads, **Then** any mistake counter or remaining counter resets to zero.

---

### User Story 6 - Generate a Random Grid (Priority: P6)

As a developer, I want to generate a random hex grid with a random assignment of filled vs. empty cells so that I can use this as a starting point for developing and testing the solvability preconditioning algorithm.

**Why this priority**: Random grid generation is the foundation for procedural puzzle generation. While not needed for basic mechanic testing, it is essential for the next phase of development (making puzzles solvable). It builds on the grid rendering from P1.

**Independent Test**: Can be tested by triggering random grid generation multiple times and confirming each produces a different grid layout with a valid distribution of filled and empty cells.

**Acceptance Scenarios**:

1. **Given** the user triggers random grid generation, **When** the grid is created, **Then** a hex grid of configurable dimensions is generated with cells randomly assigned as filled or empty, with no missing cells.
2. **Given** a random grid is generated, **When** the grid is displayed, **Then** all cells start in a fully revealed state (consistent with the debug default), showing the random filled/empty assignment and computed clues.
3. **Given** a random grid is generated, **When** clues are computed for the grid, **Then** each empty cell shows the correct neighbor clue based on the randomly assigned filled/empty pattern.
4. **Given** the user generates a random grid multiple times, **When** comparing results, **Then** each generation produces a different arrangement (non-deterministic by default).

---

### User Story 7 - Line Clue Display States (Priority: P7)

As a developer, I want to control the visibility of individual line clues — showing guide lines, dimming solved clues, and hiding irrelevant ones — so that I can focus on specific clues while testing and prototype the eventual game's clue management UX.

**Why this priority**: In the final game, not all line clues will be shown simultaneously. This feature lets the developer experiment with clue visibility and guide line overlays to inform the game's clue presentation design.

**Independent Test**: Can be tested by clicking on clue hit areas and verifying the clue transitions through all four states with correct visual feedback.

**Acceptance Scenarios**:

1. **Given** a visible line clue, **When** the user clicks its hit area, **Then** a 30% white guide line appears through the diagonal cells from edge to edge.
2. **Given** a visible-with-line clue, **When** the user clicks its hit area, **Then** the guide line disappears and the clue returns to visible.
3. **Given** a visible or visible-with-line clue, **When** the user right-clicks its hit area, **Then** the clue dims to 30% opacity and any guide line is removed.
4. **Given** a dimmed clue, **When** the user right-clicks its hit area, **Then** the clue returns to full visibility (without guide line).
5. **Given** any non-invisible clue, **When** the user Option-clicks its hit area, **Then** the clue becomes invisible and its previous state is saved.
6. **Given** an invisible clue, **When** the user Option-clicks its hit area, **Then** the clue is restored to its previously saved visibility state.

---

### Edge Cases

- What happens when a test grid configuration references cells outside the renderable area? The app should ignore out-of-bounds cells and display a warning.
- What happens when a random grid has zero filled cells or all filled cells? The app should still render and compute clues correctly (all clues would be 0, or all cells covered respectively).
- What happens when the user rapidly switches between grids? The app should cancel any in-progress grid loading and display only the most recently selected grid.
- What happens when the grid is very small (1-3 cells) or very large (100+ cells)? Both extremes should render correctly, with large grids scrollable or scaled to fit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render flat-top hexagonal cells in an offset-column layout matching the geometry defined in the project's hex geometry documentation.
- **FR-002**: System MUST support four cell visual states: covered (orange), marked filled (blue), open empty (dark), and missing hex (invisible placeholder polygon).
- **FR-003**: System MUST display neighbor clues inside open empty cells, supporting plain number, `{n}` contiguous, `-n-` discontiguous, and `?` (no clue) notations. All clue text MUST have `pointer-events: none`.
- **FR-004**: System MUST display flower clues on marked filled cells showing the count of filled cells within a 2-hex radius.
- **FR-005**: System MUST display line clues along the three hex axes (vertical, upper-left-to-lower-right, upper-right-to-lower-left). Each line clue counts filled cells along the entire diagonal lane, spanning any gaps from missing cells. Multiple clues MAY appear along the same diagonal wherever missing cells provide space to hold the clue label. Line clues MUST include contiguity notation.
- **FR-006**: System MUST include at least 3 predefined test grids covering: (a) basic neighbor clues, (b) flower clues, and (c) line clues.
- **FR-007**: System MUST provide a grid selector allowing the user to switch between available test grids.
- **FR-008**: System MUST provide a restart action that resets the current grid to its initial state, preserving clue values.
- **FR-009**: System MUST provide a random grid generator that creates a hex grid with cells randomly assigned as filled or empty, with no missing cells.
- **FR-010**: System MUST correctly compute neighbor clues for any given filled/empty cell arrangement.
- **FR-011**: System MUST correctly compute flower clues for any given filled/empty cell arrangement.
- **FR-012**: System MUST correctly compute line clues for any given filled/empty cell arrangement, spanning gaps in the grid.
- **FR-013**: The random grid generator MUST accept configurable grid dimensions (width and height in hex columns and rows).
- **FR-014**: The random grid generator MUST accept a configurable fill density (percentage of cells that are filled), defaulting to approximately 33%.
- **FR-015**: System MUST track and display the count of remaining unfound filled cells (the REMAINING counter).
- **FR-016**: System MUST track and display a mistake counter.
- **FR-017**: Clicking a covered cell MUST open it. If the cell's ground truth is empty, it reveals as open empty with its neighbor clue. If the cell's ground truth is filled, the mistake counter increments and the cell stays COVERED.
- **FR-018**: Right-clicking a covered cell MUST mark it as filled (blue) if ground truth is FILLED. If ground truth is EMPTY, the mistake counter increments and the cell stays COVERED. The macOS context menu MUST be suppressed via `preventDefault()`.
- **FR-019**: Option+clicking any cell MUST toggle its ground truth between empty and filled, update the visual state to match (unless COVERED), and immediately recompute and update all affected clues (neighbor, flower, and line).
- **FR-020**: Option+right-clicking an open or marked cell MUST return it to the covered state.
- **FR-021**: System MUST provide a toggle control for contiguity hint notation. When enabled, neighbor and line clues display `{n}` (contiguous) and `-n-` (discontiguous) where applicable. When disabled, all clues display as plain numbers. `?` (NO_CLUE) MUST always render regardless of toggle state.
- **FR-022**: Contiguity hint toggle MUST be enabled by default.
- **FR-023**: When a cell's ground truth is toggled (FR-019), clue recomputation MUST be immediate (same frame) with no perceptible delay.
- **FR-024**: Grids MUST load in a fully revealed state by default (all cells showing their true state and clues).
- **FR-025**: System MUST provide a "cover all" action that sets all cells to the covered state, enabling game-like testing from the revealed default.
- **FR-026**: Option+Shift+clicking any cell MUST toggle it between present and missing. Missing cells are removed from the grid; clicking a missing position restores it as an empty revealed cell. All surrounding clues MUST recompute.
- **FR-027**: Line clues MUST support four display states: invisible, visible, visible-with-line, and dimmed. Left-click on the hit area toggles the guide line. Right-click toggles dimmed. Option-click toggles invisible (saving/restoring previous state).
- **FR-028**: Line clue hit areas MUST be triangle-shaped wedges within the missing hex cell where the label sits, pointing toward the grid. Hit areas MUST NOT overlap grid cells.
- **FR-029**: Guide lines MUST be 30% opaque white, 2px wide, extending from edge-to-edge of the first and last cells along the axis direction.
- **FR-030**: Text selection MUST be disabled on the grid container to prevent accidental selection during gameplay.

### Key Entities

- **HexCell**: A single cell in the grid, identified by column and row coordinates. Has a ground-truth state (filled or empty), a player-visible state (covered, revealed, or marked), and optional clue values (neighbor, flower).
- **HexGrid**: A collection of HexCells arranged in an offset-column layout. Defines which positions contain cells and which are missing. Owns the computed clues for all cells and axes.
- **TestGridConfig**: A predefined arrangement of cells with their ground-truth states and grid dimensions, identified by a descriptive name. Used to produce a known HexGrid for testing.
- **LineClue**: A clue associated with a specific axis direction and position, indicating the count of filled cells along that line, with contiguity notation.
- **LineClueState**: View-layer state for a line clue's display: visibility mode and saved previous state for invisible toggle.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can launch the app and see a correctly rendered hex grid within 2 seconds.
- **SC-002**: A developer can switch between any two test grids within 1 second of selecting the new grid.
- **SC-003**: A developer can restart the current grid to a clean state with a single action (one click or keypress).
- **SC-004**: Clue computation produces correct values for 100% of cells across all predefined test grids (verifiable by comparing computed clues against hand-calculated expected values).
- **SC-005**: Random grid generation produces a visually distinct grid at least 95% of the time when generating grids of 20+ cells.
- **SC-006**: The app correctly renders grids ranging from 1 cell to at least 100 cells without visual glitches or layout errors.
- **SC-007**: All cell interactions (open, mark, toggle ground truth, re-cover, toggle missing) produce the correct state change with no perceptible delay.
- **SC-008**: Toggling a cell's ground truth updates all affected clues within the same visual frame.
- **SC-009**: Toggling contiguity hints instantly switches all clue displays between decorated and plain notation.
- **SC-010**: Line clue display state transitions (visible, guide line, dimmed, invisible) are immediate and visually correct.

## Assumptions

- The primary user of this test app is a developer working on the geomeditate project, not an end user playing the game.
- This test app lives in `test-apps/01-grid-mechanics/` and is a self-contained prototype that will not be integrated into the final game product.
- Cell interaction operates in a developer sandbox mode that intentionally allows actions outside normal game rules (re-covering cells, toggling ground truth, deleting cells). This is not meant to replicate final game interaction constraints.
- The random grid generator does not need to produce solvable puzzles; it only needs to produce a valid filled/empty assignment that clue computation can run against. Solvability preconditioning is a future feature that will build on this.
- Line clues cover all three natural hex axes as defined in the project's hex geometry documentation.
- The predefined test grids are hardcoded configurations shipped with the app, not user-editable files (for this iteration).
- The `?` (NO_CLUE) notation is supported for rendering and can be assigned to cells in predefined test grids, but the rules for when a cell receives a `?` clue are deferred to the eventual game — the test app only needs to render it correctly.
- The visual style follows the project's established design principles (dark background, orange/blue color scheme, flat-with-depth cells) but pixel-perfect fidelity to the final game aesthetic is not required for the test app.
- Crowded diagonal clue labels on dense grids are acceptable — the final game will have fewer simultaneous clues.
