/**
 * Edge-case coverage tests for progressive solver branches that are hard
 * to trigger through normal grid configurations.
 */
import { describe, it, expect, vi } from 'vitest';
import { HexGrid } from '../../src/model/hex-grid';
import type { TestGridConfig } from '../../src/model/hex-grid';

// Mock the solver to control deduction output
const mockSolve = vi.hoisted(() => vi.fn());
vi.mock('../../src/solver/solver', () => ({
  solve: mockSolve,
}));

const { solveProgressively } = await import('../../src/solver/progressive');

function makeGrid(): HexGrid {
  const config: TestGridConfig = {
    name: 'edge-test',
    description: 'edge case test',
    width: 2,
    height: 1,
    filledCoords: [{ col: 0, row: 0 }],
    missingCoords: [],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  return grid;
}

describe('progressive solver edge cases', () => {
  it('returns stuck when no clue can unblock progress', () => {
    // solve() always returns empty — no deductions possible, no clue helps
    mockSolve.mockReturnValue([]);

    const grid = makeGrid();
    const replay = solveProgressively(grid, 'simple');

    expect(replay.stuck).toBe(true);
    expect(replay.stuckCells).toBeDefined();
    expect(replay.stuckCells!.size).toBeGreaterThan(0);
  });

  it('skips deductions for cells not in the grid', () => {
    // First call: return a deduction for a nonexistent cell
    // Second call: return empty (triggers clue search)
    // After clue reveal + third call: return deductions for real cells
    let callCount = 0;
    mockSolve.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Return a deduction for a cell that doesn't exist
        return [{
          coord: { col: 99, row: 99 },
          result: 'filled' as const,
          reason: { clueIds: [], explanation: 'phantom' },
        }];
      }
      if (callCount <= 3) return [];
      // After clue reveals, solve everything
      return [
        { coord: { col: 0, row: 0 }, result: 'filled' as const, reason: { clueIds: [], explanation: 'solved' } },
        { coord: { col: 1, row: 0 }, result: 'empty' as const, reason: { clueIds: [], explanation: 'solved' } },
      ];
    });

    const grid = makeGrid();
    const replay = solveProgressively(grid, 'simple');
    // The phantom deduction should be skipped (no step recorded for 99,99)
    const hasPhantom = replay.steps.some(s =>
      s.deductions.some(d => d.coord.col === 99),
    );
    expect(hasPhantom).toBe(false);
  });
});
