/**
 * Isolated test for the null-return path in selectClues.
 * This file uses vi.mock to intercept the verifier module, which affects
 * the entire file. Other clue-selector tests are in clue-selector.test.ts.
 */
import { describe, it, expect, vi } from 'vitest';
import { HexGrid } from '../../src/model/hex-grid';
import type { TestGridConfig } from '../../src/model/hex-grid';

// Hoist the mock so it intercepts the import inside clue-selector.ts
vi.mock('../../src/solver/verifier', () => ({
  verify: vi.fn(() => ({
    steps: [],
    stuck: true,
    stuckCells: new Set(['0,0']),
  })),
}));

import { selectClues } from '../../src/solver/clue-selector';

describe('selectClues null path', () => {
  /**
   * T4: Returns null when verify returns stuck=true for all clues.
   *
   * We use vi.mock (hoisted) to make verify always return stuck=true,
   * simulating a grid that is completely unsolvable even with all clues.
   */
  it('returns null when verify returns stuck=true for all clues', () => {
    const config: TestGridConfig = {
      name: 'test-2x1',
      description: '2x1 grid — verify is mocked to always return stuck',
      width: 2,
      height: 1,
      filledCoords: [{ col: 0, row: 0 }],
      missingCoords: [],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();

    const selection = selectClues(grid, 'easy');
    expect(selection).toBeNull();
  });
});
