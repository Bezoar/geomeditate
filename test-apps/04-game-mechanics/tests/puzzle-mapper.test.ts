import { describe, it, expect } from 'vitest';
import { serializePuzzle, deserializePuzzle } from '../src/save/puzzle-mapper';
import { HexGrid, type TestGridConfig } from '../src/model/hex-grid';
import { CellGroundTruth } from '../src/model/hex-cell';
import { coordKey } from '../src/model/hex-coord';
import type { PuzzleDef } from '../src/save/types';

const testConfig: TestGridConfig = {
  name: 'Test Grid',
  description: 'A test grid',
  width: 3,
  height: 2,
  filledCoords: [{ col: 0, row: 0 }, { col: 2, row: 0 }],
  missingCoords: [{ col: 1, row: 1 }],
};

describe('serializePuzzle', () => {
  it('serializes grid dimensions and ground truth', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    const result = serializePuzzle(grid, 'Test Grid', 'A test grid');
    expect(result.name).toBe('Test Grid');
    expect(result.grid.width).toBe(3);
    expect(result.grid.height).toBe(2);
    expect(result.grid.groundTruth).toEqual([
      'F E F',
      ' E . E',
    ]);
  });

  it('serializes non-default contiguity as clue overrides', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    const cell = grid.cells.get('1,0')!;
    grid.cells.set('1,0', { ...cell, contiguityEnabled: false });
    const result = serializePuzzle(grid, 'Test', '');
    expect(result.clues?.neighbors?.['1,0']?.contiguity).toBe(false);
  });

  it('serializes non-default line clue contiguity', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.lineClues[0] = { ...grid.lineClues[0], contiguityEnabled: false };
    const result = serializePuzzle(grid, 'Test', '');
    const lineKey = `${grid.lineClues[0].axis.charAt(0)}:${coordKey(grid.lineClues[0].startCoord)}`;
    expect(result.clues?.lines?.[lineKey]?.contiguity).toBe(false);
  });

  it('does not serialize contiguity override for filled cells (no neighbor clue)', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    // 0,0 is FILLED so neighborClueValue is null — override should be ignored
    const filledCell = grid.cells.get('0,0')!;
    expect(filledCell.neighborClueValue).toBeNull();
    grid.cells.set('0,0', { ...filledCell, contiguityEnabled: false });
    const result = serializePuzzle(grid, 'Test', '');
    expect(result.clues).toBeNull();
  });

  it('omits clues section when all defaults', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    const result = serializePuzzle(grid, 'Test', '');
    expect(result.clues).toBeNull();
  });
});

describe('deserializePuzzle', () => {
  it('reconstructs grid from ground truth strings', () => {
    const puzzle: PuzzleDef = {
      name: 'Test',
      grid: {
        width: 3,
        height: 2,
        groundTruth: ['F E F', ' E . E'],
      },
    };
    const grid = deserializePuzzle(puzzle);
    expect(grid.width).toBe(3);
    expect(grid.height).toBe(2);
    expect(grid.cells.size).toBe(5);
    expect(grid.cells.get('0,0')!.groundTruth).toBe(CellGroundTruth.FILLED);
    expect(grid.cells.get('1,0')!.groundTruth).toBe(CellGroundTruth.EMPTY);
    expect(grid.cells.has('1,1')).toBe(false);
  });

  it('applies contiguity overrides', () => {
    const puzzle: PuzzleDef = {
      name: 'Test',
      grid: {
        width: 3,
        height: 2,
        groundTruth: ['F E F', ' E . E'],
      },
      clues: {
        neighbors: { '1,0': { contiguity: false } },
      },
    };
    const grid = deserializePuzzle(puzzle);
    expect(grid.cells.get('1,0')!.contiguityEnabled).toBe(false);
    expect(grid.cells.get('2,1')!.contiguityEnabled).toBe(true);
  });

  it('applies line clue contiguity overrides', () => {
    // First, serialize a grid with a line clue override to discover valid keys
    const grid1 = new HexGrid(testConfig);
    grid1.computeAllClues();
    expect(grid1.lineClues.length).toBeGreaterThan(0);
    const firstClue = grid1.lineClues[0];
    const lineKey = `${firstClue.axis.charAt(0)}:${coordKey(firstClue.startCoord)}`;

    const puzzle: PuzzleDef = {
      name: 'Test',
      grid: {
        width: 3,
        height: 2,
        groundTruth: ['F E F', ' E . E'],
      },
      clues: {
        lines: { [lineKey]: { contiguity: false } },
      },
    };
    const grid = deserializePuzzle(puzzle);
    const matchingClue = grid.lineClues.find(
      (lc) => `${lc.axis.charAt(0)}:${coordKey(lc.startCoord)}` === lineKey,
    );
    expect(matchingClue).toBeDefined();
    expect(matchingClue!.contiguityEnabled).toBe(false);
  });

  it('ignores line clue overrides for non-existent keys', () => {
    const puzzle: PuzzleDef = {
      name: 'Test',
      grid: {
        width: 3,
        height: 2,
        groundTruth: ['F E F', ' E . E'],
      },
      clues: {
        lines: { 'x:99,99': { contiguity: false } },
      },
    };
    const grid = deserializePuzzle(puzzle);
    // All line clues should remain with default contiguity
    for (const lc of grid.lineClues) {
      expect(lc.contiguityEnabled).toBe(true);
    }
  });

  it('round-trips through serialize/deserialize', () => {
    const grid1 = new HexGrid(testConfig);
    grid1.computeAllClues();
    const cell = grid1.cells.get('1,0')!;
    grid1.cells.set('1,0', { ...cell, contiguityEnabled: false });

    const puzzle = serializePuzzle(grid1, 'Round Trip', 'Test');
    const grid2 = deserializePuzzle(puzzle);

    for (const [key, c1] of grid1.cells) {
      const c2 = grid2.cells.get(key);
      expect(c2).toBeDefined();
      expect(c2!.groundTruth).toBe(c1.groundTruth);
    }
    expect(grid2.cells.get('1,0')!.contiguityEnabled).toBe(false);
  });

  it('round-trips line clue contiguity overrides', () => {
    const grid1 = new HexGrid(testConfig);
    grid1.computeAllClues();
    grid1.lineClues[0] = { ...grid1.lineClues[0], contiguityEnabled: false };

    const puzzle = serializePuzzle(grid1, 'Line RT', '');
    const grid2 = deserializePuzzle(puzzle);

    const key0 = `${grid1.lineClues[0].axis.charAt(0)}:${coordKey(grid1.lineClues[0].startCoord)}`;
    const match = grid2.lineClues.find(
      (lc) => `${lc.axis.charAt(0)}:${coordKey(lc.startCoord)}` === key0,
    );
    expect(match).toBeDefined();
    expect(match!.contiguityEnabled).toBe(false);
  });
});
