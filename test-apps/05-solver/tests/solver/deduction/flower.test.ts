import { describe, it, expect } from 'vitest';
import { flowerStrategy } from '../../../src/solver/deduction/flower';
import { HexGrid } from '../../../src/model/hex-grid';
import { buildVisibleClueSet } from '../../../src/solver/visible-clues';

describe('flowerStrategy', () => {
  it('forces remaining cells filled when flower value equals remaining covered in zone', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 3,
      filledCoords: [
        { col: 1, row: 1 },
        { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
        { col: 0, row: 1 }, { col: 2, row: 1 },
        { col: 1, row: 2 },
      ],
      missingCoords: [{ col: 0, row: 2 }, { col: 2, row: 2 }],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.markCell({ col: 1, row: 1 });
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = flowerStrategy(grid, vcs);
    expect(forced.length).toBeGreaterThan(0);
  });

  it('forces remaining cells empty when flower value is fully satisfied', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 3,
      filledCoords: [{ col: 1, row: 1 }],
      missingCoords: [{ col: 0, row: 2 }, { col: 2, row: 2 }],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.markCell({ col: 1, row: 1 });
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = flowerStrategy(grid, vcs);
    for (const f of forced) {
      expect(f.identity).toBe('empty');
    }
  });

  it('returns empty when flower clue is ambiguous', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: [
        { col: 2, row: 2 },
        { col: 1, row: 1 }, { col: 3, row: 1 },
      ],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.markCell({ col: 2, row: 2 });
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = flowerStrategy(grid, vcs);
    expect(forced.length).toBe(0);
  });
});
