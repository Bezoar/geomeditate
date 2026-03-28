<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Modified principles: none
Added sections:
  - Core Principles: added VI. Responsiveness / Low Latency
  - Development Workflow: added Test Coverage Requirements subsection
Templates reviewed:
  - .specify/templates/plan-template.md       ✅ Constitution Check section aligns (update "five principles" refs if present)
  - .specify/templates/spec-template.md       ✅ No conflicting constraints
  - .specify/templates/tasks-template.md      ✅ Phase/task structure compatible
  - .specify/templates/constitution-template.md ✅ Source template
Deferred TODOs: none
-->

# geomeditate Constitution

## Core Principles

### I. Test-App-First Development

Every technology, rendering technique, or game mechanic MUST be validated in a
self-contained test application before being introduced into the main game codebase.
Test applications MUST be:
- Independently runnable with a single command.
- Scoped to a single technology or mechanic (no bundling of concerns).
- Retained in the repository under `test-apps/` as permanent reference material.

**Rationale**: Isolating unknowns in throwaway contexts prevents coupling
unproven code into the core game loop, where rework is expensive.

### II. Test-Driven Development (TDD)

All game logic and library code MUST follow the Red-Green-Refactor cycle:
1. Write a failing test that specifies the expected behavior.
2. Obtain user or peer approval of the test before writing implementation code.
3. Write the minimum implementation to make the test pass.
4. Refactor without changing behavior; tests MUST remain green.

UI rendering code is exempt from this requirement but MUST have at least one
manual playability validation before being merged.

**Rationale**: The hexagonal coordinate math and mine-probability logic are
non-trivial; tests catch regressions when the two systems are combined.

### III. Incremental Integration

Technologies developed in test applications MUST be integrated into the main
game one at a time. No feature branch MAY introduce more than one
previously-untested technology. After each integration the game MUST be
playable end-to-end (even if incomplete) before the next integration begins.

**Rationale**: Simultaneous integration of multiple new systems makes root-cause
analysis of breakage nearly impossible.

### IV. Playability at Every Milestone

At every milestone checkpoint the game MUST be launchable and interactable by
a player, even if features are incomplete or behind placeholder art. A milestone
MUST NOT close while the game is in a broken or non-launchable state.

"It's ok to make mistakes" — the game's core philosophy — MUST be reflected in
every mechanic review: punishing interactions that do not align with this
philosophy MUST be flagged and revised before a milestone closes.

**Rationale**: The game's identity is forgiving play. Verifying this continuously
prevents late-stage design drift.

### V. Simplicity (YAGNI)

Complexity MUST be justified by a current, concrete requirement. Speculative
abstractions, configurable systems without a second consumer, and premature
optimizations are prohibited. The Complexity Tracking table in plan.md MUST be
filled whenever a violation of this principle is accepted.

**Rationale**: Game prototypes accrue technical debt fast; a strict YAGNI policy
keeps the codebase navigable as the technology surface grows across test apps.

### VI. Responsiveness / Low Latency

The game MUST feel immediate. All audio responses to user input MUST begin
playback within **14 ms** of the triggering event. Visual feedback to input
(e.g. highlight, animation start) MUST be initiated within the same render
frame as the input event. Implementations that cannot meet these thresholds
MUST be prototyped in a test application to demonstrate acceptable latency
before being promoted to the main game.

Any audio/visual synchronization system MUST be validated in a dedicated test
application (Principle I) with measurable latency assertions before integration.

**Rationale**: The game plans to pair audio and video responses closely with
game mechanics; perceptible lag breaks immersion and undermines the meditative
experience the game is designed to create.

## Technology & Platform

The technology stack for each test application and for the main game MUST be
documented in the corresponding `specs/###-feature-name/plan.md` before
implementation begins. Until a technology has been proven in a test application
it MUST NOT be declared in a plan as the chosen solution for the main game.

Candidate technology decisions for the main game (hexagonal grid rendering,
input handling, state management, audio) are tracked as open questions until
the relevant test application graduates to "proven" status.

## Development Workflow

The canonical development sequence is:

1. **Identify** a technology or mechanic needed by the game.
2. **Specify** a test application in `specs/###-testapp-<name>/`.
3. **Implement & validate** the test app (Principles I and II apply).
4. **Graduate** — mark the test app as proven in its spec and note the
   integration contract.
5. **Integrate** the proven technology into the main game (Principle III applies).
6. **Validate playability** before closing the milestone (Principle IV applies).

Skipping steps 2–4 requires explicit written justification in the feature plan
and approval before implementation starts.

### Test Coverage Requirements

Every agent-generated code change MUST achieve **100% branch coverage**.

If a branch cannot practically be tested (e.g. unreachable error paths in
third-party bindings, platform-specific guards), the exception MUST be:
1. Explicitly documented in `docs/tracking/test-coverage-exceptions.md` with
   a rationale and the specific file/line range that is excluded.
2. Approved before the change is merged.

Coverage is measured at the unit level. Integration and end-to-end tests
do not substitute for branch coverage at the unit level unless the code
under test has no unit-testable surface (e.g. pure UI rendering code, which
falls under Principle II's manual-playability-validation exemption).

## Governance

This Constitution supersedes all other development practices within this
repository. Amendments require:
1. A written rationale explaining what changed and why.
2. A version bump per semantic versioning (MAJOR: principle removal or
   redefinition; MINOR: new principle or section; PATCH: clarification).
3. An updated Sync Impact Report embedded as an HTML comment at the top of
   this file.
4. Review of all templates listed in the Sync Impact Report.

All plans and specs MUST include a Constitution Check section that verifies
compliance with the six principles before Phase 0 research begins.

Compliance is re-verified at each milestone checkpoint. Violations must be
documented in the Complexity Tracking table of the relevant plan.

**Version**: 1.1.0 | **Ratified**: 2026-03-28 | **Last Amended**: 2026-03-28
