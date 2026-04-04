import { describe, it, expect } from 'vitest';
import { HexGrid } from '../../src/model/hex-grid';
import type { TestGridConfig } from '../../src/model/hex-grid';
import { CellVisualState } from '../../src/model/hex-cell';
import { neighborClueId } from '../../src/solver/deductions';
import { verify } from '../../src/solver/verifier';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function make2x1Grid(filledCoords: Array<{ col: number; row: number }>): HexGrid {
  const config: TestGridConfig = {
    name: 'test-2x1',
    description: '2-cell wide, 1-cell tall grid for verifier tests',
    width: 2,
    height: 1,
    filledCoords,
    missingCoords: [],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('verify', () => {
  /**
   * T1: Returns stuck=false (solvable) when all cells can be deduced.
   *
   * Grid: 2x1 — (0,0) FILLED, (1,0) EMPTY.
   * The neighbor clue at (1,0) is pre-revealed (OPEN_EMPTY) because it's an EMPTY cell.
   * With neighborClueId({col:1,row:0}) visible, the solver deduces (0,0) is filled.
   * All cells then resolved → stuck=false.
   */
  it('returns stuck=false when all cells can be deduced', () => {
    const grid = make2x1Grid([{ col: 0, row: 0 }]);
    const visibleClues = new Set([neighborClueId({ col: 1, row: 0 })]);

    const replay = verify(grid, visibleClues, 'simple');

    expect(replay.stuck).toBe(false);
    expect(replay.stuckCells).toBeUndefined();
  });

  /**
   * T2: Returns stuck=true when solver cannot proceed.
   *
   * Grid: 2x1 — (0,0) FILLED, (1,0) EMPTY, no visible clues.
   * Solver cannot deduce anything → stuck=true.
   */
  it('returns stuck=true when no visible clues provided', () => {
    const grid = make2x1Grid([{ col: 0, row: 0 }]);
    const visibleClues = new Set<string>();

    const replay = verify(grid, visibleClues, 'simple');

    expect(replay.stuck).toBe(true);
    expect(replay.stuckCells).toBeDefined();
    expect(replay.stuckCells!.size).toBeGreaterThan(0);
  });

  /**
   * T3: Steps array has non-empty deductions at each step.
   *
   * Grid: 2x1 — (0,0) FILLED, (1,0) EMPTY.
   * With the neighbor clue visible, there should be at least one step
   * and every recorded step should have at least one deduction.
   */
  it('records steps with non-empty deductions', () => {
    const grid = make2x1Grid([{ col: 0, row: 0 }]);
    const visibleClues = new Set([neighborClueId({ col: 1, row: 0 })]);

    const replay = verify(grid, visibleClues, 'simple');

    expect(replay.steps.length).toBeGreaterThan(0);
    for (const step of replay.steps) {
      expect(step.deductions.length).toBeGreaterThan(0);
    }
  });

  /**
   * T4: boardState in the last step has no COVERED cells when fully solvable.
   *
   * Grid: 2x1 — (0,0) FILLED, (1,0) EMPTY.
   * After solving, (0,0) should be MARKED_FILLED and (1,0) OPEN_EMPTY.
   * No cell should remain COVERED.
   */
  it('boardState in last step has no COVERED cells for solvable grid', () => {
    const grid = make2x1Grid([{ col: 0, row: 0 }]);
    const visibleClues = new Set([neighborClueId({ col: 1, row: 0 })]);

    const replay = verify(grid, visibleClues, 'simple');

    expect(replay.steps.length).toBeGreaterThan(0);
    const lastStep = replay.steps[replay.steps.length - 1];
    for (const state of lastStep.boardState.values()) {
      expect(state).not.toBe(CellVisualState.COVERED);
    }
  });

  /**
   * T5: Does not mutate the original grid.
   *
   * After running verify, the original grid's cells should still be COVERED
   * (as set up by coverAll).
   */
  it('does not mutate the original grid', () => {
    const grid = make2x1Grid([{ col: 0, row: 0 }]);
    const visibleClues = new Set([neighborClueId({ col: 1, row: 0 })]);

    // Capture original visual states
    const originalStates = new Map<string, CellVisualState>();
    for (const [key, cell] of grid.cells) {
      originalStates.set(key, cell.visualState);
    }
    const originalRemaining = grid.remainingCount;

    verify(grid, visibleClues, 'simple');

    // Original grid should be unchanged
    for (const [key, cell] of grid.cells) {
      expect(cell.visualState).toBe(originalStates.get(key));
    }
    expect(grid.remainingCount).toBe(originalRemaining);
  });

  /**
   * T6: stuckCells contains the correct covered cell keys when stuck.
   *
   * Grid: 2x1 — (0,0) FILLED, (1,0) EMPTY, no visible clues.
   * Both cells remain COVERED → stuckCells should contain their keys.
   */
  it('stuckCells contains keys of remaining COVERED cells', () => {
    const grid = make2x1Grid([{ col: 0, row: 0 }]);
    const visibleClues = new Set<string>();

    const replay = verify(grid, visibleClues, 'simple');

    expect(replay.stuck).toBe(true);
    // Both cells start COVERED (coverAll was called), none get revealed
    // (1,0) is pre-revealed as OPEN_EMPTY by verifier, so only (0,0) is stuck
    expect(replay.stuckCells!.has('0,0')).toBe(true);
  });

  /**
   * T7: boardState snapshot is a copy (not a live reference to the sim's cells).
   *
   * Each step's boardState should be independent — modifying one should not
   * affect others. We verify that boardState entries are actual CellVisualState
   * values (strings), not live cell objects.
   */
  it('boardState stores CellVisualState values (not live references)', () => {
    const grid = make2x1Grid([{ col: 0, row: 0 }]);
    const visibleClues = new Set([neighborClueId({ col: 1, row: 0 })]);

    const replay = verify(grid, visibleClues, 'simple');

    for (const step of replay.steps) {
      for (const state of step.boardState.values()) {
        expect(Object.values(CellVisualState)).toContain(state);
      }
    }
  });

  /**
   * T8: steps is empty when grid starts with no COVERED cells.
   *
   * Grid: 1x1 — (0,0) EMPTY, already pre-revealed as OPEN_EMPTY by verifier.
   * coverAll() sets it to COVERED, but the pre-reveal step opens (0,0) since
   * it hosts a neighbor clue. The solver then finds no covered cells to deduce → no steps.
   */
  it('returns empty steps when grid is already fully resolved after pre-reveal', () => {
    const config: TestGridConfig = {
      name: 'test-1x1',
      description: '1-cell grid, empty',
      width: 1,
      height: 1,
      filledCoords: [],
      missingCoords: [],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();

    // Reveal the only cell's neighbor clue by including it as visible
    const visibleClues = new Set([neighborClueId({ col: 0, row: 0 })]);
    const replay = verify(grid, visibleClues, 'simple');

    // After pre-reveal, (0,0) is OPEN_EMPTY. No covered cells remain.
    // The solver produces no deductions → no steps.
    expect(replay.steps).toHaveLength(0);
    expect(replay.stuck).toBe(false);
  });
});
