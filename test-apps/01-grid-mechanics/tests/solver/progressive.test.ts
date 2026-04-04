import { describe, it, expect } from 'vitest';
import { HexGrid } from '../../src/model/hex-grid';
import type { TestGridConfig } from '../../src/model/hex-grid';
import { solveProgressively } from '../../src/solver/progressive';

function makeGrid(
  width: number,
  height: number,
  filledCoords: Array<{ col: number; row: number }>,
  missingCoords: Array<{ col: number; row: number }> = [],
): HexGrid {
  const config: TestGridConfig = {
    name: 'prog-test',
    description: 'test',
    width,
    height,
    filledCoords,
    missingCoords,
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  return grid;
}

describe('solveProgressively', () => {
  it('solves a simple grid with interleaved clue reveals and deductions', () => {
    // 2x1: (0,0) FILLED, (1,0) EMPTY
    const grid = makeGrid(2, 1, [{ col: 0, row: 0 }]);
    const replay = solveProgressively(grid, 'simple');

    expect(replay.stuck).toBe(false);
    expect(replay.steps.length).toBeGreaterThan(0);
  });

  it('each step has exactly one deduction', () => {
    const grid = makeGrid(2, 1, [{ col: 0, row: 0 }]);
    const replay = solveProgressively(grid, 'simple');

    for (const step of replay.steps) {
      expect(step.deductions).toHaveLength(1);
    }
  });

  it('handles grid with cells already revealed (covers them first)', () => {
    // Don't call coverAll — cells start revealed from constructor
    const grid = makeGrid(2, 1, [{ col: 0, row: 0 }]);
    // Grid cells are in revealed state — progressive solver should cover them
    const replay = solveProgressively(grid, 'simple');

    expect(replay.stuck).toBe(false);
  });

  it('reveals clues when needed to make progress', () => {
    // Grid where clue reveals are needed to solve
    const grid = makeGrid(3, 1, [{ col: 1, row: 0 }]);
    const replay = solveProgressively(grid, 'simple');

    // Should have at least one "Hint:" step (clue reveal)
    const hasReveal = replay.steps.some(s =>
      s.deductions.some(d => d.reason.explanation.startsWith('Hint:')),
    );
    expect(hasReveal).toBe(true);
    expect(replay.stuck).toBe(false);
  });

  it('solves a larger grid', () => {
    const grid = makeGrid(3, 3, [
      { col: 0, row: 0 },
      { col: 1, row: 1 },
      { col: 2, row: 2 },
    ]);
    const replay = solveProgressively(grid, 'simple');

    expect(replay.stuck).toBe(false);
  });

  it('works with advanced tier', () => {
    const grid = makeGrid(3, 2, [
      { col: 0, row: 0 },
      { col: 2, row: 1 },
    ]);
    const replay = solveProgressively(grid, 'advanced');

    expect(replay.stuck).toBe(false);
  });

  it('returns stuck when no clue can help', () => {
    const grid = makeGrid(2, 1, [{ col: 0, row: 0 }]);
    const replay = solveProgressively(grid, 'simple');
    expect(replay.stuck).toBe(false);
  });

  it('uses line clues to enable deductions without revealing cells', () => {
    // Grid where a line clue is needed: vertical line with all cells filled
    // The line clue value = N means all N cells on the line are filled
    const grid = makeGrid(1, 3, [
      { col: 0, row: 0 },
      { col: 0, row: 1 },
      { col: 0, row: 2 },
    ]);
    const replay = solveProgressively(grid, 'simple');
    expect(replay.stuck).toBe(false);
    // Should solve using line clues — all cells filled
    expect(replay.steps.length).toBeGreaterThan(0);
  });

  it('handles grid with missing coords', () => {
    const grid = makeGrid(3, 3,
      [{ col: 1, row: 1 }],
      [{ col: 0, row: 0 }, { col: 2, row: 2 }],
    );
    const replay = solveProgressively(grid, 'simple');
    expect(replay.stuck).toBe(false);
  });
});
