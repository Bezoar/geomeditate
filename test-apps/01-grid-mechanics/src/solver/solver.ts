import { coordKey } from '../model/hex-coord';
import type { HexGrid } from '../model/hex-grid';
import {
  type ClueId,
  type Deduction,
  parseClueId,
  deduceFromNeighborClue,
  deduceFromFlowerClue,
  deduceFromLineClue,
  deduceFromGlobalRemaining,
} from './deductions';

export type SolveTier = 'simple' | 'advanced';

/**
 * Run all applicable deduction functions for the given visible clues and
 * return a deduplicated list of deductions (first deduction per coord wins).
 */
export function solve(
  grid: HexGrid,
  visibleClues: Set<ClueId>,
  tier: SolveTier,
): Deduction[] {
  const all: Deduction[] = [];

  for (const clueId of visibleClues) {
    const parsed = parseClueId(clueId);

    if (parsed.type === 'neighbor') {
      const cell = grid.cells.get(coordKey(parsed.coord));
      if (cell !== undefined && cell.neighborClueValue !== null) {
        all.push(...deduceFromNeighborClue(parsed.coord, cell.neighborClueValue, grid.cells));
      }
    } else if (parsed.type === 'flower') {
      const cell = grid.cells.get(coordKey(parsed.coord));
      if (cell !== undefined && cell.flowerClueValue !== null) {
        all.push(...deduceFromFlowerClue(parsed.coord, cell.flowerClueValue, grid.cells));
      }
    } else if (parsed.type === 'line') {
      const lineClue = grid.lineClues.find(
        (lc) =>
          lc.axis === parsed.axis &&
          coordKey(lc.startCoord) === coordKey(parsed.coord),
      );
      if (lineClue !== undefined) {
        all.push(...deduceFromLineClue(lineClue, grid.cells));
      }
    } else if (parsed.type === 'global' && tier === 'advanced') {
      all.push(...deduceFromGlobalRemaining(grid.remainingCount, grid.cells));
    }
  }

  // Deduplicate: first deduction per coord wins
  const seen = new Set<string>();
  const result: Deduction[] = [];
  for (const deduction of all) {
    const key = coordKey(deduction.coord);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(deduction);
    }
  }

  return result;
}
