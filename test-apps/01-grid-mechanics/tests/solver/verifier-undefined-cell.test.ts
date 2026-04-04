/**
 * Isolated test for the `cell === undefined` guard in applyDeductions (verifier.ts line 93).
 *
 * The guard fires when solve() returns a deduction for a coord that is not
 * present in the simulation's cell map. We use vi.mock to make solve() return
 * such a deduction so the branch is exercised.
 */
import { describe, it, expect, vi } from 'vitest';
import { HexGrid } from '../../src/model/hex-grid';
import type { TestGridConfig } from '../../src/model/hex-grid';
import type { Deduction } from '../../src/solver/deductions';
import { neighborClueId } from '../../src/solver/deductions';

// Hoist the mock so it intercepts the import inside verifier.ts.
// First call: return a deduction for coord {col:99,row:99} which does not
// exist in the 2x1 grid, exercising the `cell === undefined` branch.
// Subsequent calls: return an empty array so the loop terminates.
vi.mock('../../src/solver/solver', () => ({
  solve: vi.fn()
    .mockReturnValueOnce([
      {
        coord: { col: 99, row: 99 },
        result: 'filled',
        reason: { clueIds: [], explanation: 'phantom' },
      } satisfies Deduction,
    ])
    .mockReturnValue([]),
}));

import { verify } from '../../src/solver/verifier';

describe('verify – applyDeductions cell === undefined guard', () => {
  /**
   * T: When solve() returns a deduction for a coord absent from the cell map,
   * applyDeductions silently skips it (the `cell === undefined` guard at line 93
   * is hit). The verify() call must not throw and must still return a result.
   */
  it('skips deductions for coords not present in the cell map', () => {
    const config: TestGridConfig = {
      name: 'test-2x1',
      description: '2x1 grid for undefined-cell guard test',
      width: 2,
      height: 1,
      filledCoords: [{ col: 0, row: 0 }],
      missingCoords: [],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();

    const visibleClues = new Set([neighborClueId({ col: 1, row: 0 })]);

    // solve() returns phantom coord on first iteration → cell === undefined → skip
    // solve() returns [] on second iteration → loop breaks
    // Both cells remain COVERED → stuck=true
    const replay = verify(grid, visibleClues, 'simple');

    // The phantom deduction was silently skipped; no throw occurred.
    expect(replay).toBeDefined();
    // Both real cells are still COVERED since solve() never produced valid deductions.
    expect(replay.stuck).toBe(true);
  });
});
