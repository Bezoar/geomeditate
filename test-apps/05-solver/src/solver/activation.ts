import type { HexGrid } from '../model/hex-grid';
import type { SegmentState } from '../view/segment-state';
import type { ClueActivationType, ClueWeights, DeductionLevels } from './types';
import type { PRNG } from './prng';
import { CellVisualState, CellGroundTruth } from '../model/hex-cell';
import { parseCoordKey } from '../model/hex-coord';
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

/** Scanning more than this many candidates per type is wasted work —
 * the weighted PRNG only needs a handful for variety. */
const MAX_CANDIDATES_PER_TYPE = 16;

/**
 * Deduction levels used during the activation scan. Cross-clue strategies
 * (pairwise, propagation, set-reasoning) are disabled here because they run
 * in O(clues^2) or worse and the scan iterates many candidates. The main
 * deduction phase still uses the full strategy set.
 */
function activationScanLevels(full: DeductionLevels): DeductionLevels {
  return {
    trivial: full.trivial,
    contiguity: full.contiguity,
    lineSegment: full.lineSegment,
    flower: full.flower,
    pairwiseIntersection: false,
    constraintPropagation: false,
    setReasoning: false,
  };
}

/**
 * Find hidden clues whose reveal would produce forced cells beyond what's
 * already deducible from the current visible state. A clue is a candidate
 * only if revealing it adds at least one forced resolution not already in
 * the baseline.
 *
 * Scanning stops early once MAX_CANDIDATES_PER_TYPE candidates are found per
 * type; this keeps the scan fast on large grids where hundreds of candidates
 * could otherwise be tested.
 */
export function findActionableHiddenClues(
  grid: HexGrid,
  segmentStates: Map<string, SegmentState>,
  hiddenFlowerClues: Set<string>,
  deductionLevels: DeductionLevels,
): CandidatesByType {
  const engine = new DeductionEngine(activationScanLevels(deductionLevels));
  const result: CandidatesByType = { cell: [], line: [], flower: [] };

  // Compute baseline forced cells from the current visible state.
  const baselineVcs = buildVisibleClueSet(grid, segmentStates, hiddenFlowerClues);
  const baselineForced = engine.run(grid, baselineVcs);
  const baselineKeys = new Set(
    baselineForced.map(f => `${f.coord}:${f.identity}`),
  );

  function hasNewForced(forced: { coord: string; identity: 'filled' | 'empty' }[]): boolean {
    return forced.some(f => !baselineKeys.has(`${f.coord}:${f.identity}`));
  }

  // Check covered empty cells (potential cell clue reveals)
  for (const [key, cell] of grid.cells) {
    if (result.cell.length >= MAX_CANDIDATES_PER_TYPE) break;
    if (cell.visualState !== CellVisualState.COVERED) continue;
    if (cell.groundTruth !== CellGroundTruth.EMPTY) continue;

    // Simulate opening this cell
    grid.cells.set(key, { ...cell, visualState: CellVisualState.OPEN_EMPTY });
    const vcs = buildVisibleClueSet(grid, segmentStates, hiddenFlowerClues);
    const forced = engine.run(grid, vcs);
    grid.cells.set(key, cell); // restore

    if (hasNewForced(forced)) {
      result.cell.push({ type: 'cell', id: key });
    }
  }

  // Check invisible line segments
  for (const [segId, segment] of grid.segments) {
    if (result.line.length >= MAX_CANDIDATES_PER_TYPE) break;
    const state = getState(segmentStates, segment);
    if (state.visibility !== 'invisible') continue;

    // Simulate making it visible
    const tempState: SegmentState = { ...state, visibility: 'visible' };
    segmentStates.set(segId, tempState);
    const vcs = buildVisibleClueSet(grid, segmentStates, hiddenFlowerClues);
    const forced = engine.run(grid, vcs);
    segmentStates.set(segId, state); // restore

    if (hasNewForced(forced)) {
      result.line.push({ type: 'line', id: segId });
    }
  }

  // Check hidden flower clues (on already-marked cells)
  // Snapshot to avoid mutating the set during iteration (delete+add would loop infinitely)
  for (const ck of Array.from(hiddenFlowerClues)) {
    if (result.flower.length >= MAX_CANDIDATES_PER_TYPE) break;
    const cell = grid.cells.get(ck);
    if (!cell || cell.visualState !== CellVisualState.MARKED_FILLED) continue;

    hiddenFlowerClues.delete(ck);
    const vcs = buildVisibleClueSet(grid, segmentStates, hiddenFlowerClues);
    const forced = engine.run(grid, vcs);
    hiddenFlowerClues.add(ck); // restore

    if (hasNewForced(forced)) {
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
        segmentStates.set(candidate.id, { ...existing, visibility: 'visible', activated: true });
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
