import { describe, it, expect } from 'vitest';
import { pairwiseStrategy, gatherConstraints } from '../../../src/solver/deduction/pairwise';
import { HexGrid } from '../../../src/model/hex-grid';
import { buildVisibleClueSet } from '../../../src/solver/visible-clues';
import type { VisibleClueSet } from '../../../src/solver/visible-clues';


/** Build a VisibleClueSet with only neighbor clues (no segments/flowers). */
function buildNeighborOnlyVcs(grid: HexGrid): VisibleClueSet {
  const full = buildVisibleClueSet(grid, new Map(), new Set());
  return {
    neighborClues: full.neighborClues,
    flowerClues: new Map(),
    lineSegments: new Map(),
  };
}

describe('pairwiseStrategy', () => {
  it('forces shared cell filled when a clue requires all candidates filled', () => {
    // Grid 3x1: (0,0)E (1,0)F (2,0)E
    // Open (0,0): clue=1, neighbors in grid: {1,0} (the only one that exists)
    // Open (2,0): clue=1, neighbors in grid: {1,0}
    // Both constraints: candidates={1,0}, mustBeFilled=1
    // mustBeFilled === candidates.size for both, so (1,0) is forced filled.
    // Use neighbor-only VCS to avoid segment interference.
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [{ col: 1, row: 0 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 0, row: 0 });
    grid.openCell({ col: 2, row: 0 });

    const vcs = buildNeighborOnlyVcs(grid);
    const forced = pairwiseStrategy(grid, vcs);

    const filledCoords = forced.filter(f => f.identity === 'filled').map(f => f.coord);
    expect(filledCoords).toContain('1,0');
    expect(forced.every(f => f.deductionType === 'pairwise-intersection')).toBe(true);
  });

  it('forces shared cell empty when one clue requires all candidates empty', () => {
    // Grid 3x1: all empty. Open (0,0) and (2,0), both have clue=0.
    // Both constraints have mustBeFilled=0, so shared cell (1,0) forced empty.
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 0, row: 0 });
    grid.openCell({ col: 2, row: 0 });

    const vcs = buildNeighborOnlyVcs(grid);
    const forced = pairwiseStrategy(grid, vcs);

    const emptyCoords = forced.filter(f => f.identity === 'empty').map(f => f.coord);
    expect(emptyCoords).toContain('1,0');
  });

  it('returns empty when no deduction possible', () => {
    // Grid 5x1: (0,0)E (1,0)F (2,0)E (3,0)F (4,0)E
    // Open (2,0): clue=2, covered neighbors={1,0, 3,0}
    // Constraint: candidates={1,0, 3,0}, mustBeFilled=2, size=2 => all filled
    // But there's only one neighbor clue, so no pair exists => no pairwise deduction.
    // Wait, that would still be trivially deducible since must==size.
    // We need two clues whose constraints are ambiguous.
    //
    // Grid 5x3: open (2,1) with clue=2 and many covered neighbors.
    // Only one neighbor clue visible, so no pairs can form.
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 3,
      filledCoords: [{ col: 1, row: 1 }, { col: 3, row: 1 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 2, row: 1 });

    // Use neighbor-only VCS: only one clue at (2,1), so no pairs
    const vcs = buildNeighborOnlyVcs(grid);
    const forced = pairwiseStrategy(grid, vcs);
    expect(forced.length).toBe(0);
  });

  it('gathers constraints from neighbor, flower, and line segment clues', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 3,
      filledCoords: [{ col: 1, row: 1 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 0, row: 0 });
    grid.markCell({ col: 1, row: 1 });

    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const constraints = gatherConstraints(grid, vcs);

    const neighborConstraint = constraints.find(c => c.clueId === '0,0');
    const flowerConstraint = constraints.find(c => c.clueId === '1,1');
    expect(neighborConstraint).toBeDefined();
    expect(flowerConstraint).toBeDefined();
  });

  it('gathers constraints from line segments', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 1, height: 3,
      filledCoords: [{ col: 0, row: 0 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();

    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const constraints = gatherConstraints(grid, vcs);

    const segConstraints = constraints.filter(c => c.clueId.startsWith('seg:'));
    expect(segConstraints.length).toBeGreaterThan(0);
  });

  it('skips constraints with negative remaining', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 1, row: 0 });

    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const constraints = gatherConstraints(grid, vcs);

    for (const c of constraints) {
      expect(c.mustBeFilled).toBeGreaterThanOrEqual(0);
    }
  });

  it('does not duplicate forced cells for the same coordinate', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 0, row: 0 });
    grid.openCell({ col: 2, row: 0 });

    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = pairwiseStrategy(grid, vcs);

    const coords = forced.map(f => f.coord);
    const uniqueCoords = new Set(coords);
    expect(coords.length).toBe(uniqueCoords.size);
  });

  it('skips pairs with no shared candidates', () => {
    // Two clues whose neighbor zones don't overlap at all.
    // Grid 7x1: open (0,0) and (6,0). Their neighbor zones are disjoint.
    const grid = new HexGrid({
      name: 'test', description: '', width: 7, height: 1,
      filledCoords: [{ col: 1, row: 0 }, { col: 5, row: 0 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 0, row: 0 });
    grid.openCell({ col: 6, row: 0 });

    const vcs = buildNeighborOnlyVcs(grid);
    const forced = pairwiseStrategy(grid, vcs);

    // (0,0) constraint: candidates={1,0}, must=1 => forces filled
    // (6,0) constraint: candidates={5,0}, must=1 => forces filled
    // No shared candidates, so pairwise intersection doesn't fire for shared cells.
    // However, each constraint individually has must==size, so they pair with each other
    // but share nothing. Forced should contain cells from individual constraint forcing
    // only when shared. Since there's no overlap, forced is empty.
    expect(forced.length).toBe(0);
  });
});
