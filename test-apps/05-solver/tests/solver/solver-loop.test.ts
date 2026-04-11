import { describe, it, expect } from 'vitest';
import { solve } from '../../src/solver/solver-loop';
import { HexGrid } from '../../src/model/hex-grid';
import { DEFAULT_CONFIG } from '../../src/solver/config';
import { CellVisualState } from '../../src/model/hex-cell';
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

describe('solve', () => {
  it('solves a tiny grid from fully covered state', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const segStates = new Map<string, SegmentState>();
    for (const segId of grid.segments.keys()) {
      segStates.set(segId, { visibility: 'invisible', savedVisibility: 'visible', activated: true });
    }
    const result = solve(grid, segStates, new Set(), new Set(), DEFAULT_CONFIG);
    expect(result.trace.length).toBeGreaterThan(0);
    expect(result.activatedClues.size).toBeGreaterThan(0);
    for (const cell of grid.cells.values()) {
      expect(cell.visualState).not.toBe(CellVisualState.COVERED);
    }
  });

  it('produces deterministic results with same seed', () => {
    const grid1 = makeTiny3Grid();
    grid1.coverAll();
    const seg1 = new Map<string, SegmentState>();
    for (const segId of grid1.segments.keys()) {
      seg1.set(segId, { visibility: 'invisible', savedVisibility: 'visible', activated: true });
    }

    const grid2 = makeTiny3Grid();
    grid2.coverAll();
    const seg2 = new Map<string, SegmentState>();
    for (const segId of grid2.segments.keys()) {
      seg2.set(segId, { visibility: 'invisible', savedVisibility: 'visible', activated: true });
    }

    const r1 = solve(grid1, seg1, new Set(), new Set(), DEFAULT_CONFIG);
    const r2 = solve(grid2, seg2, new Set(), new Set(), DEFAULT_CONFIG);
    expect(r1.trace.length).toBe(r2.trace.length);
  });

  it('handles endgame: all remaining cells are filled', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 1, height: 2,
      filledCoords: [{ col: 0, row: 0 }, { col: 0, row: 1 }],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    const result = solve(grid, new Map(), new Set(), new Set(), DEFAULT_CONFIG);
    const endgameSteps = result.trace.filter(s => s.phase === 'endgame');
    expect(endgameSteps.length).toBe(1);
    expect(endgameSteps[0].endgame?.type).toBe('all-filled');
  });

  it('handles endgame: all remaining cells are empty', () => {
    const grid = new HexGrid({
      name: 'test', description: '', width: 1, height: 2,
      filledCoords: [],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    const result = solve(grid, new Map(), new Set(), new Set(), DEFAULT_CONFIG);
    const endgameSteps = result.trace.filter(s => s.phase === 'endgame');
    expect(endgameSteps.length).toBe(1);
    expect(endgameSteps[0].endgame?.type).toBe('all-empty');
  });

  it('trace steps have board state snapshots', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const result = solve(grid, new Map(), new Set(), new Set(), DEFAULT_CONFIG);
    for (const step of result.trace) {
      expect(step.boardState).toBeDefined();
      expect(step.boardState.cells.length).toBeGreaterThan(0);
    }
  });

  it('returns empty trace for already-solved grid', () => {
    const grid = makeTiny3Grid();
    // All cells already revealed (not covered)
    const result = solve(grid, new Map(), new Set(), new Set(), DEFAULT_CONFIG);
    expect(result.trace.length).toBe(0);
    expect(result.activatedClues.size).toBe(0);
  });

  it('does not exceed MAX_TURNS safety limit', () => {
    // With a tiny grid, solver should finish well before 10000 turns
    const grid = makeTiny3Grid();
    grid.coverAll();
    const result = solve(grid, new Map(), new Set(), new Set(), DEFAULT_CONFIG);
    expect(result.trace.length).toBeLessThanOrEqual(10000);
  });

  it('turn numbers increment only on deduction steps', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const segStates = new Map<string, SegmentState>();
    for (const segId of grid.segments.keys()) {
      segStates.set(segId, { visibility: 'invisible', savedVisibility: 'visible', activated: true });
    }
    const result = solve(grid, segStates, new Set(), new Set(), DEFAULT_CONFIG);

    // Activation steps should share a turn number with the subsequent deduction step
    const deductionTurns = result.trace
      .filter(s => s.phase === 'deduction' || s.phase === 'endgame')
      .map(s => s.turnNumber);
    // Turn numbers should be monotonically non-decreasing
    for (let i = 1; i < deductionTurns.length; i++) {
      expect(deductionTurns[i]).toBeGreaterThanOrEqual(deductionTurns[i - 1]);
    }
  });

  it('uses hard mode thresholds when difficulty is hard', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const hardConfig = {
      ...DEFAULT_CONFIG,
      difficulty: 'hard' as const,
    };
    const result = solve(grid, new Map(), new Set(), new Set(), hardConfig);
    expect(result.trace.length).toBeGreaterThan(0);
  });

  it('records activated clues in the result set', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const segStates = new Map<string, SegmentState>();
    for (const segId of grid.segments.keys()) {
      segStates.set(segId, { visibility: 'invisible', savedVisibility: 'visible', activated: true });
    }
    const result = solve(grid, segStates, new Set(), new Set(), DEFAULT_CONFIG);
    // Every clue-activation trace step should correspond to an entry in activatedClues.
    // activatedClues uses "type:id" format so Human Play can distinguish cell/line/flower.
    const activationSteps = result.trace.filter(s => s.phase === 'clue-activation');
    for (const step of activationSteps) {
      expect(step.clueActivated).toBeDefined();
      const key = `${step.clueActivated!.type}:${step.clueActivated!.id}`;
      expect(result.activatedClues.has(key)).toBe(true);
    }
  });

  it('actionableClueCount is tracked in trace steps', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const result = solve(grid, new Map(), new Set(), new Set(), DEFAULT_CONFIG);
    for (const step of result.trace) {
      expect(typeof step.actionableClueCount).toBe('number');
      expect(step.actionableClueCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('remainingCount is tracked in trace steps', () => {
    const grid = makeTiny3Grid();
    grid.coverAll();
    const result = solve(grid, new Map(), new Set(), new Set(), DEFAULT_CONFIG);
    for (const step of result.trace) {
      expect(typeof step.remainingCount).toBe('number');
      expect(step.remainingCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('handles stuck state when no forced cells and no activatable clues', () => {
    // Create a grid where deduction cannot proceed:
    // Disable all deduction strategies so the engine always returns [].
    // This forces the solver to hit the "stuck" branch (lines 144-147).
    const grid = makeTiny3Grid();
    grid.coverAll();
    const stuckConfig = {
      ...DEFAULT_CONFIG,
      deductionLevels: {
        trivial: false,
        contiguity: false,
        lineSegment: false,
        flower: false,
        pairwiseIntersection: false,
        constraintPropagation: false,
        setReasoning: false,
      },
    };
    const result = solve(grid, new Map(), new Set(), new Set(), stuckConfig);
    // With all deductions disabled, solver cannot deduce anything.
    // No deduction trace steps should be produced — only clue-activation (if any).
    const deductionSteps = result.trace.filter(s => s.phase === 'deduction');
    expect(deductionSteps.length).toBe(0);
    // Covered cells should remain (solver got stuck)
    let coveredCount = 0;
    for (const cell of grid.cells.values()) {
      if (cell.visualState === CellVisualState.COVERED) coveredCount++;
    }
    expect(coveredCount).toBeGreaterThan(0);
  });
});
