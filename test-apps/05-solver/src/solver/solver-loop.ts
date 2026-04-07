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

const MAX_TURNS = 10000;

function countCoveredCells(grid: HexGrid): number {
  let count = 0;
  for (const cell of grid.cells.values()) {
    if (cell.visualState === CellVisualState.COVERED) count++;
  }
  return count;
}

function countActionableClues(
  grid: HexGrid,
  segmentStates: Map<string, SegmentState>,
  hiddenFlowerClues: Set<string>,
  engine: DeductionEngine,
): number {
  const vcs = buildVisibleClueSet(grid, segmentStates, hiddenFlowerClues);
  const forced = engine.run(grid, vcs);
  const uniqueClueIds = new Set(forced.map(f => f.clueId));
  return uniqueClueIds.size;
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
      const actionableCount = countActionableClues(grid, segmentStates, hiddenFlowerClues, engine);
      trace.push({
        turnNumber,
        phase: 'endgame',
        endgame: { type: 'all-filled', cellsResolved },
        boardState: captureSnapshot(grid, segmentStates, hiddenFlowerClues),
        remainingCount: grid.remainingCount,
        actionableClueCount: actionableCount,
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
      const actionableCount = countActionableClues(grid, segmentStates, hiddenFlowerClues, engine);
      trace.push({
        turnNumber,
        phase: 'endgame',
        endgame: { type: 'all-empty', cellsResolved },
        boardState: captureSnapshot(grid, segmentStates, hiddenFlowerClues),
        remainingCount: grid.remainingCount,
        actionableClueCount: actionableCount,
      });
      break;
    }

    // Phase 1: Activate hidden clues until threshold met or no candidates
    let actionableCount = countActionableClues(grid, segmentStates, hiddenFlowerClues, engine);
    while (actionableCount < threshold) {
      const candidates = findActionableHiddenClues(
        grid, segmentStates, hiddenFlowerClues, config.deductionLevels,
      );
      const selected = selectClueToActivate(candidates, weights, prng);
      if (selected === null) break;

      activateClue(grid, segmentStates, hiddenFlowerClues, selected);
      activatedClues.add(selected.id);

      actionableCount = countActionableClues(grid, segmentStates, hiddenFlowerClues, engine);
      trace.push({
        turnNumber,
        phase: 'clue-activation',
        clueActivated: {
          type: selected.type,
          id: selected.id,
          reason: `actionable clue count ${actionableCount} < threshold ${threshold}`,
        },
        boardState: captureSnapshot(grid, segmentStates, hiddenFlowerClues),
        remainingCount: grid.remainingCount,
        actionableClueCount: actionableCount,
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
    const postActionableCount = countActionableClues(grid, segmentStates, hiddenFlowerClues, engine);
    trace.push({
      turnNumber,
      phase: 'deduction',
      deduction: {
        clueId: chosen.clueId,
        deductionType: chosen.deductionType,
        cellResolved: chosen.coord,
        resolvedTo: chosen.identity,
      },
      boardState: captureSnapshot(grid, segmentStates, hiddenFlowerClues),
      remainingCount: grid.remainingCount,
      actionableClueCount: postActionableCount,
    });
  }

  return { trace, activatedClues };
}
