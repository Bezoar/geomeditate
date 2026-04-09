/**
 * Isolated tests for the branch paths in generatePuzzle() (pipeline.ts) that
 * are not reachable when selectClues always succeeds:
 *
 *   1. editForSolvability fallback path (lines 42-50): selectClues returns null
 *      on the first call (from pipeline), but editForSolvability succeeds.
 *   2. Both-fail path (lines 52-53): both selectClues (pipeline call) and
 *      editForSolvability return null → generatePuzzle returns null.
 *
 * vi.mock is used to control selectClues return values.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HexGrid } from '../../src/model/hex-grid';
import type { TestGridConfig } from '../../src/model/hex-grid';

// vi.hoisted() runs before the vi.mock() factory so the variable can be
// referenced inside the factory without hoisting issues.
const { mockSelectClues, mockProgressive } = vi.hoisted(() => ({
  mockSelectClues: vi.fn(),
  mockProgressive: vi.fn(),
}));

vi.mock('../../src/solver/clue-selector', () => ({
  selectClues: mockSelectClues,
  allClueIds: vi.fn(() => new Set<string>()),
}));

vi.mock('../../src/solver/progressive', () => ({
  solveProgressively: mockProgressive,
}));

import { generatePuzzle } from '../../src/solver/pipeline';

// ── Fake ClueSelection ────────────────────────────────────────────────────────
const fakeReplay = { steps: [], stuck: false };
const fakeSelection = {
  visibleClues: new Set(['neighbor:0,0']),
  difficulty: 'easy' as const,
  verifyResult: fakeReplay,
};

// ── Grid helper ───────────────────────────────────────────────────────────────

function make3x3Grid(): HexGrid {
  const config: TestGridConfig = {
    name: 'pipeline-edit-path',
    description: 'grid used for pipeline branch tests',
    width: 3,
    height: 3,
    filledCoords: [{ col: 1, row: 1 }],
    missingCoords: [],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generatePuzzle – mock-controlled branch coverage', () => {
  beforeEach(() => {
    mockSelectClues.mockReset();
    mockProgressive.mockReset();
    // Progressive solving always returns stuck, forcing fallback to selectClues
    mockProgressive.mockReturnValue({ steps: [], stuck: true, stuckCells: new Set(['0,0']) });
  });

  /**
   * T1: editForSolvability fallback path.
   *
   * When selectClues returns null for the pipeline's direct call, generatePuzzle
   * falls through to editForSolvability. If that succeeds (selectClues returns
   * non-null inside the editor), generatePuzzle returns a PuzzleResult with
   * non-empty edits.
   *
   * Call sequence:
   *   call 1: pipeline selectClues → null
   *   call 2: grid-editor initial check → null
   *   call 3+: grid-editor strategy iterations → fakeSelection (toggle_truth wins)
   */
  it('falls through to selectClues when progressive solving is stuck', () => {
    mockSelectClues.mockReturnValue(fakeSelection);

    const result = generatePuzzle(make3x3Grid(), 'easy');

    expect(result).not.toBeNull();
    expect(result!.clueSelection).toBe(fakeSelection);
    expect(result!.replay).toBe(fakeReplay);
    expect(result!.edits).toHaveLength(0);
  });

  it('falls through to editForSolvability when both progressive and selectClues fail', () => {
    mockSelectClues
      .mockReturnValueOnce(null)          // pipeline: selectClues returns null
      .mockReturnValueOnce(null)          // grid-editor: initial solvability check
      .mockReturnValue(fakeSelection);    // grid-editor: first strategy candidate succeeds

    const result = generatePuzzle(make3x3Grid(), 'easy');

    expect(result).not.toBeNull();
    expect(result!.edits.length).toBeGreaterThan(0);
    expect(result!.replay).toBe(fakeReplay);
    expect(result!.clueSelection).toBe(fakeSelection);
  });

  /**
   * T2: Both-fail path — generatePuzzle returns null.
   *
   * selectClues always returns null (both the pipeline call and all calls
   * inside editForSolvability). editForSolvability therefore returns null too,
   * and generatePuzzle falls through to return null.
   */
  it('returns null when both selectClues and editForSolvability fail', () => {
    mockSelectClues.mockReturnValue(null); // every call returns null

    const result = generatePuzzle(make3x3Grid(), 'easy');

    expect(result).toBeNull();
  });
});
