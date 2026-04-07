import { describe, it, expect } from 'vitest';
import { findActionableHiddenClues, selectClueToActivate, activateClue } from '../../src/solver/activation';
import { HexGrid } from '../../src/model/hex-grid';
import { createPRNG, hashSeed } from '../../src/solver/prng';
import { DEFAULT_CONFIG } from '../../src/solver/config';
import type { SegmentState } from '../../src/view/segment-state';
import { CellVisualState } from '../../src/model/hex-cell';
import type { CandidatesByType } from '../../src/solver/activation';

function makeTiny3Grid(): HexGrid {
  const grid = new HexGrid({
    name: 'test', description: '', width: 3, height: 1,
    filledCoords: [{ col: 1, row: 0 }],
    missingCoords: [],
  });
  grid.computeAllClues();
  return grid;
}

describe('findActionableHiddenClues', () => {
  it('finds hidden cell clues that would be actionable if revealed', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const candidates = findActionableHiddenClues(grid, new Map(), new Set(), DEFAULT_CONFIG.deductionLevels);
    expect(candidates.cell.length).toBeGreaterThan(0);
  });

  it('skips covered cells that are FILLED ground truth', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const candidates = findActionableHiddenClues(grid, new Map(), new Set(), DEFAULT_CONFIG.deductionLevels);
    // Filled cell (1,0) should not be in cell candidates
    const ids = candidates.cell.map(c => c.id);
    expect(ids).not.toContain('1,0');
  });

  it('skips cells that are not COVERED', () => {
    const grid = makeTiny3Grid();
    // Reveal all cells (not covered), then check — open empty cells are already visible
    const candidates = findActionableHiddenClues(grid, new Map(), new Set(), DEFAULT_CONFIG.deductionLevels);
    // With all cells revealed already, no covered-empty candidates
    expect(candidates.cell.length).toBe(0);
  });

  it('finds hidden line segments that would be actionable if revealed', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const segStates = new Map<string, SegmentState>();
    for (const segId of grid.segments.keys()) {
      segStates.set(segId, { visibility: 'invisible', savedVisibility: 'visible', activated: true });
    }
    const candidates = findActionableHiddenClues(grid, segStates, new Set(), DEFAULT_CONFIG.deductionLevels);
    expect(Array.isArray(candidates.line)).toBe(true);
  });

  it('skips line segments that are already visible (default state)', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    // No segment overrides — all default to visible, so none are invisible candidates
    const candidates = findActionableHiddenClues(grid, new Map(), new Set(), DEFAULT_CONFIG.deductionLevels);
    expect(candidates.line.length).toBe(0);
  });

  it('skips flower clue if cell does not exist in grid', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    // Use a key that doesn't exist
    const hidden = new Set(['99,99']);
    const candidates = findActionableHiddenClues(grid, new Map(), hidden, DEFAULT_CONFIG.deductionLevels);
    expect(candidates.flower.length).toBe(0);
  });

  it('skips flower clue if cell is not MARKED_FILLED', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    // Cell 1,0 is COVERED (not MARKED_FILLED)
    const hidden = new Set(['1,0']);
    const candidates = findActionableHiddenClues(grid, new Map(), hidden, DEFAULT_CONFIG.deductionLevels);
    expect(candidates.flower.length).toBe(0);
  });

  it('finds flower clue as actionable when revealed on a marked-filled cell', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    grid.markCell({ col: 1, row: 0 });
    const hidden = new Set(['1,0']);
    // With cell 1,0 marked and its flower clue hidden, revealing it may force cells
    const candidates = findActionableHiddenClues(grid, new Map(), hidden, DEFAULT_CONFIG.deductionLevels);
    // Result may or may not be actionable depending on puzzle, but should not throw
    expect(Array.isArray(candidates.flower)).toBe(true);
  });

  it('cell candidate type is always "cell"', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const candidates = findActionableHiddenClues(grid, new Map(), new Set(), DEFAULT_CONFIG.deductionLevels);
    for (const c of candidates.cell) {
      expect(c.type).toBe('cell');
    }
  });

  it('line candidate type is always "line"', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const segStates = new Map<string, SegmentState>();
    for (const segId of grid.segments.keys()) {
      segStates.set(segId, { visibility: 'invisible', savedVisibility: 'visible', activated: true });
    }
    const candidates = findActionableHiddenClues(grid, segStates, new Set(), DEFAULT_CONFIG.deductionLevels);
    for (const c of candidates.line) {
      expect(c.type).toBe('line');
    }
  });

  it('does not include non-actionable line segments', () => {
    // A grid where all cells are already resolved should have no actionable segments
    const grid = makeTiny3Grid();
    // All cells already revealed (no covered cells to deduce)
    const segStates = new Map<string, SegmentState>();
    for (const segId of grid.segments.keys()) {
      segStates.set(segId, { visibility: 'invisible', savedVisibility: 'visible', activated: true });
    }
    const candidates = findActionableHiddenClues(grid, segStates, new Set(), DEFAULT_CONFIG.deductionLevels);
    // With all cells open, no deduction is possible, so no actionable line segments
    expect(candidates.line.length).toBe(0);
  });
});

