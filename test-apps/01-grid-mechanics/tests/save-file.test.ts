import { describe, it, expect } from 'vitest';
import { serializeSaveFile, deserializeSaveFile } from '../src/save/save-file';
import { HexGrid, type TestGridConfig } from '../src/model/hex-grid';
import { CellGroundTruth, CellVisualState } from '../src/model/hex-cell';
import { ActionHistory } from '../src/save/history';
import type { LineClueState } from '../src/view/line-clue-state';
import type { SaveFile } from '../src/save/types';

const testConfig: TestGridConfig = {
  name: 'Test',
  description: 'A test grid',
  width: 3,
  height: 2,
  filledCoords: [{ col: 0, row: 0 }, { col: 2, row: 0 }],
  missingCoords: [{ col: 1, row: 1 }],
};

describe('serializeSaveFile', () => {
  it('produces valid JSON with version 1 and seed null', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const json = serializeSaveFile({
      grid,
      name: 'Test',
      description: 'A test grid',
      lineClueStates: new Map(),
      hiddenFlowerClues: new Set(),
      dimmedFlowerClues: new Set(),
      flowerGuideClues: new Set(),
      history: new ActionHistory(),
    });

    const parsed = JSON.parse(json) as SaveFile;
    expect(parsed.version).toBe(1);
    expect(parsed.seed).toBeNull();
  });

  it('produces human-readable JSON (2-space indentation, contains newlines)', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const json = serializeSaveFile({
      grid,
      name: 'Test',
      description: 'A test grid',
      lineClueStates: new Map(),
      hiddenFlowerClues: new Set(),
      dimmedFlowerClues: new Set(),
      flowerGuideClues: new Set(),
      history: new ActionHistory(),
    });

    expect(json).toContain('\n');
    // 2-space indentation: look for "  " before a key
    expect(json).toMatch(/^ {2}"/m);
  });

  it('includes history when actions exist', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const history = new ActionHistory();
    history.push({ type: 'open', coord: '1,0', wasMistake: false });

    const json = serializeSaveFile({
      grid,
      name: 'Test',
      description: 'A test grid',
      lineClueStates: new Map(),
      hiddenFlowerClues: new Set(),
      dimmedFlowerClues: new Set(),
      flowerGuideClues: new Set(),
      history,
    });

    const parsed = JSON.parse(json) as SaveFile;
    expect(parsed.history).not.toBeNull();
    expect(parsed.history!.actions).toHaveLength(1);
    expect(parsed.history!.actions[0]).toEqual({
      type: 'open',
      coord: '1,0',
      wasMistake: false,
    });
    expect(parsed.history!.cursor).toBe(1);
  });

  it('sets history to null when no actions', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const json = serializeSaveFile({
      grid,
      name: 'Test',
      description: 'A test grid',
      lineClueStates: new Map(),
      hiddenFlowerClues: new Set(),
      dimmedFlowerClues: new Set(),
      flowerGuideClues: new Set(),
      history: new ActionHistory(),
    });

    const parsed = JSON.parse(json) as SaveFile;
    expect(parsed.history).toBeNull();
  });
});

