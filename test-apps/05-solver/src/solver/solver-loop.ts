import type { HexGrid } from '../model/hex-grid';
import type { SegmentState } from '../view/segment-state';
import type {
  SolverConfig,
  TraceStep,
  SolveResult,
  ForcedCell,
  ClueWeights,
} from './types';
import { CellVisualState } from '../model/hex-cell';
import { parseCoordKey } from '../model/hex-coord';
import { createPRNG, hashSeed } from './prng';
import { DeductionEngine } from './deduction/engine';
import { buildVisibleClueSet } from './visible-clues';
import {
  findActionableHiddenClues,
  selectClueToActivate,
  activateClue,
} from './activation';
import { captureSnapshot } from './snapshot';
import { chainForcedResolutions } from './chain';

const MAX_TURNS = 10000;
const MAX_ACTIVATIONS_PER_TURN = 20;

function countCoveredCells(grid: HexGrid): number {
  let count = 0;
  for (const cell of grid.cells.values()) {
    if (cell.visualState === CellVisualState.COVERED) count++;
  }
  return count;
}

/**
 * Format a single clueId into a human-readable label that matches what the
 * player sees on screen. Segment ids use the abstract `cluePosition`, which
 * for left-facing edge clues lives outside the grid; translate them to the
 * anchor cell (where the label is actually drawn).
 */
function formatClueId(rawId: string, grid: HexGrid): string {
  // Composite ids from pairwise or set-reasoning strategies.
  if (rawId.includes('+')) {
    return rawId.split('+').map(part => formatClueId(part, grid)).join(' + ');
  }
  if (rawId.includes('\u2282')) {
    return rawId.split('\u2282').map(part => formatClueId(part, grid)).join(' \u2282 ');
  }

  // Segment id: look up the segment and compute its anchor (where the label renders).
  if (rawId.startsWith('seg:')) {
    const segment = grid.segments.get(rawId);
    if (segment && segment.cells.length > 0) {
      const anchor = segment.axis === 'left-facing'
        ? segment.cells[segment.cells.length - 1]
        : segment.cells[0];
      return `line(${segment.axis} @ ${anchor.col},${anchor.row})`;
    }
    return rawId;
  }

  // Internal clueIds produced by propagation strategy.
  if (rawId === 'propagation') {
    return 'propagation';
  }

  // Otherwise, assume it's a neighbor-clue coordKey.
  return `cell(${rawId})`;
}

/**
 * Compute the set of actionable clues via chain iteration. A clue is
 * "actionable" if, combined with prior deductions from other visible clues,
 * it yields a forced cell. Returns both the count and the sorted list of
 * human-readable clue labels.
 */
function computeActionableClues(
  grid: HexGrid,
  segmentStates: Map<string, SegmentState>,
  hiddenFlowerClues: Set<string>,
  engine: DeductionEngine,
): { count: number; ids: string[] } {
  const chain = chainForcedResolutions(grid, segmentStates, hiddenFlowerClues, engine);
  const ids = [...chain.clueIds].map(id => formatClueId(id, grid)).sort();
  return { count: ids.length, ids };
}

