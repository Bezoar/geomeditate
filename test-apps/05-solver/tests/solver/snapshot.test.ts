import { describe, it, expect } from 'vitest';
import { captureSnapshot } from '../../src/solver/snapshot';
import { HexGrid } from '../../src/model/hex-grid';
import type { SegmentState } from '../../src/view/segment-state';

describe('captureSnapshot', () => {
  it('captures cell visual states', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [{ col: 1, row: 0 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    const snap = captureSnapshot(grid, new Map(), new Set());
    expect(snap.cells.length).toBeGreaterThan(0);
  });

  it('captures segment visibility overrides', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [{ col: 1, row: 0 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    const segStates = new Map<string, SegmentState>();
    const segId = grid.segments.keys().next().value!;
    segStates.set(segId, { visibility: 'invisible', savedVisibility: 'visible', activated: true });
    const snap = captureSnapshot(grid, segStates, new Set());
    expect(Object.keys(snap.segmentVisibility).length).toBeGreaterThan(0);
  });

  it('captures hidden flower clues', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [{ col: 1, row: 0 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    const snap = captureSnapshot(grid, new Map(), new Set(['1,0']));
    expect(snap.hiddenFlowerClues).toContain('1,0');
  });

  it('returns empty segment visibility when no overrides', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [{ col: 1, row: 0 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    const snap = captureSnapshot(grid, new Map(), new Set());
    expect(Object.keys(snap.segmentVisibility).length).toBe(0);
  });

  it('returns empty hidden flower clues when none hidden', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 3, height: 1,
      filledCoords: [{ col: 1, row: 0 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    const snap = captureSnapshot(grid, new Map(), new Set());
    expect(snap.hiddenFlowerClues.length).toBe(0);
  });
});
