import { CellGroundTruth } from '../model/hex-cell';
import type { HexGrid } from '../model/hex-grid';
import {
  type ClueId,
  neighborClueId,
  flowerClueId,
  lineClueId,
  GLOBAL_REMAINING_ID,
} from './deductions';
import type { SolveReplay } from './verifier';
import { verify } from './verifier';
import type { SolveTier } from './solver';

export interface ClueSelection {
  visibleClues: Set<ClueId>;
  difficulty: 'easy' | 'hard';
  verifyResult: SolveReplay;
}

/**
 * Enumerate all possible clue IDs for a grid:
 * - For each EMPTY cell with non-null neighborClueValue → neighborClueId
 * - For each FILLED cell with non-null flowerClueValue → flowerClueId
 * - For each lineClue in grid.lineClues → lineClueId
 */
export function allClueIds(grid: HexGrid): Set<ClueId> {
  const ids = new Set<ClueId>();

  for (const cell of grid.cells.values()) {
    if (cell.groundTruth === CellGroundTruth.EMPTY && cell.neighborClueValue !== null) {
      ids.add(neighborClueId(cell.coord));
    } else if (cell.groundTruth === CellGroundTruth.FILLED && cell.flowerClueValue !== null) {
      ids.add(flowerClueId(cell.coord));
    }
  }

  for (const lc of grid.lineClues) {
    ids.add(lineClueId(lc.axis, lc.startCoord));
  }

  return ids;
}

/**
 * Finds a subset of clues to reveal that makes the puzzle solvable at the
 * target difficulty.
 *
 * Returns null if the grid cannot be solved even with all clues visible.
 */
export function selectClues(grid: HexGrid, difficulty: 'easy' | 'hard'): ClueSelection | null {
  const tier: SolveTier = difficulty === 'easy' ? 'simple' : 'advanced';

  const candidates = allClueIds(grid);
  if (difficulty === 'hard') {
    candidates.add(GLOBAL_REMAINING_ID);
  }

  // Verify solvability with ALL clues first
  const fullVerify = verify(grid, candidates, tier);
  if (fullVerify.stuck) {
    return null;
  }

  // Shuffle candidates for variety
  const shuffled = shuffleArray(Array.from(candidates));

  // Iteratively try removing each clue
  const required = new Set<ClueId>(shuffled);
  for (const clueId of shuffled) {
    required.delete(clueId);
    const result = verify(grid, required, tier);
    if (result.stuck) {
      // Removing this clue breaks solvability — it's required
      required.add(clueId);
    }
  }

  // For easy mode: add back non-required neighbor and line clues, plus ~30% of flower clues
  let visibleClues: Set<ClueId>;
  if (difficulty === 'easy') {
    visibleClues = new Set(required);
    for (const clueId of candidates) {
      if (required.has(clueId)) continue;
      if (clueId.startsWith('neighbor:') || clueId.startsWith('line:')) {
        visibleClues.add(clueId);
      } else if (clueId.startsWith('flower:')) {
        if (Math.random() < 0.3) {
          visibleClues.add(clueId);
        }
      }
    }
  } else {
    // Hard mode: use the minimum set as-is
    visibleClues = required;
  }

  // Run verify() one final time with the selected clues
  const verifyResult = verify(grid, visibleClues, tier);

  return {
    visibleClues,
    difficulty,
    verifyResult,
  };
}

/** Fisher-Yates shuffle (in-place), returns the array. */
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