export function solve(
  grid: HexGrid,
  segmentStates: Map<string, SegmentState>,
  hiddenFlowerClues: Set<string>,
  _dimmedFlowerClues: Set<string>,
  config: SolverConfig,
): SolveResult {
  const prng = createPRNG(hashSeed(config.seed));
  const engine = new DeductionEngine(config.deductionLevels);
  const trace: TraceStep[] = [];
  const activatedClues = new Set<string>();

  const threshold = config.difficulty === 'easy'
    ? config.easyModeMinActionable
    : config.hardModeMinActionable;
  const weights: ClueWeights = config.difficulty === 'easy'
    ? config.clueWeights.easy
    : config.clueWeights.hard;

  let turnNumber = 0;

  for (let safety = 0; safety < MAX_TURNS; safety++) {
    // Count covered cells. If 0, solved.
    const coveredCount = countCoveredCells(grid);
    if (coveredCount === 0) break;

    // Endgame: all remaining filled cells are still covered
    if (grid.remainingCount === coveredCount) {
      const cellsResolved: string[] = [];
      for (const [key, cell] of grid.cells) {
        if (cell.visualState === CellVisualState.COVERED) {
          grid.markCell(parseCoordKey(key));
          cellsResolved.push(key);
        }
      }
      turnNumber++;
      const actionable = computeActionableClues(grid, segmentStates, hiddenFlowerClues, engine);
      trace.push({
        turnNumber,
        phase: 'endgame',
        endgame: { type: 'all-filled', cellsResolved },
        boardState: captureSnapshot(grid, segmentStates, hiddenFlowerClues),
        remainingCount: grid.remainingCount,
        actionableClueCount: actionable.count,
        actionableClueIds: actionable.ids,
      });
      break;
    }

    // Endgame: all filled cells already found, remaining covered are all empty
    if (grid.remainingCount === 0) {
      const cellsResolved: string[] = [];
      for (const [key, cell] of grid.cells) {
        if (cell.visualState === CellVisualState.COVERED) {
          grid.openCell(parseCoordKey(key));
          cellsResolved.push(key);
        }
      }
      turnNumber++;
      const actionable = computeActionableClues(grid, segmentStates, hiddenFlowerClues, engine);
      trace.push({
        turnNumber,
        phase: 'endgame',
        endgame: { type: 'all-empty', cellsResolved },
        boardState: captureSnapshot(grid, segmentStates, hiddenFlowerClues),
        remainingCount: grid.remainingCount,
        actionableClueCount: actionable.count,
        actionableClueIds: actionable.ids,
      });
      break;
    }

    // Phase 1: Activate hidden clues until threshold met or no candidates.
    // Capped to MAX_ACTIVATIONS_PER_TURN as a safety net — if the threshold
    // can't be reached quickly, let Phase 2 make progress and revisit next turn.
    let actionable = computeActionableClues(grid, segmentStates, hiddenFlowerClues, engine);
    let activationsThisTurn = 0;
    while (actionable.count < threshold && activationsThisTurn < MAX_ACTIVATIONS_PER_TURN) {
      const candidates = findActionableHiddenClues(
        grid, segmentStates, hiddenFlowerClues, config.deductionLevels,
      );
      const selected = selectClueToActivate(candidates, weights, prng);
      if (selected === null) break;

      const preActivationCount = actionable.count;
      activateClue(grid, segmentStates, hiddenFlowerClues, selected);
      activatedClues.add(`${selected.type}:${selected.id}`);
      activationsThisTurn++;

      actionable = computeActionableClues(grid, segmentStates, hiddenFlowerClues, engine);
      trace.push({
        turnNumber,
        phase: 'clue-activation',
        clueActivated: {
          type: selected.type,
          id: selected.id,
          label: formatClueId(selected.id, grid),
          reason: `actionable clue count was ${preActivationCount} < threshold ${threshold}; now ${actionable.count}`,
        },
        boardState: captureSnapshot(grid, segmentStates, hiddenFlowerClues),
        remainingCount: grid.remainingCount,
        actionableClueCount: actionable.count,
        actionableClueIds: actionable.ids,
      });
    }

    // Phase 2: Run deduction engine, pick one forced cell, apply move
    const vcs = buildVisibleClueSet(grid, segmentStates, hiddenFlowerClues);
    const forced = engine.run(grid, vcs);
    if (forced.length === 0) {
      // No forced cells and no more clues to activate — stuck
      break;
    }

    const chosen: ForcedCell = prng.pick(forced);
    const coord = parseCoordKey(chosen.coord);
    if (chosen.identity === 'filled') {
      grid.markCell(coord);
    } else {
      grid.openCell(coord);
    }

    turnNumber++;
    const postActionable = computeActionableClues(grid, segmentStates, hiddenFlowerClues, engine);
    trace.push({
      turnNumber,
      phase: 'deduction',
      deduction: {
        clueId: chosen.clueId,
        clueLabel: formatClueId(chosen.clueId, grid),
        deductionType: chosen.deductionType,
        cellResolved: chosen.coord,
        resolvedTo: chosen.identity,
      },
      boardState: captureSnapshot(grid, segmentStates, hiddenFlowerClues),
      remainingCount: grid.remainingCount,
      actionableClueCount: postActionable.count,
      actionableClueIds: postActionable.ids,
    });
  }

  return { trace, activatedClues };
}
