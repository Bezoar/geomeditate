import { describe, it, expect } from 'vitest';
import { buildVisibleClueSet } from '../../src/solver/visible-clues';
import { HexGrid } from '../../src/model/hex-grid';
import type { SegmentState } from '../../src/view/segment-state';

function makeTiny3Grid(): HexGrid {
  const grid = new HexGrid({
    name: 'test', description: '', width: 3, height: 1,
    filledCoords: [{ col: 1, row: 0 }],
    missingCoords: [],
  });
  grid.computeAllClues();
  return grid;
}

describe('buildVisibleClueSet', () => {
  it('returns empty neighbor and flower clues when all cells are COVERED', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    expect(vcs.neighborClues.size).toBe(0);
    expect(vcs.flowerClues.size).toBe(0);
  });

  it('includes neighbor clue when cell is OPEN_EMPTY', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    grid.openCell({ col: 0, row: 0 });
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    expect(vcs.neighborClues.has('0,0')).toBe(true);
  });

  it('excludes neighbor clue when cell is COVERED', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    expect(vcs.neighborClues.has('0,0')).toBe(false);
  });

  it('includes flower clue for MARKED_FILLED cell when not hidden', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    grid.markCell({ col: 1, row: 0 });
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    expect(vcs.flowerClues.has('1,0')).toBe(true);
  });

  it('excludes flower clue when cell is in hiddenFlowerClues', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    grid.markCell({ col: 1, row: 0 });
    const hidden = new Set(['1,0']);
    const vcs = buildVisibleClueSet(grid, new Map(), hidden);
    expect(vcs.flowerClues.has('1,0')).toBe(false);
  });

  it('includes visible line segments', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    expect(vcs.lineSegments.size).toBeGreaterThan(0);
  });

  it('excludes invisible line segments', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const segStates = new Map<string, SegmentState>();
    for (const segId of grid.segments.keys()) {
      segStates.set(segId, {
        visibility: 'invisible',
        savedVisibility: 'visible',
        activated: true,
      });
    }
    const vcs = buildVisibleClueSet(grid, segStates, new Set());
    expect(vcs.lineSegments.size).toBe(0);
  });
});
