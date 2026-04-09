import type { HexGrid } from '../model/hex-grid';
import type { GridEdit } from './grid-editor';
import type { ClueSelection } from './clue-selector';
import type { SolveReplay } from './verifier';
import { selectClues } from './clue-selector';
import { editForSolvability } from './grid-editor';
import { solveProgressively } from './progressive';
import type { SolveTier } from './solver';

export interface PuzzleResult {
  grid: HexGrid;
  clueSelection: ClueSelection | null;
  edits: GridEdit[];
  replay: SolveReplay;
}

/**
 * Generate a puzzle using progressive solving: start with no clues visible,
 * reveal them one at a time as the solver gets stuck.
 * Falls back to the old selectClues approach if progressive solving fails.
 */
export function generatePuzzle(
  grid: HexGrid,
  difficulty: 'easy' | 'hard',
): PuzzleResult | null {
  const tier: SolveTier = difficulty === 'easy' ? 'simple' : 'advanced';
  const replay = solveProgressively(grid, tier);

  if (!replay.stuck) {
    return {
      grid,
      clueSelection: null,
      edits: [],
      replay,
    };
  }

  // Progressive solving got stuck — fall back to old approach
  const selection = selectClues(grid, difficulty);
  if (selection !== null) {
    return {
      grid,
      clueSelection: selection,
      edits: [],
      replay: selection.verifyResult,
    };
  }

  const editResult = editForSolvability(grid, difficulty);
  if (editResult !== null) {
    return {
      grid: editResult.grid,
      clueSelection: editResult.clueSelection,
      edits: editResult.edits,
      replay: editResult.clueSelection.verifyResult,
    };
  }

  return null;
}
