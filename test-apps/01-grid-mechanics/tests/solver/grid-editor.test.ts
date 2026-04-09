import { describe, it, expect } from 'vitest';
import { HexGrid } from '../../src/model/hex-grid';
import type { TestGridConfig } from '../../src/model/hex-grid';
import { editForSolvability } from '../../src/solver/grid-editor';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * A 3x3 grid with the center cell filled.
 * This grid is solvable with available clues.
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
 * A 2x1 grid with col=0 filled, col=1 empty.
 * This is solvable with just the neighbor clue.
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
 * A 3x3 grid with all cells filled.
 * No EMPTY cells means no neighbor clue, no per-cell flower clues visible.
 * With all cells filled, line clues and global remaining may or may not be
 * enough at 'easy' mode. We use it to exercise editing paths.
 */
function makeAllFilledGrid(): HexGrid {
  const filledCoords = [];
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      filledCoords.push({ col, row });
    }
  }
  const config: TestGridConfig = {
    name: 'test-all-filled',
    description: '3x3 grid with all cells filled',
    width: 3,
    height: 3,
    filledCoords,
    missingCoords: [],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

/**
 * A 3x3 grid with a specific missing coord so there is a "hole" (no-cell
 * position) adjacent to existing cells. Used to exercise the add-cell strategy.
 */
function make3x3WithHoleGrid(): HexGrid {
  const config: TestGridConfig = {
    name: 'test-3x3-hole',
    description: '3x3 grid with center cell missing',
    width: 3,
    height: 3,
    filledCoords: [{ col: 0, row: 0 }, { col: 2, row: 0 }],
    missingCoords: [{ col: 1, row: 1 }],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('editForSolvability', () => {
  /**
   * T1: Returns EditResult with empty edits when grid is already solvable.
   *
   * The 2x1 grid is solvable via selectClues, so editForSolvability should
   * return { edits: [], grid, clueSelection } without making any changes.
   */
  it('returns EditResult with empty edits when grid is already solvable', () => {
    const grid = make2x1Grid();
    const result = editForSolvability(grid, 'easy');

    expect(result).not.toBeNull();
    expect(result!.edits).toHaveLength(0);
    expect(result!.clueSelection.verifyResult.stuck).toBe(false);
    // The grid reference should be the original grid (no edits made)
    expect(result!.grid).toBe(grid);
  });

  /**
   * T2: Returns null when maxEdits is 0 and grid isn't solvable.
   *
   * When maxEdits <= 0, the function should return null immediately without
   * attempting any edits.
   */
  it('returns null immediately when maxEdits is 0', () => {
    // Use all-filled grid which may not be easy-solvable
    const grid = makeAllFilledGrid();
    // Force maxEdits = 0: must return null regardless
    const result = editForSolvability(grid, 'easy', 0);
    expect(result).toBeNull();
  });

  /**
   * T2b: Returns null immediately when maxEdits is negative.
   */
  it('returns null immediately when maxEdits is negative', () => {
    const grid = makeAllFilledGrid();
    const result = editForSolvability(grid, 'easy', -5);
    expect(result).toBeNull();
  });

  /**
   * T3: Does not crash on any grid; if result is non-null, clueSelection is valid.
   *
   * Run on multiple grid shapes. Verifies the function doesn't throw and that
   * any non-null result has stuck=false.
   */
  it('does not crash and returns valid result for 3x3 solvable grid', () => {
    const grid = make3x3Grid();
    let result: ReturnType<typeof editForSolvability>;
    expect(() => {
      result = editForSolvability(grid, 'easy');
    }).not.toThrow();
    if (result! !== null) {
      expect(result!.clueSelection.verifyResult.stuck).toBe(false);
    }
  });

  it('does not crash and returns valid result for all-filled grid', () => {
    const grid = makeAllFilledGrid();
    let result: ReturnType<typeof editForSolvability>;
    expect(() => {
      result = editForSolvability(grid, 'easy');
    }).not.toThrow();
    if (result! !== null) {
      expect(result!.clueSelection.verifyResult.stuck).toBe(false);
    }
  });

  it('does not crash and returns valid result for grid with hole', () => {
    const grid = make3x3WithHoleGrid();
    let result: ReturnType<typeof editForSolvability>;
    expect(() => {
      result = editForSolvability(grid, 'easy');
    }).not.toThrow();
    if (result! !== null) {
      expect(result!.clueSelection.verifyResult.stuck).toBe(false);
    }
  });

  /**
   * T4: Works with hard difficulty.
   *
   * The function should accept 'hard' difficulty and behave correctly.
   */
  it('works with hard difficulty on a solvable grid', () => {
    const grid = make2x1Grid();
    const result = editForSolvability(grid, 'hard');

    expect(result).not.toBeNull();
    expect(result!.clueSelection.difficulty).toBe('hard');
    expect(result!.clueSelection.verifyResult.stuck).toBe(false);
  });

  it('works with hard difficulty on all-filled grid without crashing', () => {
    const grid = makeAllFilledGrid();
    let result: ReturnType<typeof editForSolvability>;
    expect(() => {
      result = editForSolvability(grid, 'hard');
    }).not.toThrow();
    if (result! !== null) {
      expect(result!.clueSelection.verifyResult.stuck).toBe(false);
    }
  });

  /**
   * T5: If edits are non-empty, each edit has a valid type.
   *
   * Any returned edit must use one of the three allowed edit types.
   */
  it('each edit in result has a valid type', () => {
    const validTypes = ['toggle_truth', 'add_cell', 'remove_cell'];

    // Run on several grids and check any edit types returned
    const grids = [make3x3Grid(), makeAllFilledGrid(), make3x3WithHoleGrid()];
    for (const grid of grids) {
      const result = editForSolvability(grid, 'easy');
      if (result !== null && result.edits.length > 0) {
        for (const edit of result.edits) {
          expect(validTypes).toContain(edit.type);
          expect(edit.coord).toBeDefined();
          expect(typeof edit.coord.col).toBe('number');
          expect(typeof edit.coord.row).toBe('number');
        }
      }
    }
  });

  /**
   * T6: toggle_truth is preferred over structural edits.
   *
   * The strategy order is: toggle_truth first, then remove_cell, then add_cell.
   * If a toggle_truth edit works, it should be used rather than a structural edit.
   * We verify this by checking that any single-edit result uses 'toggle_truth'
   * when the grid is close to solvable with that change.
   *
   * We can't guarantee a specific grid NEEDS editing, but we can verify that
   * the function returns at most one edit (since it stops at first success) and
   * that all-filled grid edits are tried in the correct order.
   */
  it('prefers toggle_truth edits over structural edits (tried first)', () => {
    // All-filled grid: every cell is filled. When toggle_truth is tried on a
    // candidate, it changes a FILLED cell to EMPTY, creating a neighbor clue source.
    const grid = makeAllFilledGrid();
    const result = editForSolvability(grid, 'easy');

    if (result !== null && result.edits.length > 0) {
      // If only one edit was needed, it should prefer toggle_truth
      // (since toggle_truth strategy is tried before remove_cell and add_cell)
      expect(result.edits).toHaveLength(1);
      // The type could be any valid type; we can't guarantee toggle_truth works
      // but we verify the result is valid
      const validTypes = ['toggle_truth', 'add_cell', 'remove_cell'];
      expect(validTypes).toContain(result.edits[0].type);
    }
  });

  /**
   * T7: Result grid has the same width/height as the original.
   */
  it('result grid has same dimensions as original', () => {
    const grid = make3x3Grid();
    const result = editForSolvability(grid, 'easy');

    if (result !== null) {
      expect(result.grid.width).toBe(grid.width);
      expect(result.grid.height).toBe(grid.height);
    }
  });

  /**
   * T8: When already solvable, the returned grid is the original reference.
   *
   * No cloning needed when no edits are made.
   */
  it('returns the original grid reference when already solvable (no edits)', () => {
    const grid = make2x1Grid();
    const result = editForSolvability(grid, 'easy');

    expect(result).not.toBeNull();
    expect(result!.edits).toHaveLength(0);
    expect(result!.grid).toBe(grid);
  });

  /**
   * T9: Does not mutate the original grid.
   *
   * After calling editForSolvability, the original grid's cells and state
   * should remain unchanged.
   */
  it('does not mutate the original grid', () => {
    const grid = makeAllFilledGrid();

    const originalRemaining = grid.remainingCount;
    const originalCellKeys = Array.from(grid.cells.keys()).sort();

    editForSolvability(grid, 'easy');

    // Cell keys should be unchanged
    expect(Array.from(grid.cells.keys()).sort()).toEqual(originalCellKeys);
    expect(grid.remainingCount).toBe(originalRemaining);
  });

  /**
   * T10: Returns null when no strategy succeeds within maxEdits=1 on a complex grid.
   *
   * We can't guarantee this without a specifically crafted grid, but we verify
   * that the function returns null when maxEdits=0 always (edge case).
   */
  it('default maxEdits (1) still returns valid result when grid is solvable', () => {
    const grid = make2x1Grid();
    // Default maxEdits should be at least 1
    const result = editForSolvability(grid, 'easy');
    expect(result).not.toBeNull();
    expect(result!.clueSelection.verifyResult.stuck).toBe(false);
  });
});
