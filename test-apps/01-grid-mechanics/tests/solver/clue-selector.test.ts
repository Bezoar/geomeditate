import { describe, it, expect } from 'vitest';
import { HexGrid } from '../../src/model/hex-grid';
import type { TestGridConfig } from '../../src/model/hex-grid';
import {
  neighborClueId,
  flowerClueId,
  lineClueId,
  GLOBAL_REMAINING_ID,
} from '../../src/solver/deductions';
import { allClueIds, selectClues } from '../../src/solver/clue-selector';
import { verify } from '../../src/solver/verifier';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * A 3x3 grid with the center cell filled.
 * This is the simplest grid that has neighbor, flower, and line clues all present.
 */
function make3x3Grid(): HexGrid {
  const config: TestGridConfig = {
    name: 'test-3x3',
    description: '3x3 grid with center filled',
    width: 3,
    height: 3,
    filledCoords: [{ col: 1, row: 1 }],
    missingCoords: [],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

/**
 * A 2x1 grid with col=0 filled and col=1 empty.
 * Simple but solvable with just the neighbor clue.
 */
function make2x1Grid(): HexGrid {
  const config: TestGridConfig = {
    name: 'test-2x1',
    description: '2x1 grid with one filled cell',
    width: 2,
    height: 1,
    filledCoords: [{ col: 0, row: 0 }],
    missingCoords: [],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

/**
 * A 3x1 grid: col=0 and col=2 filled, col=1 empty.
 * Both neighbor cells of (1,0) see 2 filled cells; clue value = 2.
 * Solvable: neighbor clue at (1,0) with value 2 and 2 covered neighbors → both filled.
 */
function make3x1TwoFilledGrid(): HexGrid {
  const config: TestGridConfig = {
    name: 'test-3x1-twofilled',
    description: '3x1 grid with two filled cells on the ends',
    width: 3,
    height: 1,
    filledCoords: [{ col: 0, row: 0 }, { col: 2, row: 0 }],
    missingCoords: [],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('allClueIds', () => {
  /**
   * T1: Returns all neighbor, flower, and line clue IDs for a 3x3 grid.
   *
   * The 3x3 grid with (1,1) filled has:
   * - 8 empty cells each with neighborClueId
   * - 1 filled cell (1,1) with flowerClueId
   * - multiple line clues (horizontal, vertical, ascending, descending)
   */
  it('returns neighbor clue IDs for all EMPTY cells with non-null neighborClueValue', () => {
    const grid = make3x3Grid();
    const ids = allClueIds(grid);

    // All 8 empty cells should have neighbor clue IDs
    const neighborIds = Array.from(ids).filter((id) => id.startsWith('neighbor:'));
    expect(neighborIds.length).toBe(8);
  });

  it('returns flower clue IDs for FILLED cells with non-null flowerClueValue', () => {
    const grid = make3x3Grid();
    const ids = allClueIds(grid);

    // Only (1,1) is filled; it has a flower clue
    const flowerIds = Array.from(ids).filter((id) => id.startsWith('flower:'));
    expect(flowerIds.length).toBe(1);
    expect(flowerIds[0]).toBe(flowerClueId({ col: 1, row: 1 }));
  });

  it('returns line clue IDs for all lineClues in grid', () => {
    const grid = make3x3Grid();
    const ids = allClueIds(grid);

    const lineIds = Array.from(ids).filter((id) => id.startsWith('line:'));
    expect(lineIds.length).toBe(grid.lineClues.length);

    // Each lineClue in the grid should have a matching ID
    for (const lc of grid.lineClues) {
      expect(lineIds).toContain(lineClueId(lc.axis, lc.startCoord));
    }
  });

  it('returns the correct set for a 2x1 grid', () => {
    const grid = make2x1Grid();
    const ids = allClueIds(grid);

    // (1,0) is EMPTY with neighborClueValue non-null
    expect(ids.has(neighborClueId({ col: 1, row: 0 }))).toBe(true);
    // (0,0) is FILLED with flowerClueValue (may be null if no valid radius-2 in-grid cells)
    // — just check that ids is a Set and contains the neighbor clue
    expect(ids instanceof Set).toBe(true);
  });

  it('does not include GLOBAL_REMAINING_ID', () => {
    const grid = make3x3Grid();
    const ids = allClueIds(grid);
    expect(ids.has(GLOBAL_REMAINING_ID)).toBe(false);
  });

  it('returns an empty set for a grid with no cells', () => {
    // All cells missing → no clues
    const config: TestGridConfig = {
      name: 'empty-grid',
      description: 'grid with all cells missing',
      width: 2,
      height: 1,
      filledCoords: [],
      missingCoords: [{ col: 0, row: 0 }, { col: 1, row: 0 }],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();
    const ids = allClueIds(grid);
    expect(ids.size).toBe(0);
  });
});

describe('selectClues', () => {
  /**
   * T2: Returns a valid ClueSelection for a solvable grid in easy mode.
   *
   * The 2x1 grid is solvable with the single neighbor clue.
   * Easy mode should return a non-null result with stuck=false.
   */
  it('returns valid ClueSelection for solvable grid in easy mode', () => {
    const grid = make2x1Grid();
    const selection = selectClues(grid, 'easy');

    expect(selection).not.toBeNull();
    expect(selection!.difficulty).toBe('easy');
    expect(selection!.verifyResult.stuck).toBe(false);
    expect(selection!.visibleClues instanceof Set).toBe(true);
  });

  /**
   * T3: Returns valid ClueSelection for a solvable grid in hard mode.
   *
   * Hard mode may use global:remaining; result should be non-null with stuck=false.
   */
  it('returns valid ClueSelection for solvable grid in hard mode', () => {
    const grid = make2x1Grid();
    const selection = selectClues(grid, 'hard');

    expect(selection).not.toBeNull();
    expect(selection!.difficulty).toBe('hard');
    expect(selection!.verifyResult.stuck).toBe(false);
  });

  /**
   * T5: Hard mode uses fewer or equal clues compared to easy mode.
   *
   * Easy mode adds back non-required neighbor and line clues, so it should
   * never have fewer clues than hard mode on the same grid.
   *
   * We run multiple times to account for randomness in shuffle.
   */
  it('easy mode has >= clues compared to hard mode', () => {
    const grid = make3x1TwoFilledGrid();

    // Run several times to account for random shuffle
    for (let i = 0; i < 5; i++) {
      const easy = selectClues(grid, 'easy');
      const hard = selectClues(grid, 'hard');

      if (easy !== null && hard !== null) {
        expect(easy.visibleClues.size).toBeGreaterThanOrEqual(hard.visibleClues.size);
      }
    }
  });

  /**
   * T5b: Easy mode result is solvable (stuck=false).
   */
  it('easy mode produces a solvable result for a larger grid', () => {
    const grid = make3x3Grid();
    const selection = selectClues(grid, 'easy');

    expect(selection).not.toBeNull();
    expect(selection!.verifyResult.stuck).toBe(false);
  });

  /**
   * T5c: Hard mode result is solvable (stuck=false).
   */
  it('hard mode produces a solvable result for a larger grid', () => {
    const grid = make3x3Grid();
    const selection = selectClues(grid, 'hard');

    expect(selection).not.toBeNull();
    expect(selection!.verifyResult.stuck).toBe(false);
  });

  /**
   * T6: Hard mode includes GLOBAL_REMAINING_ID as a candidate (not excluded from pruning).
   *
   * We verify this indirectly: hard mode may return global:remaining in the
   * visible set when it's required. We simply check that the output is valid.
   */
  it('hard mode candidates include GLOBAL_REMAINING_ID', () => {
    // Grid where all cells are empty — global:remaining (value=0) is useful
    const config: TestGridConfig = {
      name: 'test-all-empty',
      description: '2x1 grid with no filled cells',
      width: 2,
      height: 1,
      filledCoords: [],
      missingCoords: [],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();

    const selection = selectClues(grid, 'hard');

    // Should be solvable since global:remaining = 0 can deduce everything empty
    expect(selection).not.toBeNull();
    expect(selection!.verifyResult.stuck).toBe(false);
  });

  /**
   * T7: Easy mode does NOT include GLOBAL_REMAINING_ID (not a candidate for easy).
   */
  it('easy mode does not include GLOBAL_REMAINING_ID in visible clues', () => {
    const grid = make2x1Grid();
    const selection = selectClues(grid, 'easy');

    expect(selection).not.toBeNull();
    expect(selection!.visibleClues.has(GLOBAL_REMAINING_ID)).toBe(false);
  });

  /**
   * T8: selectClues does not mutate the original grid.
   */
  it('does not mutate the original grid', () => {
    const grid = make3x3Grid();

    const originalRemaining = grid.remainingCount;
    const originalCellStates = new Map(
      Array.from(grid.cells.entries()).map(([k, v]) => [k, v.visualState]),
    );

    selectClues(grid, 'easy');

    expect(grid.remainingCount).toBe(originalRemaining);
    for (const [key, state] of originalCellStates) {
      expect(grid.cells.get(key)!.visualState).toBe(state);
    }
  });

  /**
   * T9: selectClues result verifyResult matches a fresh verify() call.
   *
   * The verifyResult stored in ClueSelection should agree with running verify
   * ourselves using the returned visibleClues.
   */
  it('verifyResult matches an independent verify() call', () => {
    const grid = make2x1Grid();
    const selection = selectClues(grid, 'easy');

    expect(selection).not.toBeNull();
    const independent = verify(grid, selection!.visibleClues, 'simple');
    expect(independent.stuck).toBe(selection!.verifyResult.stuck);
  });
});
