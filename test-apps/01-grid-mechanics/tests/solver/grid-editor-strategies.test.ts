/**
 * Isolated tests for grid-editor.ts that exercise:
 *   - cloneGrid() (exercised by any strategy that reaches the edit loop)
 *   - getCandidates() (exercised whenever the initial selectClues returns null)
 *   - Strategy 1 (toggle_truth): selectClues succeeds on first strategy candidate
 *   - Strategy 2 (remove_cell): toggle_truth exhausted; remove_cell succeeds
 *   - Strategy 3 (add_cell): toggle_truth + remove_cell exhausted; add_cell succeeds
 *   - Final null return: all strategies exhausted with no success
 *
 * vi.mock is used to control selectClues return values. allClueIds is also
 * mocked to return an empty set so that getCandidates always sees an empty
 * clue set, causing verify() to mark every cell as stuck and thus populating
 * the candidates list reliably.
 *
 * Call counts (verified empirically with debug tests):
 *   toggle_truth win:  call 1 = null (initial), call 2+ = fakeSelection
 *   remove_cell win:   calls 1-10 = null (1 initial + 9 toggle_truth), call 11+ = fakeSelection
 *   add_cell win:      calls 1-17 = null (1 initial + 8 toggle + 8 remove), call 18+ = fakeSelection
 *   final null:        all calls = null
 *
 * Grid shapes used:
 *   make3x3Grid()         — 9 cells, 0 in-bounds absent coords (no add_cell candidates)
 *   make3x3WithHoleGrid() — 8 cells, 1 in-bounds absent coord at (1,1) for add_cell
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HexGrid } from '../../src/model/hex-grid';
import type { TestGridConfig } from '../../src/model/hex-grid';

// vi.hoisted() runs before the vi.mock() factory so the variable can be
// referenced inside the factory without hoisting issues.
const { mockSelectClues } = vi.hoisted(() => {
  return { mockSelectClues: vi.fn() };
});

vi.mock('../../src/solver/clue-selector', () => ({
  selectClues: mockSelectClues,
  allClueIds: vi.fn(() => new Set<string>()),
}));

import { editForSolvability } from '../../src/solver/grid-editor';
import type { ClueSelection } from '../../src/solver/clue-selector';
import type { SolveReplay } from '../../src/solver/verifier';

// ── Fake ClueSelection ────────────────────────────────────────────────────────
const fakeReplay: SolveReplay = { steps: [], stuck: false };
const fakeSelection: ClueSelection = {
  visibleClues: new Set(['neighbor:0,0']),
  difficulty: 'easy',
  verifyResult: fakeReplay,
};

// ── Grid helpers ──────────────────────────────────────────────────────────────

/**
 * 3x3 grid — all nine cells present, center cell filled.
 * All 9 coords are in grid.cells, so all candidates from getCandidates() that
 * are within bounds have cells. No in-bounds absent coord exists for add_cell.
 */
