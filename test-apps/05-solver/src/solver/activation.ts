import type { HexGrid } from '../model/hex-grid';
import type { SegmentState } from '../view/segment-state';
import type { ClueActivationType, ClueWeights, DeductionLevels } from './types';
import type { PRNG } from './prng';
import { CellVisualState, CellGroundTruth } from '../model/hex-cell';
import { coordKey, parseCoordKey } from '../model/hex-coord';
import { buildVisibleClueSet } from './visible-clues';
import { DeductionEngine } from './deduction/engine';
import { getState } from '../view/segment-state';

export interface ClueCandidate {
  type: ClueActivationType;
  id: string;
}

export interface CandidatesByType {
  cell: ClueCandidate[];
  line: ClueCandidate[];
  flower: ClueCandidate[];
}

export function findActionableHiddenClues(
  grid: HexGrid,
  segmentStates: Map<string, SegmentState>,
  hiddenFlowerClues: Set<string>,
  deductionLevels: DeductionLevels,
): CandidatesByType {
  const engine = new DeductionEngine(deductionLevels);
  const result: CandidatesByType = { cell: [], line: [], flower: [] };

  // Check covered empty cells (potential cell clue reveals)
  for (const [key, cell] of grid.cells) {
    if (cell.visualState !== CellVisualState.COVERED) continue;
    if (cell.groundTruth !== CellGroundTruth.EMPTY) continue;

    // Simulate opening this cell
    grid.cells.set(key, { ...cell, visualState: CellVisualState.OPEN_EMPTY });
    const vcs = buildVisibleClueSet(grid, segmentStates, hiddenFlowerClues);
    const forced = engine.run(grid, vcs);
    grid.cells.set(key, cell); // restore

    if (forced.length > 0) {
      result.cell.push({ type: 'cell', id: key });
    }
  }

  // Check invisible line segments
  for (const [segId, segment] of grid.segments) {
    const state = getState(segmentStates, segment);
    if (state.visibility !== 'invisible') continue;

    // Simulate making it visible
    const tempState: SegmentState = { ...state, visibility: 'visible' };
    segmentStates.set(segId, tempState);
    const vcs = buildVisibleClueSet(grid, segmentStates, hiddenFlowerClues);
    const forced = engine.run(grid, vcs);
    segmentStates.set(segId, state); // restore

    if (forced.length > 0) {
      result.line.push({ type: 'line', id: segId });
    }
  }

  // Check hidden flower clues (on already-marked cells)
  // Snapshot to avoid mutating the set during iteration (delete+add would loop infinitely)
  for (const ck of Array.from(hiddenFlowerClues)) {
    const cell = grid.cells.get(ck);
    if (!cell || cell.visualState !== CellVisualState.MARKED_FILLED) continue;

    hiddenFlowerClues.delete(ck);
    const vcs = buildVisibleClueSet(grid, segmentStates, hiddenFlowerClues);
    const forced = engine.run(grid, vcs);
    hiddenFlowerClues.add(ck); // restore

    if (forced.length > 0) {
      result.flower.push({ type: 'flower', id: ck });
    }
  }

  return result;
}

export function selectClueToActivate(
  candidates: CandidatesByType,
  weights: ClueWeights,
  prng: PRNG,
): ClueCandidate | null {
  return prng.pickWeighted([
    { weight: weights.cell, items: candidates.cell },
    { weight: weights.line, items: candidates.line },
    { weight: weights.flower, items: candidates.flower },
  ]);
}

export function activateClue(
  grid: HexGrid,
  segmentStates: Map<string, SegmentState>,
  hiddenFlowerClues: Set<string>,
  candidate: ClueCandidate,
): void {
  switch (candidate.type) {
    case 'cell': {
      const coord = parseCoordKey(candidate.id);
      grid.openCell(coord);
      break;
    }
    case 'line': {
      const existing = segmentStates.get(candidate.id);
      if (existing) {
        segmentStates.set(candidate.id, { ...existing, visibility: 'visible' });
      } else {
        segmentStates.set(candidate.id, {
          visibility: 'visible',
          savedVisibility: 'visible',
          activated: true,
        });
      }
      break;
    }
    case 'flower': {
      hiddenFlowerClues.delete(candidate.id);
      break;
    }
  }
}
