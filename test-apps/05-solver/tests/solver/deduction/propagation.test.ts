import { describe, it, expect } from 'vitest';
import { propagationStrategy } from '../../../src/solver/deduction/propagation';
import { HexGrid } from '../../../src/model/hex-grid';
import { buildVisibleClueSet } from '../../../src/solver/visible-clues';
import type { VisibleClueSet } from '../../../src/solver/visible-clues';
import { CellVisualState } from '../../../src/model/hex-cell';

/** Build a VisibleClueSet with only neighbor clues (no segments/flowers). */
function buildNeighborOnlyVcs(grid: HexGrid): VisibleClueSet {
  const full = buildVisibleClueSet(grid, new Map(), new Set());
  return {
    neighborClues: full.neighborClues,
    flowerClues: new Map(),
    lineSegments: new Map(),
  };
}

describe('propagationStrategy', () => {
  it('forces cell empty when hypothesizing filled contradicts neighbor clue', () => {
    // Grid 3x1: (0,0)E (1,0)E (2,0)E -- no filled cells
    // Open (1,0) which has neighbor clue value 0.
    // (0,0) is covered and a neighbor of (1,0).
    // If we hypothesize (0,0) is filled, then (1,0)'s clue says value=0 but marked=1 => contradiction.
    // So (0,0) must be empty.
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 1, row: 0 });

    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = propagationStrategy(grid, vcs);

    expect(forced.length).toBe(1);
    expect(forced[0].identity).toBe('empty');
    expect(forced[0].deductionType).toBe('constraint-propagation');
  });

  it('forces cell filled when hypothesizing empty contradicts neighbor clue', () => {
    // Grid: 3x1, one filled cell at (1,0).
    // Open (0,0) which has neighbor clue value 1 (one filled neighbor: 1,0).
    // The only covered neighbor of (0,0) is (1,0).
    // If we hypothesize (1,0) is empty, then (0,0)'s clue says value=1 but marked=0, covered=0 => remaining=1 > 0 covered => contradiction.
    // So (1,0) must be filled.
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [{ col: 1, row: 0 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 0, row: 0 });

    // Open (2,0) too so there are fewer covered neighbors
    grid.openCell({ col: 2, row: 0 });

    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = propagationStrategy(grid, vcs);

    // (1,0) should be forced filled because hypothesizing empty leads to contradiction
    const filledForced = forced.filter(f => f.identity === 'filled');
    expect(filledForced.length).toBe(1);
    expect(filledForced[0].coord).toBe('1,0');
  });

  it('detects contradiction from line segment constraints', () => {
    // A vertical line of 3 cells, all filled. Segments have value=3.
    // Cover all, then reveal none (segments visible by default).
    // If any cell hypothesized empty, the vertical segment value=3 but covered drops,
    // causing remaining > covered => contradiction.
    // So all cells should be forced filled.
    const grid = new HexGrid({
      name: 'test', description: '', width: 1, height: 3,
      filledCoords: [{ col: 0, row: 0 }, { col: 0, row: 1 }, { col: 0, row: 2 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();

    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = propagationStrategy(grid, vcs);

    // Should force at least one cell (returns after first found)
    expect(forced.length).toBe(1);
    expect(forced[0].identity).toBe('filled');
    expect(forced[0].deductionType).toBe('constraint-propagation');
  });

  it('detects contradiction from flower clue constraints', () => {
    // Create a grid where a flower clue constrains cells.
    // Center filled cell with flower clue = 0 (no filled in radius-2 zone).
    // If a covered cell in its zone is hypothesized filled, flower value=0 but marked=1 => contradiction.
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 3,
      filledCoords: [{ col: 1, row: 1 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    // Mark the center cell to reveal its flower clue
    grid.markCell({ col: 1, row: 1 });

    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = propagationStrategy(grid, vcs);

    // Flower clue at (1,1) has value 0. Any covered cell in the zone hypothesized
    // filled => contradiction. So a cell should be forced empty.
    expect(forced.length).toBe(1);
    expect(forced[0].identity).toBe('empty');
  });

  it('returns empty when no deduction possible', () => {
    // A grid where no hypothesis leads to contradiction.
    // Use neighbor-only VCS to avoid segment interference.
    // Open (2,2) with clue=2. It has many covered neighbors.
    // Hypothesizing filled or empty for any one neighbor doesn't cause
    // remaining < 0 or remaining > covered.
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: [{ col: 1, row: 1 }, { col: 3, row: 1 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 2, row: 2 });

    const vcs = buildNeighborOnlyVcs(grid);
    const forced = propagationStrategy(grid, vcs);

    // Clue at (2,2) has value=2 with ~6 covered neighbors.
    // Filling or emptying one doesn't violate: remaining stays in [1,2] and covered stays >= 1.
    expect(forced.length).toBe(0);
  });

  it('restores grid state after testing hypotheses', () => {
    // Verify that the grid is not mutated after the strategy runs
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 1, row: 0 });

    // Capture initial states
    const initialStates = new Map<string, CellVisualState>();
    for (const [key, cell] of grid.cells) {
      initialStates.set(key, cell.visualState);
    }

    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    propagationStrategy(grid, vcs);

    // Verify all cells are back to original state
    for (const [key, cell] of grid.cells) {
      expect(cell.visualState).toBe(initialStates.get(key));
    }
  });
});
