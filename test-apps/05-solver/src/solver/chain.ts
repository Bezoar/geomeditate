import type { HexGrid } from '../model/hex-grid';
import type { SegmentState } from '../view/segment-state';
import { CellVisualState } from '../model/hex-cell';
import { buildVisibleClueSet } from './visible-clues';
import type { DeductionEngine } from './deduction/engine';

export interface ChainResult {
  /** Distinct clueIds that contributed at least one forced resolution. */
  clueIds: Set<string>;
  /** Distinct forced resolutions as "coord:identity" strings. */
  resolutions: Set<string>;
}

const MAX_CHAIN_ITERATIONS = 50;

/**
 * Iteratively run the deduction engine, applying each forced cell to the grid,
 * until no more cells can be forced. Returns the set of clueIds that contributed
 * to the chain along with the distinct forced resolutions.
 *
 * The visible clue set is locked at the start of the chain — strategies see
 * the grid mutate (so neighbor counts update as cells get resolved) but no
 * new clues become visible via the chain. This matches a player's mental
 * model: a clue is "actionable" only if it's currently on the board and,
 * possibly through propagation, contributes to a forced cell.
 *
 * The grid is saved before mutation and restored before returning, so callers
 * observe no visible change to the grid state.
 */
export function chainForcedResolutions(
  grid: HexGrid,
  segmentStates: Map<string, SegmentState>,
  hiddenFlowerClues: Set<string>,
  engine: DeductionEngine,
): ChainResult {
  const savedStates = new Map<string, CellVisualState>();
  const clueIds = new Set<string>();
  const resolutions = new Set<string>();

  // Lock the visible clue set at the start. Strategies will iterate these
  // clues against a mutating grid, but no new clues get discovered mid-chain.
  const lockedVcs = buildVisibleClueSet(grid, segmentStates, hiddenFlowerClues);

  try {
    for (let iter = 0; iter < MAX_CHAIN_ITERATIONS; iter++) {
      const forced = engine.run(grid, lockedVcs);
      if (forced.length === 0) break;

      let anyNew = false;
      for (const fc of forced) {
        const resKey = `${fc.coord}:${fc.identity}`;
        if (resolutions.has(resKey)) continue;
        resolutions.add(resKey);
        clueIds.add(fc.clueId);

        const cell = grid.cells.get(fc.coord);
        if (!cell) continue;
        if (!savedStates.has(fc.coord)) {
          savedStates.set(fc.coord, cell.visualState);
        }
        const newVisual = fc.identity === 'filled'
          ? CellVisualState.MARKED_FILLED
          : CellVisualState.OPEN_EMPTY;
        grid.cells.set(fc.coord, { ...cell, visualState: newVisual });
        anyNew = true;
      }

      if (!anyNew) break;
    }
  } finally {
    for (const [key, state] of savedStates) {
      const cell = grid.cells.get(key);
      if (cell) {
        grid.cells.set(key, { ...cell, visualState: state });
      }
    }
  }

  return { clueIds, resolutions };
}
