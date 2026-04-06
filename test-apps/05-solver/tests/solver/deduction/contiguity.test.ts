import { describe, it, expect } from 'vitest';
import { contiguityStrategy } from '../../../src/solver/deduction/contiguity';
import { HexGrid } from '../../../src/model/hex-grid';
import { buildVisibleClueSet } from '../../../src/solver/visible-clues';
import { neighbors } from '../../../src/model/hex-coord';

describe('contiguityStrategy', () => {
  it('contiguous constraint forces adjacent placement', () => {
    const center = { col: 2, row: 2 };
    const nbrs = neighbors(center);
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: [nbrs[0], nbrs[1]],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell(center);
    grid.markCell(nbrs[0]);
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = contiguityStrategy(grid, vcs);
    expect(forced.length).toBeGreaterThan(0);
  });

  it('discontiguous constraint forces non-adjacent placement', () => {
    const center = { col: 2, row: 2 };
    const nbrs = neighbors(center);
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: [nbrs[0], nbrs[3]],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell(center);
    grid.markCell(nbrs[0]);
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = contiguityStrategy(grid, vcs);
    expect(forced.length).toBeGreaterThan(0);
  });

  it('returns empty when contiguity does not narrow down cells', () => {
    const center = { col: 2, row: 2 };
    const nbrs = neighbors(center);
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: [nbrs[0], nbrs[1], nbrs[2]],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell(center);
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = contiguityStrategy(grid, vcs);
    expect(forced.length).toBe(0);
  });
});
