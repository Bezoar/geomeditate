import { describe, it, expect } from 'vitest';
import { serializeProgress, deserializeProgress } from '../src/save/progress-mapper';
import { HexGrid, type TestGridConfig } from '../src/model/hex-grid';
import { CellVisualState } from '../src/model/hex-cell';
import type { LineClueState } from '../src/view/line-clue-state';
import type { ProgressState } from '../src/save/types';

const testConfig: TestGridConfig = {
  name: 'Test',
  description: '',
  width: 3,
  height: 2,
  filledCoords: [{ col: 0, row: 0 }, { col: 2, row: 0 }],
  missingCoords: [{ col: 1, row: 1 }],
};

describe('serializeProgress', () => {
  it('encodes cell visual states correctly (COVERED->C, OPEN_EMPTY->O, MARKED_FILLED->M)', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    // Set specific visual states
    const cell00 = grid.cells.get('0,0')!;
    grid.cells.set('0,0', { ...cell00, visualState: CellVisualState.COVERED });
    const cell10 = grid.cells.get('1,0')!;
    grid.cells.set('1,0', { ...cell10, visualState: CellVisualState.OPEN_EMPTY });
    const cell20 = grid.cells.get('2,0')!;
    grid.cells.set('2,0', { ...cell20, visualState: CellVisualState.MARKED_FILLED });

    const result = serializeProgress(
      grid,
      new Map(),
      new Set(),
      new Set(),
      new Set(),
    );

    expect(result.cells).toEqual([
      'C O M',
      ' C . C',
    ]);
  });

  it('includes flower clue visibility overrides (hidden, dimmed, guide)', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const hidden = new Set(['0,0']);
    const dimmed = new Set(['2,0']);
    const guide = new Set(['0,1']);

    const result = serializeProgress(
      grid,
      new Map(),
      hidden,
      dimmed,
      guide,
    );

    expect(result.clues).not.toBeNull();
    expect(result.clues!.flowers).toBeDefined();
    expect(result.clues!.flowers!['0,0']).toEqual({ visibility: 'hidden' });
    expect(result.clues!.flowers!['2,0']).toEqual({ visibility: 'dimmed' });
    expect(result.clues!.flowers!['0,1']).toEqual({ visibility: 'guide' });
  });

  it('includes line clue visibility overrides with key format conversion', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const lineStates = new Map<string, LineClueState>([
      ['vertical:0,0', { visibility: 'invisible', savedVisibility: 'visible' }],
      ['left-facing:1,0', { visibility: 'dimmed', savedVisibility: 'dimmed' }],
      ['right-facing:2,0', { visibility: 'visible-with-line', savedVisibility: 'visible-with-line' }],
    ]);

    const result = serializeProgress(
      grid,
      lineStates,
      new Set(),
      new Set(),
      new Set(),
    );

    expect(result.clues).not.toBeNull();
    expect(result.clues!.lines).toBeDefined();
    expect(result.clues!.lines!['v:0,0']).toEqual({ visibility: 'invisible' });
    expect(result.clues!.lines!['l:1,0']).toEqual({ visibility: 'dimmed' });
    expect(result.clues!.lines!['r:2,0']).toEqual({ visibility: 'visible-with-line' });
  });

  it('omits line clues with visible (default) visibility', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const lineStates = new Map<string, LineClueState>([
      ['vertical:0,0', { visibility: 'visible', savedVisibility: 'visible' }],
    ]);

    const result = serializeProgress(
      grid,
      lineStates,
      new Set(),
      new Set(),
      new Set(),
    );

    // No overrides should be present
    expect(result.clues).toBeNull();
  });

  it('omits clues section when all defaults', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const result = serializeProgress(
      grid,
      new Map(),
      new Set(),
      new Set(),
      new Set(),
    );

    expect(result.clues).toBeNull();
  });

  it('includes mistake and remaining counters', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();
    grid.mistakeCount = 3;
    grid.remainingCount = 1;

    const result = serializeProgress(
      grid,
      new Map(),
      new Set(),
      new Set(),
      new Set(),
    );

    expect(result.mistakes).toBe(3);
    expect(result.remaining).toBe(1);
  });
});

