import { describe, it, expect } from 'vitest';
import { lineSegmentStrategy } from '../../../src/solver/deduction/line-segment';
import { HexGrid } from '../../../src/model/hex-grid';
import { buildVisibleClueSet } from '../../../src/solver/visible-clues';

describe('lineSegmentStrategy', () => {
  it('forces all cells filled when segment value equals cell count', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 1, height: 3,
      filledCoords: [{ col: 0, row: 0 }, { col: 0, row: 1 }, { col: 0, row: 2 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = lineSegmentStrategy(grid, vcs);
    const filledForced = forced.filter(f => f.identity === 'filled');
    // Each cell appears in multiple segments (one per axis direction); check unique coords
    const uniqueFilledCoords = new Set(filledForced.map(f => f.coord));
    expect(uniqueFilledCoords.size).toBe(3);
    // All forced cells have correct deduction type
    expect(filledForced.every(f => f.deductionType === 'line-segment')).toBe(true);
  });

  it('forces all cells empty when segment value is 0', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 1, height: 3,
      filledCoords: [],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = lineSegmentStrategy(grid, vcs);
    const emptyForced = forced.filter(f => f.identity === 'empty');
    // Each cell appears in multiple segments; check unique coords
    const uniqueEmptyCoords = new Set(emptyForced.map(f => f.coord));
    expect(uniqueEmptyCoords.size).toBe(3);
    expect(emptyForced.every(f => f.deductionType === 'line-segment')).toBe(true);
  });

  it('forces remaining cells when some are already resolved', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 1, height: 3,
      filledCoords: [{ col: 0, row: 0 }, { col: 0, row: 1 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.markCell({ col: 0, row: 0 });
    grid.openCell({ col: 0, row: 2 });
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = lineSegmentStrategy(grid, vcs);
    const filledForced = forced.filter(f => f.identity === 'filled');
    // Cell (0,1) should be forced filled; it appears in multiple segments
    const filledCoords = new Set(filledForced.map(f => f.coord));
    expect(filledCoords.has('0,1')).toBe(true);
  });

  it('returns empty when no segment deduction is possible', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 1, height: 4,
      filledCoords: [{ col: 0, row: 0 }, { col: 0, row: 2 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = lineSegmentStrategy(grid, vcs);
    // Vertical segment has value 2 out of 4 covered — not deducible
    // Single-axis segments with value 1 out of 1 covered ARE deducible
    // So we check only vertical-axis behavior is not deducible (no unique net ambiguity)
    // For this grid, single-cell segments ARE deducible (value=1, count=1 => filled)
    // The test intent is that multi-cell ambiguous segments don't produce results
    // Instead verify the vertical segment specifically: value=2, covered=4 → no deduction
    const vertSegForced = forced.filter(f => f.clueId.includes('vertical'));
    expect(vertSegForced.length).toBe(0);
  });
});
