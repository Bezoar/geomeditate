import { describe, it, expect } from 'vitest';
import { HexGrid } from '../../src/model/hex-grid';
import type { TestGridConfig } from '../../src/model/hex-grid';
import { generatePuzzle } from '../../src/solver/pipeline';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGrid(
  width: number,
  height: number,
  filledCoords: Array<{ col: number; row: number }>,
): HexGrid {
  const config: TestGridConfig = {
    name: 'pipeline-test',
    description: 'test',
    width,
    height,
    filledCoords,
    missingCoords: [],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

/**
 * Simple solvable grid: 2x1 with col=0 filled, col=1 empty.
 * The neighbor clue at (1,0) is sufficient to solve it.
 */
function make2x1Grid(): HexGrid {
  return makeGrid(2, 1, [{ col: 0, row: 0 }]);
}

/**
 * A 3x3 grid with center cell filled.
 * Has neighbor, flower, and line clues — solvable.
 */
function make3x3Grid(): HexGrid {
  return makeGrid(3, 3, [{ col: 1, row: 1 }]);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generatePuzzle', () => {
  /**
   * T1: Generates a solvable puzzle for a simple grid in easy mode.
   *
   * The 2x1 grid is trivially solvable, so generatePuzzle should return
   * a non-null result with stuck=false.
   */
  it('generates a solvable puzzle for a simple grid in easy mode', () => {
    const grid = make2x1Grid();
    const result = generatePuzzle(grid, 'easy');

    expect(result).not.toBeNull();
    expect(result!.replay.stuck).toBe(false);
  });

  /**
   * T2: Generates a solvable puzzle in hard mode.
   *
   * Hard mode uses advanced tier deductions. Should still produce a valid result.
   */
  it('generates a solvable puzzle in hard mode', () => {
    const grid = make2x1Grid();
    const result = generatePuzzle(grid, 'hard');

    expect(result).not.toBeNull();
    expect(result!.replay.stuck).toBe(false);
  });

  /**
   * T3: Returns edits array (possibly empty) in result.
   *
   * The edits field must always be present as an array, even when empty.
   */
  it('returns edits array (possibly empty) in result', () => {
    const grid = make3x3Grid();
    const result = generatePuzzle(grid, 'easy');

    expect(result).not.toBeNull();
    expect(Array.isArray(result!.edits)).toBe(true);
  });

  /**
   * T4: Replay contains steps (possibly zero if all cells are pre-revealed
   * by clue selection). For a non-trivial grid, the replay should be
   * well-formed with a non-stuck result.
   */
  it('replay is well-formed for a non-trivial grid', () => {
    const grid = makeGrid(3, 2, [
      { col: 0, row: 0 },
      { col: 1, row: 1 },
      { col: 2, row: 0 },
    ]);
    const result = generatePuzzle(grid, 'easy');

    expect(result).not.toBeNull();
    expect(result!.replay.stuck).toBe(false);
    expect(Array.isArray(result!.replay.steps)).toBe(true);
  });

  /**
   * T5: Result has all required fields (grid, clueSelection, edits, replay).
   *
   * Every field defined in PuzzleResult must be present with the correct type.
   */
  it('result has all required fields', () => {
    const grid = make2x1Grid();
    const result = generatePuzzle(grid, 'easy');

    expect(result).not.toBeNull();
    // grid
    expect(result!.grid).toBeDefined();
    expect(result!.grid.cells).toBeDefined();
    // clueSelection (may be null when progressive solving succeeds)
    if (result!.clueSelection !== null) {
      expect(result!.clueSelection.visibleClues instanceof Set).toBe(true);
      expect(typeof result!.clueSelection.difficulty).toBe('string');
      expect(result!.clueSelection.verifyResult).toBeDefined();
    }
    // edits
    expect(Array.isArray(result!.edits)).toBe(true);
    // replay
    expect(result!.replay).toBeDefined();
    expect(Array.isArray(result!.replay.steps)).toBe(true);
    expect(typeof result!.replay.stuck).toBe('boolean');
  });

  /**
   * T6: When selectClues succeeds, edits is empty and grid is the original.
   *
   * For grids that are directly solvable, the pipeline skips editing.
   */
  it('returns empty edits and original grid when selectClues succeeds', () => {
    const grid = make2x1Grid();
    const result = generatePuzzle(grid, 'easy');

    expect(result).not.toBeNull();
    expect(result!.edits).toHaveLength(0);
    expect(result!.grid).toBe(grid);
  });

  /**
   * T7: replay is always present and well-formed.
   */
  it('replay is present and not stuck', () => {
    const grid = make2x1Grid();
    const result = generatePuzzle(grid, 'easy');

    expect(result).not.toBeNull();
    expect(result!.replay).toBeDefined();
    expect(result!.replay.stuck).toBe(false);
  });

  /**
   * T8: Works correctly for easy and hard modes on a 3x3 grid.
   *
   * Both modes should produce a valid, non-stuck result.
   */
  it('works for easy and hard modes on a 3x3 grid', () => {
    const easyResult = generatePuzzle(make3x3Grid(), 'easy');
    const hardResult = generatePuzzle(make3x3Grid(), 'hard');

    expect(easyResult).not.toBeNull();
    expect(easyResult!.replay.stuck).toBe(false);

    expect(hardResult).not.toBeNull();
    expect(hardResult!.replay.stuck).toBe(false);
  });

  /**
   * T9: Does not mutate the original grid.
   *
   * Calling generatePuzzle must not change the original grid's cell states
   * or remainingCount.
   */
  it('does not mutate the original grid', () => {
    const grid = make3x3Grid();
    const originalRemaining = grid.remainingCount;
    const originalCellStates = new Map(
      Array.from(grid.cells.entries()).map(([k, v]) => [k, v.visualState]),
    );

    generatePuzzle(grid, 'easy');

    expect(grid.remainingCount).toBe(originalRemaining);
    for (const [key, state] of originalCellStates) {
      expect(grid.cells.get(key)!.visualState).toBe(state);
    }
  });

  /**
   * T10: clueSelection.difficulty matches when falling back to old approach.
   */
  it('clueSelection difficulty matches when present', () => {
    const easyResult = generatePuzzle(make2x1Grid(), 'easy');
    expect(easyResult).not.toBeNull();
    if (easyResult!.clueSelection !== null) {
      expect(easyResult!.clueSelection.difficulty).toBe('easy');
    }
    const hardResult = generatePuzzle(make2x1Grid(), 'hard');
    expect(hardResult).not.toBeNull();
    if (hardResult!.clueSelection !== null) {
      expect(hardResult!.clueSelection.difficulty).toBe('hard');
    }
  });
});
