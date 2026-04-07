import { describe, it, expect } from 'vitest';
import { propagationStrategy } from '../../../src/solver/deduction/propagation';
import { HexGrid } from '../../../src/model/hex-grid';
import { buildVisibleClueSet } from '../../../src/solver/visible-clues';
import type { VisibleClueSet } from '../../../src/solver/visible-clues';
import type { Segment } from '../../../src/clues/line';
import { CellVisualState, ClueNotation } from '../../../src/model/hex-cell';
import { radius2Positions, coordKey, parseCoordKey } from '../../../src/model/hex-coord';

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

  it('detects contradiction from flower clue: remaining < 0', () => {
    // We need flower clues to contradict with remaining < 0.
    // Flower clue at (1,1) with value 0. Covered cell in its zone.
    // Hypothesizing covered cell as filled => marked=1, value=0 => remaining=-1 < 0 => contradiction.
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 3,
      filledCoords: [{ col: 1, row: 1 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.markCell({ col: 1, row: 1 });

    // Build VCS with only flower clues — strip neighbor and line clues
    const fullVcs = buildVisibleClueSet(grid, new Map(), new Set());
    const vcs: VisibleClueSet = {
      neighborClues: new Map(),
      flowerClues: fullVcs.flowerClues,
      lineSegments: new Map(),
    };

    const forced = propagationStrategy(grid, vcs);
    expect(forced.length).toBe(1);
    expect(forced[0].identity).toBe('empty');
  });

  it('detects contradiction from flower clue: remaining > covered', () => {
    // We need the flower contradiction branch where remaining > covered (not remaining < 0).
    //
    // Key analysis: when hypothesizing cell X (in flower zone) as empty:
    //   new_covered = old_covered - 1, new_marked = old_marked
    //   remaining = value - old_marked
    //   Contradiction if remaining > new_covered, i.e., value - marked > covered - 1
    //
    // When hypothesizing cell X as filled (tested FIRST):
    //   new_covered = old_covered - 1, new_marked = old_marked + 1
    //   remaining = value - (marked + 1)
    //   NO contradiction if: remaining >= 0 AND remaining <= new_covered
    //   i.e., value >= marked + 1 AND value - marked - 1 <= covered - 1
    //   => value <= marked + covered
    //
    // Combining: value = marked + covered satisfies both constraints.
    //
    // Setup: flower zone has ALL cells either MARKED_FILLED or COVERED (none OPEN_EMPTY).
    // flower value = (number of filled zone cells) = marked + covered.
    // With 1 covered cell: value = marked + 1.
    //
    // In a 3x3 grid with center (1,1), the radius-2 zone has 8 cells in grid.
    // To get value = marked + 1, we need all 8 zone cells to be filled ground truth,
    // then mark 7 and leave 1 covered.
    // flower value = 8 (all zone cells filled). marked = 7, covered = 1.
    // Filled hypothesis: remaining = 8 - 8 = 0, covered = 0. 0 >= 0 AND 0 <= 0. OK.
    // Empty hypothesis: remaining = 8 - 7 = 1, covered = 0. 1 > 0 => contradiction!
    //
    // But we can't fill ALL cells in a 3x3 grid's zone. Let me use a 5x5 grid
    // where we have more zone cells available.
    //
    // Actually, let's use a simpler approach: fill ALL zone cells.
    // In a 3x3 grid, center (1,1). Zone cells in grid: about 8.
    // Fill all 8 zone cells + center.
    const allFilledCoords = [];
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 3; row++) {
        allFilledCoords.push({ col, row });
      }
    }
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 3,
      filledCoords: allFilledCoords, // all 9 cells are filled
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();

    // Mark center (1,1) to reveal flower clue
    grid.markCell({ col: 1, row: 1 });

    // Identify zone cells and their state
    const zone = radius2Positions({ col: 1, row: 1 });
    const zoneCellsInGrid: string[] = [];
    for (const pos of zone) {
      const key = coordKey(pos);
      if (grid.cells.has(key)) {
        zoneCellsInGrid.push(key);
      }
    }

    // Mark all zone cells except ONE (leave exactly 1 covered)
    let leftCovered = false;
    for (const key of zoneCellsInGrid) {
      const cell = grid.cells.get(key)!;
      if (cell.visualState !== CellVisualState.COVERED) continue;
      if (!leftCovered) {
        leftCovered = true; // skip first one, leave it covered
        continue;
      }
      grid.markCell(parseCoordKey(key)); // mark as filled
    }

    // Build VCS with only flower clues
    const fullVcs = buildVisibleClueSet(grid, new Map(), new Set());
    const vcs: VisibleClueSet = {
      neighborClues: new Map(),
      flowerClues: fullVcs.flowerClues,
      lineSegments: new Map(),
    };

    const forced = propagationStrategy(grid, vcs);
    // The one remaining covered cell should be forced filled because:
    // - "filled" hypothesis: remaining = 0, covered = 0 => OK (no contradiction)
    // - "empty" hypothesis: remaining = 1, covered = 0 => 1 > 0 => contradiction!
    // So cell is forced filled (opposite of contradicting "empty" hypothesis).
    if (forced.length > 0) {
      expect(forced[0].identity).toBe('filled');
    }
    expect(forced.length).toBe(1);
  });

  it('detects contradiction from line segment only (not neighbor/flower)', () => {
    // We need line segment clues to contradict but no neighbor or flower clues.
    // Use a VCS with only line segments.
    const grid = new HexGrid({
      name: 'test', description: '', width: 1, height: 3,
      filledCoords: [{ col: 0, row: 0 }, { col: 0, row: 1 }, { col: 0, row: 2 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();

    // Build VCS with only line segments — strip neighbor and flower clues
    const fullVcs = buildVisibleClueSet(grid, new Map(), new Set());
    const vcs: VisibleClueSet = {
      neighborClues: new Map(), // no neighbor clues
      flowerClues: new Map(),   // no flower clues
      lineSegments: fullVcs.lineSegments,
    };

    const forced = propagationStrategy(grid, vcs);
    // Vertical segment has value 3 with 3 cells. Hypothesizing any cell as empty =>
    // remaining=3, covered=2 => remaining > covered => contradiction.
    // So the cell should be forced filled.
    expect(forced.length).toBe(1);
    expect(forced[0].identity).toBe('filled');
  });

  it('handles non-existent cell in constrainedCells set gracefully', () => {
    // The !cell check on line 44 is a safety guard. We trigger it by
    // constructing a VCS with a neighbor clue whose neighbor key doesn't exist in the grid.
    // This happens at grid edges where neighbors fall outside the grid.
    //
    // Actually, the constrainedCells loop already checks grid.cells.get(nk) and only
    // adds if cell exists and is COVERED. So !cell on line 44 should not normally fire.
    // But we can verify the guard by manipulating the grid between VCS build and strategy run.
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 1, row: 0 });

    const vcs = buildVisibleClueSet(grid, new Map(), new Set());

    // Delete a cell from the grid after building VCS but before running strategy.
    // Cell (0,0) is a covered neighbor of (1,0).
    grid.cells.delete('0,0');

    const forced = propagationStrategy(grid, vcs);
    // The deleted cell (0,0) is in constrainedCells but grid.cells.get returns undefined.
    // The !cell guard on line 44 skips it.
    expect(Array.isArray(forced)).toBe(true);
  });

  it('handles line segment with missing cell in leadsToContradiction', () => {
    // The !sc check on line 126 handles segment cells not in the grid.
    // Create a VCS with ONLY a fake segment (no neighbor/flower clues)
    // so that no earlier check finds a contradiction and the segment check runs.
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [{ col: 0, row: 0 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();

    // Create a fake segment with one real cell and one non-existent cell.
    // value = 1 means we need 1 filled cell in the segment.
    const fakeSegment: Segment = {
      id: 'seg:test:fake',
      lineGroupId: 'line:test:fake',
      axis: 'vertical',
      cluePosition: { col: 0, row: -1 },
      cells: [
        { col: 0, row: 0 }, // real cell, covered
        { col: 99, row: 99 }, // non-existent - triggers !sc branch
      ],
      value: 1,
      notation: ClueNotation.PLAIN,
      isEdgeClue: true,
      contiguityEnabled: true,
    };

    const vcs: VisibleClueSet = {
      neighborClues: new Map(),
      flowerClues: new Map(),
      lineSegments: new Map([['seg:test:fake', { segmentId: 'seg:test:fake', segment: fakeSegment }]]),
    };

    const forced = propagationStrategy(grid, vcs);
    // constrainedCells = {0,0} (from segment).
    // For cell (0,0):
    //   "filled" hypothesis: cell becomes MARKED_FILLED.
    //     Segment check: covered=0 (0,0 is now MARKED_FILLED), marked=1, (99,99) skipped.
    //     remaining = 1 - 1 = 0. 0 >= 0 AND 0 <= 0. No contradiction.
    //   "empty" hypothesis: cell becomes OPEN_EMPTY.
    //     Segment check: covered=0, marked=0, (99,99) skipped.
    //     remaining = 1 - 0 = 1. 1 > 0. Contradiction!
    //   => force filled (opposite of contradicting "empty").
    expect(forced.length).toBe(1);
    expect(forced[0].identity).toBe('filled');
  });
});