function make3x3Grid(): HexGrid {
  const config: TestGridConfig = {
    name: 'editor-3x3',
    description: '3x3 grid, center filled',
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

/**
 * 3x3 grid with the center cell (1,1) declared as missing.
 * 8 surrounding cells are present. (1,1) is within bounds but absent from
 * grid.cells, making it the sole add_cell candidate for strategy 3.
 */
function make3x3WithHoleGrid(): HexGrid {
  const config: TestGridConfig = {
    name: 'editor-3x3-hole',
    description: '3x3 grid with center missing',
    width: 3,
    height: 3,
    filledCoords: [{ col: 0, row: 0 }],
    missingCoords: [{ col: 1, row: 1 }],
  };
  const grid = new HexGrid(config);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

/**
 * Queue up nullCount null return values followed by a persistent fakeSelection.
 */
function queueNullsThenSuccess(mock: ReturnType<typeof vi.fn>, nullCount: number): void {
  for (let i = 0; i < nullCount; i++) {
    mock.mockReturnValueOnce(null);
  }
  mock.mockReturnValue(fakeSelection);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('editForSolvability – strategy coverage via mocked selectClues', () => {
  beforeEach(() => {
    mockSelectClues.mockReset();
  });

  /**
   * Strategy 1 (toggle_truth): The initial solvability check returns null,
   * then the first candidate's toggle_truth attempt returns a valid selection.
   * Also exercises cloneGrid() and getCandidates().
   *
   * Call 1: null (initial check). Call 2+: fakeSelection (toggle_truth wins).
   */
  it('returns toggle_truth edit when first strategy candidate succeeds', () => {
    queueNullsThenSuccess(mockSelectClues, 1); // 1 null then fakeSelection

    const grid = make3x3Grid();
    const result = editForSolvability(grid, 'easy');

    expect(result).not.toBeNull();
    expect(result!.edits).toHaveLength(1);
    expect(result!.edits[0].type).toBe('toggle_truth');
    expect(result!.clueSelection).toBe(fakeSelection);
  });

  /**
   * Strategy 2 (remove_cell): All toggle_truth attempts return null; the first
   * remove_cell attempt succeeds.
   *
   * A 3x3 grid has 9 cells so toggle_truth makes 9 selectClues calls (all null).
   * Calls 1-10 = null (1 initial + 9 toggle_truth). Call 11+ = fakeSelection.
   */
  it('returns remove_cell edit when toggle_truth exhausted but remove_cell succeeds', () => {
    queueNullsThenSuccess(mockSelectClues, 10); // 10 nulls then fakeSelection

    const grid = make3x3Grid();
    const result = editForSolvability(grid, 'easy');

    expect(result).not.toBeNull();
    expect(result!.edits).toHaveLength(1);
    expect(result!.edits[0].type).toBe('remove_cell');
    expect(result!.clueSelection).toBe(fakeSelection);
  });

  /**
   * Strategy 3 (add_cell): All toggle_truth and remove_cell attempts return null;
   * the first add_cell attempt succeeds.
   *
   * make3x3WithHoleGrid() has 8 cells: toggle_truth makes 8 calls, remove_cell
   * makes 8 calls. Calls 1-17 = null (1 initial + 8 toggle + 8 remove).
   * Call 18+ = fakeSelection (first add_cell candidate — coord (1,1)).
   */
  it('returns add_cell edit when toggle_truth+remove_cell exhausted but add_cell succeeds', () => {
    queueNullsThenSuccess(mockSelectClues, 17); // 17 nulls then fakeSelection

    const grid = make3x3WithHoleGrid();
    const result = editForSolvability(grid, 'easy');

    expect(result).not.toBeNull();
    expect(result!.edits).toHaveLength(1);
    expect(result!.edits[0].type).toBe('add_cell');
    expect(result!.clueSelection).toBe(fakeSelection);
  });

  /**
   * Final null return: all strategies exhausted with no success.
   *
   * selectClues always returns null, so no strategy ever succeeds and
   * editForSolvability returns null.
   */
  it('returns null when all strategies fail', () => {
    mockSelectClues.mockReturnValue(null); // every call returns null

    const grid = make3x3Grid();
    const result = editForSolvability(grid, 'easy');

    expect(result).toBeNull();
  });

  /**
   * getCandidates hard-difficulty branch (grid-editor.ts lines 68-70):
   * When difficulty === 'hard', getCandidates adds GLOBAL_REMAINING_ID to the
   * clue set before calling verify(). This branch is only reached when the
   * initial selectClues check returns null. We verify it executes without error
   * by calling editForSolvability with 'hard' difficulty when selectClues
   * returns null initially, then returns fakeSelection for the first strategy.
   */
  it('exercises hard-difficulty getCandidates branch (adds GLOBAL_REMAINING_ID)', () => {
    queueNullsThenSuccess(mockSelectClues, 1); // 1 null (initial), then fakeSelection

    const grid = make3x3Grid();
    const result = editForSolvability(grid, 'hard');

    // getCandidates was called with 'hard', exercising lines 68-70.
    // The first toggle_truth candidate succeeded with fakeSelection.
    expect(result).not.toBeNull();
    expect(result!.edits).toHaveLength(1);
    expect(result!.edits[0].type).toBe('toggle_truth');
  });
});