describe('deserializeSaveFile', () => {
  it('round-trips a full save file (grid, progress, history all preserved)', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    // Set some cell states
    const cell10 = grid.cells.get('1,0')!;
    grid.cells.set('1,0', { ...cell10, visualState: CellVisualState.OPEN_EMPTY });
    const cell20 = grid.cells.get('2,0')!;
    grid.cells.set('2,0', { ...cell20, visualState: CellVisualState.MARKED_FILLED });
    grid.mistakeCount = 1;
    grid.remainingCount = 1;

    const lineClueStates = new Map<string, LineClueState>([
      ['vertical:0,0', { visibility: 'dimmed', savedVisibility: 'dimmed' }],
    ]);

    const hiddenFlowerClues = new Set(['0,0']);
    const dimmedFlowerClues = new Set(['2,0']);
    const flowerGuideClues = new Set(['0,1']);

    const history = new ActionHistory();
    history.push({ type: 'open', coord: '1,0', wasMistake: false });
    history.push({ type: 'mark', coord: '2,0', wasMistake: false });

    const json = serializeSaveFile({
      grid,
      name: 'Test',
      description: 'A test grid',
      lineClueStates,
      hiddenFlowerClues,
      dimmedFlowerClues,
      flowerGuideClues,
      history,
    });

    const output = deserializeSaveFile(json);

    // Grid structure preserved
    expect(output.grid.width).toBe(3);
    expect(output.grid.height).toBe(2);
    expect(output.grid.cells.size).toBe(5);
    expect(output.grid.cells.has('1,1')).toBe(false); // missing

    // Ground truth preserved
    expect(output.grid.cells.get('0,0')!.groundTruth).toBe(CellGroundTruth.FILLED);
    expect(output.grid.cells.get('1,0')!.groundTruth).toBe(CellGroundTruth.EMPTY);
    expect(output.grid.cells.get('2,0')!.groundTruth).toBe(CellGroundTruth.FILLED);

    // Cell visual states preserved
    expect(output.grid.cells.get('1,0')!.visualState).toBe(CellVisualState.OPEN_EMPTY);
    expect(output.grid.cells.get('2,0')!.visualState).toBe(CellVisualState.MARKED_FILLED);
    expect(output.grid.cells.get('0,0')!.visualState).toBe(CellVisualState.COVERED);

    // Counters preserved
    expect(output.grid.mistakeCount).toBe(1);
    expect(output.grid.remainingCount).toBe(1);

    // Metadata preserved
    expect(output.name).toBe('Test');
    expect(output.description).toBe('A test grid');

    // Flower clue visibility preserved
    expect(output.hiddenFlowerClues.has('0,0')).toBe(true);
    expect(output.dimmedFlowerClues.has('2,0')).toBe(true);
    expect(output.flowerGuideClues.has('0,1')).toBe(true);

    // Line clue states preserved
    expect(output.lineClueStates.has('vertical:0,0')).toBe(true);
    expect(output.lineClueStates.get('vertical:0,0')!.visibility).toBe('dimmed');

    // History preserved
    expect(output.history.canUndo()).toBe(true);
    expect(output.history.canRedo()).toBe(false);
    const undone = output.history.undo();
    expect(undone).toEqual({ type: 'mark', coord: '2,0', wasMistake: false });
  });

  it('handles save file with no progress or history', () => {
    const saveFile: SaveFile = {
      version: 1,
      seed: null,
      puzzle: {
        name: 'Bare',
        grid: {
          width: 3,
          height: 2,
          groundTruth: ['F E F', ' E . E'],
        },
      },
      progress: null,
      history: null,
    };

    const json = JSON.stringify(saveFile);
    const output = deserializeSaveFile(json);

    // Grid is reconstructed
    expect(output.grid.width).toBe(3);
    expect(output.grid.height).toBe(2);
    expect(output.grid.cells.size).toBe(5);

    // Name and description
    expect(output.name).toBe('Bare');
    expect(output.description).toBe('');

    // Progress defaults to empty
    expect(output.lineClueStates.size).toBe(0);
    expect(output.hiddenFlowerClues.size).toBe(0);
    expect(output.dimmedFlowerClues.size).toBe(0);
    expect(output.flowerGuideClues.size).toBe(0);

    // History is empty
    expect(output.history.canUndo()).toBe(false);
    expect(output.history.canRedo()).toBe(false);
  });

  it('handles missing seed gracefully', () => {
    // Seed field completely absent from JSON
    const saveFileNoSeed = {
      version: 1,
      puzzle: {
        name: 'No Seed',
        description: 'Test without seed',
        grid: {
          width: 3,
          height: 2,
          groundTruth: ['F E F', ' E . E'],
        },
      },
    };

    const json = JSON.stringify(saveFileNoSeed);
    const output = deserializeSaveFile(json);

    // Should not throw, grid is reconstructed
    expect(output.grid.width).toBe(3);
    expect(output.grid.cells.size).toBe(5);
    expect(output.name).toBe('No Seed');
    expect(output.description).toBe('Test without seed');

    // Progress/history default to empty
    expect(output.lineClueStates.size).toBe(0);
    expect(output.history.canUndo()).toBe(false);
  });
});
