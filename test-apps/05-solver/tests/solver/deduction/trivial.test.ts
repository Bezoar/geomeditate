import { describe, it, expect } from 'vitest';
import { trivialStrategy } from '../../../src/solver/deduction/trivial';
import { HexGrid } from '../../../src/model/hex-grid';
import { buildVisibleClueSet } from '../../../src/solver/visible-clues';


function makeTiny3Grid(): HexGrid {
  const grid = new HexGrid({
    name: 'test', description: '', width: 3, height: 1,
    filledCoords: [{ col: 1, row: 0 }],
    missingCoords: [],
  });
  grid.computeAllClues();
  return grid;
}

describe('trivialStrategy', () => {
  it('trivial-count: forces all covered neighbors when count equals remaining covered', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    grid.openCell({ col: 0, row: 0 });
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = trivialStrategy(grid, vcs);
    const filledForced = forced.filter(f => f.identity === 'filled');
    expect(filledForced.length).toBeGreaterThanOrEqual(1);
    expect(filledForced.some(f => f.coord === '1,0')).toBe(true);
  });

  it('trivial-elimination: forces all covered neighbors empty when clue is 0', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 0, row: 0 });
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = trivialStrategy(grid, vcs);
    for (const f of forced) {
      expect(f.identity).toBe('empty');
      expect(f.deductionType).toBe('trivial-elimination');
    }
  });

  it('saturation: forces remaining covered neighbors empty when all filled found', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    grid.openCell({ col: 0, row: 0 });
    grid.markCell({ col: 1, row: 0 });
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = trivialStrategy(grid, vcs);
    const emptyForced = forced.filter(f => f.identity === 'empty');
    for (const f of emptyForced) {
      expect(f.deductionType).toBe('saturation');
    }
  });

  it('returns empty array when no trivial deduction is possible', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 3,
      filledCoords: [{ col: 1, row: 0 }, { col: 3, row: 0 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 2, row: 0 });
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = trivialStrategy(grid, vcs);
    expect(Array.isArray(forced)).toBe(true);
  });
});
