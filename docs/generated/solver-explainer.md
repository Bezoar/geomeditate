# Solver Explainer

## Overview

The 05-solver test app contains a deterministic puzzle solver for the hex grid game. The solver progressively activates clues and deduces cell identities until the entire grid is resolved, producing a minimal clue set for human play.

## Architecture

The solver is built as three layers:

### 1. Deduction Engine

A registry of strategies that scan visible clues and return forced cells. Strategies are ordered simplest to most complex:

| Priority | Strategy | What it does |
|----------|----------|-------------|
| 1 | trivial-count | Neighbor clue equals remaining covered neighbors -- all filled |
| 1 | trivial-elimination | Neighbor clue is 0 -- all empty |
| 1 | saturation | All filled found -- remaining empty |
| 2 | contiguity | Contiguous/discontiguous constraint eliminates positions |
| 3 | line-segment | Line segment value forces cells in the segment |
| 4 | flower | Flower value forces cells in radius-2 zone |
| 5 | pairwise-intersection | Two clues constrain the same cell -- combined, one identity wins |
| 6 | constraint-propagation | Hypothesis testing -- if assuming X leads to contradiction, not-X is true |
| 7 | set-reasoning | Subset/superset analysis -- if A is a subset of B, the difference cells are constrained |

The engine stops at the first strategy that returns results. Each strategy is independently toggleable.

### 2. Clue Activation Policy

When no deduction is possible (or the actionable clue count is below the difficulty threshold), the solver reveals a hidden clue:

1. Scans all hidden clues (covered empty cells, invisible segments, hidden flowers)
2. For each, simulates revealing it and checks if the deduction engine finds forced cells
3. Filters to actionable candidates
4. Uses weighted random selection (PRNG) to pick by type (cell/line/flower)

Weights are configured per difficulty:
- **Easy**: cell=70, line=25, flower=5
- **Hard**: cell=20, line=30, flower=50

### 3. Solver Loop

Each turn:
1. Check endgame conditions (remaining = covered count means all filled; remaining = 0 means all empty)
2. Ensure enough actionable clues are visible (threshold per difficulty)
3. Activate hidden clues if below threshold (each activation is a separate trace step)
4. Run deduction engine to find forced cells
5. Pick one forced cell (PRNG) and resolve it (open or mark)
6. Record a trace step with board snapshot

## Configuration

All settings are exposed in a `SolverConfig` object, editable via the Settings modal:

- **seed**: Alphanumeric string for deterministic PRNG
- **difficulty**: easy or hard
- **deductionLevels**: 7 boolean toggles
- **clueWeights**: cell/line/flower weights per difficulty
- **easyModeMinActionable**: minimum actionable clues for easy mode (default: 3)
- **hardModeMinActionable**: minimum actionable clues for hard mode (default: 1)

## Tuning Difficulty

To make puzzles easier:
- Increase `easyModeMinActionable` (more clues always visible)
- Increase cell weight (neighbor clues are simplest for humans)
- Disable complex strategies (propagation, set-reasoning)

To make puzzles harder:
- Set `hardModeMinActionable` to 1
- Increase flower weight (flower + intersection reasoning is challenging)
- Enable all strategies (the solver can use them, so the clue set assumes the player can too)

## Trace and Replay

Every solver step produces a `TraceStep` with:
- Turn number and phase (clue-activation, deduction, endgame)
- What clue was activated or what cell was deduced (with deduction type)
- Full board state snapshot (cell visual states + clue visibility)
- Remaining count and actionable clue count

The replay UI lets you step through the trace with Prev/Next buttons, showing what changed at each step.

## Deduction Strategy Details

### Trivial Strategies (trivial-count, trivial-elimination, saturation)

These use neighbor clues (the number shown on an open empty cell):

- **trivial-count**: If a cell's clue says N and it has exactly N remaining covered neighbors, all must be filled.
- **trivial-elimination**: If a cell's clue says 0, all covered neighbors are empty.
- **saturation**: If all N filled neighbors have already been found (marked), any remaining covered neighbors must be empty.

### Contiguity

Uses the contiguity notation on neighbor clues ({N} = contiguous, -N- = discontiguous):

Enumerates all possible placements of the remaining filled cells among covered neighbors, filters by the contiguity constraint, then identifies cells that appear in ALL valid placements (forced filled) or NO valid placements (forced empty).

### Line Segment

Applies the same count-based logic as trivial strategies but to line segments:

If a segment's value equals the count of covered cells in the segment, all are filled. If the value minus already-marked equals zero, remaining are empty.

### Flower

Same count-based logic applied to the radius-2 zone around a filled cell:

If the flower value equals the count of covered cells in the zone, all are filled. If fully satisfied, remaining are empty.

### Pairwise Intersection

Gathers constraints from all visible clue types. Each constraint has a set of candidate cells and a count of how many must be filled. When two constraints share cells and one forces all candidates filled (or all empty), shared cells are confirmed.

### Constraint Propagation

For each covered cell constrained by visible clues, hypothesizes "filled" or "empty." If the hypothesis causes any clue constraint to become impossible (remaining filled < 0 or remaining filled > covered count), the opposite must be true.

### Set Reasoning

When constraint A's candidates are a proper subset of B's candidates, the cells in B\A must account for exactly (B.mustBeFilled - A.mustBeFilled) fills. If that difference is 0, all B\A cells are empty. If it equals |B\A|, all are filled.

## Future Enhancements

- Clue selection beyond weights (e.g., prefer clues that maximize propagation)
- Difficulty scoring based on which strategy types were required
- Multiple solve passes with different seeds to find optimal clue sets
