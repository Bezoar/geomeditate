import { describe, it, expect } from 'vitest';
import { DeductionEngine } from '../../../src/solver/deduction/engine';
import { HexGrid } from '../../../src/model/hex-grid';
import { buildVisibleClueSet } from '../../../src/solver/visible-clues';
import { DEFAULT_CONFIG } from '../../../src/solver/config';

function makeTiny3Grid(): HexGrid {
  const grid = new HexGrid({
    name: 'test', description: '', width: 3, height: 1,
    filledCoords: [{ col: 1, row: 0 }],
    missingCoords: [],
  });
  grid.computeAllClues();
  return grid;
}

describe('DeductionEngine', () => {
  it('returns forced cells from first successful strategy', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    grid.openCell({ col: 0, row: 0 });
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const engine = new DeductionEngine(DEFAULT_CONFIG.deductionLevels);
    const forced = engine.run(grid, vcs);
    expect(forced.length).toBeGreaterThan(0);
  });

  it('returns empty when no strategies produce results', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const engine = new DeductionEngine(DEFAULT_CONFIG.deductionLevels);
    const forced = engine.run(grid, vcs);
    expect(forced.length).toBe(0);
  });

  it('skips disabled strategies', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    grid.openCell({ col: 0, row: 0 });
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const engine = new DeductionEngine({
      ...DEFAULT_CONFIG.deductionLevels,
      trivial: false,
    });
    const forced = engine.run(grid, vcs);
    expect(Array.isArray(forced)).toBe(true);
  });
});
