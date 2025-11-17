<!--
SYNC IMPACT REPORT
==================
Version: 1.1.1 (Spelling correction)
Date: 2025-11-16
Previous Version: 1.1.0

Modified Principles:
- None (content unchanged)

Added Principles:
- None

Removed Sections:
- None

Templates Requiring Updates:
✅ plan-template.md (no changes needed)
✅ spec-template.md (no changes needed)
✅ tasks-template.md (no changes needed)

Follow-up TODOs: None

Version Bump Rationale: PATCH bump (1.1.0 → 1.1.1) - Corrected spelling of
project name from "GeoMeditate" to "Geomeditate" (title case). This is a
non-semantic wording correction that does not affect governance rules.

Version History:
- 1.1.1 (2025-11-16): Spelling correction (GeoMeditate → Geomeditate)
- 1.1.0 (2025-11-16): Added 4 new principles (VI-IX)
- 1.0.0 (2025-11-16): Initial ratification
-->

# Geomeditate Constitution

## Core Principles

### I. Forgiving Gameplay

**Rule**: Mistakes MUST be tracked but MUST NOT penalize progression or terminate the game.

**Implementation Requirements**:
- Game MUST continue after incorrect cell reveals
- Mistake counter MUST be visible but non-obstructive
- Player MUST be able to complete any puzzle regardless of mistake count
- No "game over" state from incorrect guesses
- UI MUST display mistakes in a neutral, informative manner (not punitive)

**Rationale**: This principle differentiates Geomeditate from traditional minesweeper games where mistakes are fatal. The focus is on learning, meditation, and puzzle-solving rather than perfection. Players should feel safe to experiment and learn from errors.

### II. Hexagonal Grid System

**Rule**: All game logic MUST be designed around hexagonal geometry and its unique properties.

**Implementation Requirements**:
- Grid MUST use hexagonal cells (not square)
- Neighbor detection MUST account for 6 adjacent cells per hexagon
- Coordinate system MUST be consistent (use axial, cube, or offset coordinates)
- Rendering MUST preserve hexagonal proportions and spacing
- Puzzle generation algorithms MUST respect hexagonal topology.
- The game must save the current puzzle state between sessions, so that the player can return to it later.
- The game grid consists of unmarked, marked, and open cells. Cells can be either mined or unmined.
- Cells can have hints associated with them:
  - For unmined cells: 
    - The character "?" or an empty hint means there is no hint associated with this cell.
    - A simple number from 0 to 6 reveals the number of mined cells adjacent to the open cell.
    - A number wrapped in dashes ("-2-" through "-5-") means that there are that many mined cells adjacent to the tapped cell, and the mined cells are not contiguous around to the tapped cell.
    - A number wrapped in curly braces ("{2}" through "{6}") means that there are that many mined cells adjacent to the tapped cell, and the mines cells are contiguous/joined together around the tapped cell.
  - For mined but marked cells, the presence of a hint turns it into a "flower":
    - The hint on a flower contains the number of mined cells within a 2-hex radius of the tapped cell.
    - The original Hexcells Infinite did not use dash or curly brace notation in flower hints. Only simple-number hints should be used on flowers unless changed in a subsequent feature.
- A player can only mark or open a cell.
- If the player opens an unmined cell, the cell becomes open and any hint associated with the cell is displayed.
- If the player marks an unmined cell, the cell becomes marked and any hint associated with the cell is displayed.
- If the player attempts to open a mined cell, the cell remains unmarked and a mistake is registered. 
- If the player attempts to mark an unmined cell, the cell remains unmarked and a mistake is registered.
- The exact definition of tutorial vs. easy vs. hard mode will be made in the spec, but generally, hard puzzles incorporate more complex, sometimes interlocking hints in a way that easy mode will not.

**Rationale**: Hexagonal grids provide unique puzzle-solving challenges distinct from square grids. The 6-neighbor system creates different pattern recognition opportunities and requires specialized algorithms for distance, pathfinding, and neighbor detection.

### III. Progressive Disclosure

**Rule**: Game mechanics and complexity MUST be introduced gradually through carefully designed difficulty progression.

