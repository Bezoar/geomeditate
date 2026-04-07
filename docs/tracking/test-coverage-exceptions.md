# Overview

This file contains all exceptions to the 100% branch coverage mandate in the constitution.

## test-apps/05-solver

Six defensive guard branches in solver modules are unreachable dead code. Each is
a safety check that protects against a state that the surrounding code logic
mathematically prevents. Removing the guards would weaken robustness, so they
are kept in place and excluded from the 100% branch coverage target.

### prng.ts line 56 (pickWeighted fallback)

The fallback `return pick(available[available.length - 1].items)` after the
`for` loop in `pickWeighted` is unreachable because `next()` returns values in
`[0, 1)`, making `roll = next() * totalWeight` strictly less than `totalWeight`.
Sequential subtraction of the same weights that were summed to produce
`totalWeight` always drives `roll` to `<= 0` before or at the last category.

### contiguity.ts line 44 (checkContiguity filledNeighbors <= 1)

`checkContiguity` is only called from `findForcedByContiguity` where
`alreadyMarked` plus the combo always yields at least 2 filled neighbor keys
(because the clue requires CONTIGUOUS/DISCONTIGUOUS notation, which needs
`value >= 2`). So `filledNeighbors.length` is always `>= 2`.

### contiguity.ts line 67 (combinations items.length < k)

The `if (items.length < k) return []` guard in `combinations` is unreachable
both at the top-level call and in recursion. At the top level,
`remaining = value - markedKeys.size` equals the count of filled-but-still-covered
neighbors, which is always `<= candidateKeys.length`. In recursion, the for-loop
bound `i <= items.length - k` guarantees each recursive call has
`items'.length >= k'`.

### contiguity.ts line 106 (candidateKeys.length > 6)

A hex cell has exactly 6 neighbors, so `candidateKeys` (covered neighbors) can
never exceed 6.

### propagation.ts line 44 (!cell guard in main loop)

`constrainedCells` is built by iterating grid cells that exist and are COVERED.
The same grid is iterated immediately after, so `grid.cells.get(ck)` always
returns a valid cell.

### propagation.ts line 69 (!cell guard in leadsToContradiction)

`leadsToContradiction` receives `cellKey` that just passed the `!cell` check on
line 44 in the same synchronous call, so the cell always exists.

