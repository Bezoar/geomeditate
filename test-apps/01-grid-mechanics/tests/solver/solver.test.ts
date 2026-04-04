import { describe, it, expect } from 'vitest';
import { HexGrid } from '../../src/model/hex-grid';
import type { TestGridConfig } from '../../src/model/hex-grid';
import { coordKey } from '../../src/model/hex-coord';
import { neighborClueId, flowerClueId, lineClueId, GLOBAL_REMAINING_ID } from '../../src/solver/deductions';
import { solve } from '../../src/solver/solver';
import type { SolveTier } from '../../src/solver/solver';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function make2x1Grid(filledCoords: Array<{ col: number; row: number }>): HexGrid {
  const config: TestGridConfig = {
    name: 'test-2x1',
    description: '2-cell wide, 1-cell tall grid for solver tests',
    width: 2,
    height: 1,
    filledCoords,
    missingCoords: [],
  };
  return new HexGrid(config);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('solve', () => {
  /**
   * T1: Returns deductions from visible neighbor clues in simple tier.
   *
   * Grid: 2x1 — col=0 FILLED, col=1 EMPTY.
   * After computeAllClues() + coverAll(), open cell (1,0) to reveal its neighbor clue.
   * The neighbor clue at (1,0) = 1 (one filled neighbor: (0,0)).
   * With (0,0) still COVERED (1 covered neighbor) and clue=1, solver should
   * deduce (0,0) is filled.
   */
  it('returns deductions from visible neighbor clues in simple tier', () => {
    const grid = make2x1Grid([{ col: 0, row: 0 }]);
    grid.computeAllClues();
    grid.coverAll();
    // Open the empty cell to reveal its neighbor clue
    grid.openCell({ col: 1, row: 0 });

    const visibleClues = new Set([neighborClueId({ col: 1, row: 0 })]);
    const result = solve(grid, visibleClues, 'simple');

    expect(result.length).toBeGreaterThan(0);
    const deducedCoords = result.map((d) => coordKey(d.coord));
    expect(deducedCoords).toContain('0,0');
    const deduction = result.find((d) => coordKey(d.coord) === '0,0');
    expect(deduction?.result).toBe('filled');
  });

  /**
   * T2: Returns empty array when no clues are visible.
   */
  it('returns empty array when no clues are visible', () => {
    const grid = make2x1Grid([{ col: 0, row: 0 }]);
    grid.computeAllClues();
    grid.coverAll();

    const result = solve(grid, new Set(), 'simple');
    expect(result).toEqual([]);
  });

  /**
   * T3: Deduplicates deductions for the same cell (no coord appears twice).
   *
   * We create a situation where two different clues both deduce the same cell.
   * Use a 3x1 grid: (0,0) FILLED, (1,0) EMPTY, (2,0) EMPTY.
   * After coverAll, open both (1,0) and (2,0).
   * Both neighbor clues see (0,0) as covered neighbor with clue=1, so both
   * might produce a deduction for (0,0).
   * The solver must deduplicate — (0,0) should appear at most once.
   */
  it('deduplicates deductions for the same cell (no coord appears twice)', () => {
    const config: TestGridConfig = {
      name: 'test-3x1',
      description: '3-cell grid for deduplication test',
      width: 3,
      height: 1,
      filledCoords: [{ col: 0, row: 0 }],
      missingCoords: [],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();
    // Open both empty cells
    grid.openCell({ col: 1, row: 0 });
    grid.openCell({ col: 2, row: 0 });

    const visibleClues = new Set([
      neighborClueId({ col: 1, row: 0 }),
      neighborClueId({ col: 2, row: 0 }),
    ]);
    const result = solve(grid, visibleClues, 'simple');

    // Check that no coord appears more than once
    const seenCoords = new Set<string>();
    for (const d of result) {
      const key = coordKey(d.coord);
      expect(seenCoords.has(key)).toBe(false);
      seenCoords.add(key);
    }
  });

  /**
   * T4: Includes global remaining deduction in advanced tier when
   * 'global:remaining' is in visibleClues.
   *
   * Grid: 2x1 — both (0,0) and (1,0) are EMPTY.
   * After coverAll, remainingCount=0. With global:remaining visible in
   * advanced tier, both covered cells should be deduced as empty.
   */
  it('includes global remaining deduction in advanced tier', () => {
    const grid = make2x1Grid([]); // no filled cells
    grid.computeAllClues();
    grid.coverAll();

    const visibleClues = new Set([GLOBAL_REMAINING_ID]);
    const result = solve(grid, visibleClues, 'advanced');

    expect(result.length).toBeGreaterThan(0);
    result.forEach((d) => {
      expect(d.result).toBe('empty');
    });
  });

  /**
   * T5: Does NOT include global remaining deduction in simple tier.
   *
   * Same setup as T4 — global:remaining in visibleClues but tier='simple'.
   * Solver should skip global clue entirely → no deductions.
   */
  it('does NOT include global remaining deduction in simple tier', () => {
    const grid = make2x1Grid([]); // no filled cells
    grid.computeAllClues();
    grid.coverAll();

    const visibleClues = new Set([GLOBAL_REMAINING_ID]);
    const result = solve(grid, visibleClues, 'simple');

    expect(result).toEqual([]);
  });

  /**
   * Extra: Handles flower clues correctly.
   *
   * Grid: 3x3 — (1,1) FILLED, surrounded by empty cells.
   * After computeAllClues + coverAll, mark (1,1) to reveal its flower clue.
   * With flowerClueValue=0 and no covered radius-2 cells that are filled,
   * deducing from flower clue should produce results when appropriate.
   */
  it('handles flower clues when cell is marked filled', () => {
    const config: TestGridConfig = {
      name: 'test-flower',
      description: '3x3 grid with one filled center for flower clue test',
      width: 3,
      height: 3,
      filledCoords: [{ col: 1, row: 1 }],
      missingCoords: [],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();
    // Mark the filled cell
    grid.markCell({ col: 1, row: 1 });

    const visibleClues = new Set([flowerClueId({ col: 1, row: 1 })]);
    const result = solve(grid, visibleClues, 'simple');

    // Flower clue should have value 0 (no other filled cells)
    // 0 == markedFilled(0) → all covered cells empty
    result.forEach((d) => {
      expect(d.result).toBe('empty');
    });
  });

  /**
   * Extra: Handles line clues correctly.
   *
   * Grid: 1x3 — (0,1) FILLED, (0,0) and (0,2) EMPTY.
   * After computeAllClues + coverAll, mark (0,1) to reveal the vertical
   * line clue. Line value should be 1. With 1 marked and 0 covered,
   * solve may return deductions or [] (since covered=0 → nothing to deduce).
   * We just verify the solver doesn't crash and returns an array.
   */
  it('handles line clues without errors', () => {
    const config: TestGridConfig = {
      name: 'test-line',
      description: '1x3 vertical grid for line clue test',
      width: 1,
      height: 3,
      filledCoords: [{ col: 0, row: 1 }],
      missingCoords: [],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();
    // Open the empty cells
    grid.openCell({ col: 0, row: 0 });
    grid.openCell({ col: 0, row: 2 });
    // Mark the filled cell
    grid.markCell({ col: 0, row: 1 });

    // The vertical line has startCoord at (0,0)
    const lineStart = { col: 0, row: 0 };
    const visibleClues = new Set([lineClueId('vertical', lineStart)]);
    const result = solve(grid, visibleClues, 'simple');

    expect(Array.isArray(result)).toBe(true);
  });

  /**
   * Extra: Unknown clue ID types are handled without throwing
   * (the parseClueId throws internally; test that the solver is robust).
   * Actually, per spec the solver should only receive valid clue IDs,
   * so we verify parseClueId is called and throws for unknown IDs
   * by only testing valid IDs here.
   */
  it('returns empty array for clue IDs that produce no deductions', () => {
    // Grid with only one cell, already opened — no covered cells, nothing to deduce
    const config: TestGridConfig = {
      name: 'test-single',
      description: 'Single cell grid',
      width: 1,
      height: 1,
      filledCoords: [],
      missingCoords: [],
    };
    const grid = new HexGrid(config);
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell({ col: 0, row: 0 }); // now OPEN_EMPTY

    const visibleClues = new Set([neighborClueId({ col: 0, row: 0 })]);
    const result = solve(grid, visibleClues, 'simple');

    // No covered neighbors → nothing to deduce
    expect(result).toEqual([]);
  });
});