**Implementation Requirements**:
- Tutorial levels MUST introduce one concept at a time, but ultimately ramp up from easiest to hardest.
- Early puzzles MUST use basic number clues only
- Advanced mechanics (column clues, negative space hints) MUST appear only after basics are mastered
- Difficulty ramp MUST be measurable and configurable
- Player MUST be able to revisit easier difficulty levels

**Rationale**: Puzzle games succeed when players build mastery incrementally. Overwhelming new players with complex mechanics creates frustration. Progressive disclosure ensures accessibility while preserving depth for experienced players.

### IV. Deterministic Puzzles

**Rule**: Every puzzle MUST have exactly one solution that can be reached through pure logic without guessing.

**Implementation Requirements**:
- Puzzle generator MUST generate the same deterministic, solvable puzzle for each puzzle code at any given difficulty level.
- Puzzle generator MUST verify single-solution property before presenting to player.
- No ambiguous states where multiple valid solutions exist, though one puzzle technique in "hard" mode involves an interaction between unmarked cells and the count of remaining mined cells.
- All clues (pre-marked and/or pre-opened cells) MUST be sufficient to deduce the full solution
- Solver algorithm MUST exist to validate puzzle solvability
- Random generation MUST be seeded for reproducibility

**Rationale**: Fair puzzle design requires that skill and logic always lead to the solution. Requiring guessing creates frustration and undermines the meditative aspect. Deterministic puzzles build player confidence and trust in the game.

### V. Minimalist UI

**Rule**: User interface MUST prioritize the puzzle itself, minimizing distractions and visual clutter.

**Implementation Requirements**:
- Controls MUST be intuitive with minimal on-screen instructions
- Color palette MUST be calming and accessible (consider color-blind users)
- Animations MUST be smooth but optional (allow disable for focus)
- Sound effects MUST be subtle and toggleable
- UI chrome (menus, stats) MUST be collapsible or auto-hiding
- No advertisements, popups, or interruptions during puzzle solving

**Rationale**: The "meditate" in Geomeditate emphasizes calm, focused engagement. Visual noise disrupts flow state and contradicts the contemplative experience. Minimalism also improves performance and accessibility.

### VI. Responsiveness

**Rule**: User interactions MUST receive immediate visual and/or audio feedback with consistent, predictable timing.

**Implementation Requirements**:
- UI MUST respond to input within 100ms (perceived as instant)
- Hover states MUST activate within one frame (16ms at 60fps)
- Click/tap feedback MUST be visible before action completes
- Loading states MUST appear if operations exceed 200ms
- No blocking operations on the main/UI thread
- Touch targets MUST be appropriately sized (minimum 44x44 points)

**Rationale**: Responsiveness builds trust and confidence in the interface. Delayed feedback creates uncertainty and frustration, breaking the meditative flow. Immediate response to input is essential for maintaining engagement and creating a sense of direct manipulation.

### VII. Audio-Visual Synchronization

**Rule**: Sound effects and visual animations MUST be precisely synchronized to maintain immersion and polish.

**Implementation Requirements**:
- Audio cues MUST trigger within 16ms of corresponding visual events
- Animation duration MUST match audio duration for paired effects
- Cell reveal sounds MUST align with reveal animation completion
- Mistake feedback audio MUST sync with visual mistake indicator
- Background audio (if any) MUST not conflict with interaction sounds
- Platform audio latency MUST be measured and compensated for

**Rationale**: Desynchronized audio-visual feedback feels amateurish and breaks immersion. Precise timing reinforces the connection between player action and game response, enhancing the satisfying "juice" of interaction. This is especially important for a meditative experience where subtle details matter.

### VIII. Smooth User Experience

**Rule**: All transitions, animations, and state changes MUST be smooth with no jarring interruptions or sudden changes.

**Implementation Requirements**:
- Animations MUST use appropriate easing functions (no linear motion for UI)
- State transitions MUST be animated (fade, slide, scale) not instant
- Frame rate MUST remain consistent during transitions (no stuttering)
- Navigation MUST preserve context (where am I, where did I come from)
- Errors MUST be presented gracefully, not as modal blocks
- Difficulty changes MUST be gradual, not sudden spikes

