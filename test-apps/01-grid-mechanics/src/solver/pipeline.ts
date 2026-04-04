import type { HexGrid } from '../model/hex-grid';
import type { GridEdit } from './grid-editor';
import type { ClueSelection } from './clue-selector';
import type { SolveReplay } from './verifier';
import { selectClues } from './clue-selector';
import { editForSolvability } from './grid-editor';

export interface PuzzleResult {
  grid: HexGrid;
  clueSelection: ClueSelection;
  edits: GridEdit[];
  replay: SolveReplay;
}

/**
 * Top-level puzzle generator that wires selectClues and editForSolvability
 * together.
 *
 * 1. Try selectClues(grid, difficulty). If non-null, return PuzzleResult with
 *    empty edits[] and the selection's verifyResult as replay.
 * 2. If null, try editForSolvability(grid, difficulty). If non-null, return
 *    PuzzleResult with the edited grid, edits, and the clueSelection's
 *    verifyResult as replay.
 * 3. If both fail, return null.
 */
export function generatePuzzle(
  grid: HexGrid,
  difficulty: 'easy' | 'hard',
): PuzzleResult | null {
  // Step 1: Try clue selection alone
  const selection = selectClues(grid, difficulty);
  if (selection !== null) {
    return {
      grid,
      clueSelection: selection,
      edits: [],
      replay: selection.verifyResult,
    };
  }

  // Step 2: Try editing for solvability
  const editResult = editForSolvability(grid, difficulty);
  if (editResult !== null) {
    return {
      grid: editResult.grid,
      clueSelection: editResult.clueSelection,
      edits: editResult.edits,
      replay: editResult.clueSelection.verifyResult,
    };
  }

  // Step 3: Both failed
  return null;
}