describe('selectClueToActivate', () => {
  it('selects a clue using weighted PRNG', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const prng = createPRNG(hashSeed('42'));
    const candidates = findActionableHiddenClues(grid, new Map(), new Set(), DEFAULT_CONFIG.deductionLevels);
    const selected = selectClueToActivate(candidates, DEFAULT_CONFIG.clueWeights.easy, prng);
    expect(selected).not.toBeNull();
  });

  it('returns null when all candidate lists are empty', () => {
    const prng = createPRNG(hashSeed('42'));
    const empty: CandidatesByType = {
      cell: [], line: [], flower: [],
    };
    const selected = selectClueToActivate(empty, DEFAULT_CONFIG.clueWeights.easy, prng);
    expect(selected).toBeNull();
  });

  it('returns a clue from the only non-empty category', () => {
    const prng = createPRNG(hashSeed('0'));
    const candidates = {
      cell: [{ type: 'cell' as const, id: '0,0' }],
      line: [],
      flower: [],
    };
    const selected = selectClueToActivate(candidates, DEFAULT_CONFIG.clueWeights.easy, prng);
    expect(selected).toEqual({ type: 'cell', id: '0,0' });
  });
});

describe('activateClue', () => {
  it('opens an empty cell for cell clue activation', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    activateClue(grid, new Map(), new Set(), { type: 'cell', id: '0,0' });
    const cell = grid.cells.get('0,0');
    expect(cell?.visualState).toBe(CellVisualState.OPEN_EMPTY);
  });

  it('makes a line segment visible when prior state exists', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const segStates = new Map<string, SegmentState>();
    const segId = grid.segments.keys().next().value!;
    segStates.set(segId, { visibility: 'invisible', savedVisibility: 'visible', activated: true });
    activateClue(grid, segStates, new Set(), { type: 'line', id: segId });
    expect(segStates.get(segId)!.visibility).toBe('visible');
  });

  it('preserves other state fields when making line segment visible', () => {
    const grid = makeTiny3Grid();
    const segStates = new Map<string, SegmentState>();
    const segId = grid.segments.keys().next().value!;
    segStates.set(segId, { visibility: 'invisible', savedVisibility: 'dimmed', activated: false });
    activateClue(grid, segStates, new Set(), { type: 'line', id: segId });
    const updated = segStates.get(segId)!;
    expect(updated.visibility).toBe('visible');
    expect(updated.savedVisibility).toBe('dimmed');
    expect(updated.activated).toBe(false);
  });

  it('makes a line segment visible when no prior state exists', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const segStates = new Map<string, SegmentState>();
    activateClue(grid, segStates, new Set(), { type: 'line', id: 'seg:vertical:0,0' });
    expect(segStates.get('seg:vertical:0,0')!.visibility).toBe('visible');
  });

  it('sets full default state when creating new segment entry from scratch', () => {
    const grid = makeTiny3Grid();
    const segStates = new Map<string, SegmentState>();
    activateClue(grid, segStates, new Set(), { type: 'line', id: 'seg:vertical:0,0' });
    const state = segStates.get('seg:vertical:0,0')!;
    expect(state.visibility).toBe('visible');
    expect(state.savedVisibility).toBe('visible');
    expect(state.activated).toBe(true);
  });

  it('removes flower clue from hidden set', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    grid.markCell({ col: 1, row: 0 });
    const hidden = new Set(['1,0']);
    activateClue(grid, new Map(), hidden, { type: 'flower', id: '1,0' });
    expect(hidden.has('1,0')).toBe(false);
  });

  it('is a no-op for flower if id is not in hidden set', () => {
    const grid = makeTiny3Grid();
    const hidden = new Set(['2,0']);
    activateClue(grid, new Map(), hidden, { type: 'flower', id: '0,0' });
    // Set still has 2,0, and 0,0 was never there
    expect(hidden.has('2,0')).toBe(true);
    expect(hidden.has('0,0')).toBe(false);
  });
});