describe('deserializeProgress', () => {
  it('restores cell visual states from grid strings', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const progress: ProgressState = {
      cells: ['C O M', ' C . C'],
      mistakes: 0,
      remaining: 1,
    };

    deserializeProgress(progress, grid);

    expect(grid.cells.get('0,0')!.visualState).toBe(CellVisualState.COVERED);
    expect(grid.cells.get('1,0')!.visualState).toBe(CellVisualState.OPEN_EMPTY);
    expect(grid.cells.get('2,0')!.visualState).toBe(CellVisualState.MARKED_FILLED);
    expect(grid.cells.get('0,1')!.visualState).toBe(CellVisualState.COVERED);
    // 1,1 is missing, should not exist
    expect(grid.cells.has('1,1')).toBe(false);
    expect(grid.cells.get('2,1')!.visualState).toBe(CellVisualState.COVERED);
  });

  it('restores mistake and remaining counters', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const progress: ProgressState = {
      cells: ['C C C', ' C . C'],
      mistakes: 5,
      remaining: 2,
    };

    deserializeProgress(progress, grid);

    expect(grid.mistakeCount).toBe(5);
    expect(grid.remainingCount).toBe(2);
  });

  it('restores flower clue visibility sets', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const progress: ProgressState = {
      cells: ['C C C', ' C . C'],
      mistakes: 0,
      remaining: 2,
      clues: {
        flowers: {
          '0,0': { visibility: 'hidden' },
          '2,0': { visibility: 'dimmed' },
          '0,1': { visibility: 'guide' },
        },
      },
    };

    const result = deserializeProgress(progress, grid);

    expect(result.hiddenFlowerClues.has('0,0')).toBe(true);
    expect(result.dimmedFlowerClues.has('2,0')).toBe(true);
    expect(result.flowerGuideClues.has('0,1')).toBe(true);
    expect(result.hiddenFlowerClues.size).toBe(1);
    expect(result.dimmedFlowerClues.size).toBe(1);
    expect(result.flowerGuideClues.size).toBe(1);
  });

  it('restores line clue visibility with key format conversion (v:0,0 -> vertical:0,0)', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const progress: ProgressState = {
      cells: ['C C C', ' C . C'],
      mistakes: 0,
      remaining: 2,
      clues: {
        lines: {
          'v:0,0': { visibility: 'dimmed' },
          'l:1,0': { visibility: 'invisible' },
          'r:2,0': { visibility: 'visible-with-line' },
        },
      },
    };

    const result = deserializeProgress(progress, grid);

    expect(result.lineClueStates.has('vertical:0,0')).toBe(true);
    expect(result.lineClueStates.get('vertical:0,0')!.visibility).toBe('dimmed');

    expect(result.lineClueStates.has('left-facing:1,0')).toBe(true);
    expect(result.lineClueStates.get('left-facing:1,0')!.visibility).toBe('invisible');

    expect(result.lineClueStates.has('right-facing:2,0')).toBe(true);
    expect(result.lineClueStates.get('right-facing:2,0')!.visibility).toBe('visible-with-line');
  });

  it('sets savedVisibility correctly (invisible -> visible, others -> same)', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const progress: ProgressState = {
      cells: ['C C C', ' C . C'],
      mistakes: 0,
      remaining: 2,
      clues: {
        lines: {
          'v:0,0': { visibility: 'invisible' },
          'l:1,0': { visibility: 'dimmed' },
          'r:2,0': { visibility: 'visible-with-line' },
        },
      },
    };

    const result = deserializeProgress(progress, grid);

    // invisible -> savedVisibility should be 'visible'
    expect(result.lineClueStates.get('vertical:0,0')!.savedVisibility).toBe('visible');
    // dimmed -> savedVisibility should be 'dimmed'
    expect(result.lineClueStates.get('left-facing:1,0')!.savedVisibility).toBe('dimmed');
    // visible-with-line -> savedVisibility should be 'visible-with-line'
    expect(result.lineClueStates.get('right-facing:2,0')!.savedVisibility).toBe('visible-with-line');
  });

  it('returns empty sets/maps when no clue overrides present', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const progress: ProgressState = {
      cells: ['C C C', ' C . C'],
      mistakes: 0,
      remaining: 2,
    };

    const result = deserializeProgress(progress, grid);

    expect(result.hiddenFlowerClues.size).toBe(0);
    expect(result.dimmedFlowerClues.size).toBe(0);
    expect(result.flowerGuideClues.size).toBe(0);
    expect(result.lineClueStates.size).toBe(0);
  });
});

describe('charToVisualState', () => {
  it('throws on unknown character', () => {
    const grid = new HexGrid(testConfig);
    grid.computeAllClues();
    grid.coverAll();

    const progress: ProgressState = {
      cells: ['X C C', ' C . C'],
      mistakes: 0,
      remaining: 2,
    };

    expect(() => deserializeProgress(progress, grid)).toThrow('Unknown cell state character: X');
  });
});
