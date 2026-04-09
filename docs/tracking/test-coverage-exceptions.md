# Overview

This file contains all exceptions to the 100% branch coverage mandate in the constitution.

## `computeLineClue` — guard for segment start with no preceding cells

**File:** `test-apps/01-grid-mechanics/src/clues/line.ts`

**Branch:** Inside the walk loop, within `if (pendingGap !== null)`, the inner check `if (currentSegmentCells.length > 0)` has an untested false path.

**Condition for false path:** `pendingGap !== null && currentSegmentCells.length === 0`. This occurs only if the `start` coordinate passed to `computeLineClue` is a gap (not in cellMap) but is within the grid bounds defined by other cells. This is a defensive guard — all real callers (`computeAllLineClues` and tests) always pass a coordinate that exists in cellMap as the start of the walk.

**Justification:** Creating a test for this requires calling `computeLineClue` with an artificial start position that is not in cellMap but within bounds, which does not match the function's intended contract. The guard prevents a segment with zero cells from being emitted; the behavior in that edge case is correct but untestable without violating the caller's contract.