**Rationale**: Jarring transitions and abrupt changes disrupt the calm, meditative state. Smoothness creates a feeling of quality and care. Consistent, predictable motion helps players build mental models of the interface, reducing cognitive load and maintaining flow.

### IX. Configurability

**Rule**: Players MUST be able to customize their experience according to personal preferences and needs.

**Implementation Requirements**:
- Settings MUST persist across sessions
- Audio levels MUST be independently adjustable (music, SFX, or mute)
- Animation speed/effects MUST be adjustable or toggleable
- Color schemes MUST include alternatives (dark mode, high contrast, color-blind modes)
- Difficulty level MUST be selectable and changeable
- Input methods MUST support multiple options (mouse, keyboard, touch)
- Accessibility features MUST be easily discoverable in settings

**Rationale**: Players have different needs, preferences, and abilities. Configurability ensures accessibility and comfort for diverse audiences. What creates a meditative experience varies by individual—some prefer sound, others silence; some like animations, others find them distracting. Respecting player autonomy enhances satisfaction and inclusivity.

## Quality Standards

**Testing Requirements**:
- Puzzle generator MUST have unit tests for single-solution verification
- Hexagonal coordinate system MUST have comprehensive unit tests
- User interaction flows MUST have integration tests
- Performance tests MUST verify smooth rendering at target grid sizes
- Accessibility tests MUST verify color-blind compatible visuals

**Performance Benchmarks**:
- Puzzle generation MUST complete in <500ms for typical puzzles
- UI MUST maintain 60fps during interactions
- Game MUST run smoothly on mid-range devices (3-year-old hardware)

**Accessibility Requirements**:
- MUST support keyboard-only navigation
- MUST provide color-blind friendly palettes
- Text MUST be readable at minimum size standards
- MUST support screen reader hints for critical UI elements

## Development Workflow

**Feature Development**:
1. All new features MUST start with a specification in `/specs/[###-feature-name]/spec.md`
2. Specifications MUST include user stories with priorities (P1, P2, P3...)
3. Each user story MUST be independently testable
4. Implementation plan MUST verify constitution compliance before coding begins

**Constitution Compliance**:
- Before implementation, verify feature aligns with all 9 core principles
- Document any conflicts or tension between principles
- Justify complexity only when simpler alternatives violate core principles
- Code reviews MUST check principle adherence

**Quality Gates**:
- All puzzle-generation code MUST include single-solution verification
- UI changes MUST be tested for minimalism (remove unnecessary elements)
- Gameplay changes MUST preserve forgiving nature (mistakes never fatal)
- Performance tests MUST pass before merging

**Iteration Rhythm**:
- Prioritize P1 user stories to MVP first
- Each user story delivers independently testable value
- Collect player feedback after each story deployment
- Iterate on difficulty progression based on real player data

## Governance

This constitution defines the non-negotiable principles for Geomeditate development. All design decisions, feature additions, and implementation choices MUST align with these principles.

**Amendment Process**:
1. Proposed amendments MUST be documented with rationale
2. Amendment impact on existing features MUST be assessed
3. Version number MUST be incremented per semantic versioning:
   - **MAJOR**: Principle removal or incompatible redefinition
   - **MINOR**: New principle added or substantial expansion
   - **PATCH**: Clarifications, wording improvements, non-semantic changes
4. Migration plan MUST be created for constitution changes affecting code

**Compliance Review**:
- All pull requests MUST verify constitution alignment
- Plan documents MUST include "Constitution Check" section
- Complexity MUST be justified against simpler alternatives
- Any principle violation MUST be explicitly documented with rationale

**Conflict Resolution**:
- When principles conflict, prioritize in order: I → II → III → IV → V → VI → VII → VIII → IX
- Document trade-offs and chosen resolution
- Consider if conflict indicates missing or unclear principle

**Version**: 1.1.1 | **Ratified**: 2025-11-16 | **Last Amended**: 2025-11-16
