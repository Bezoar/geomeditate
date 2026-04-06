import type { HexGrid } from '../../model/hex-grid';
import type { VisibleClueSet } from '../visible-clues';
import type { ForcedCell } from '../types';
import { CellVisualState } from '../../model/hex-cell';
import { neighbors, coordKey } from '../../model/hex-coord';
import { parseCoordKey } from '../../model/hex-coord';

export function trivialStrategy(grid: HexGrid, vcs: VisibleClueSet): ForcedCell[] {
  const forced: ForcedCell[] = [];

  for (const [key, clue] of vcs.neighborClues) {
    const coord = parseCoordKey(key);
    const nbrs = neighbors(coord);

    let coveredCount = 0;
    let markedFilledCount = 0;
    const coveredNeighborKeys: string[] = [];

    for (const n of nbrs) {
      const nk = coordKey(n);
      const nCell = grid.cells.get(nk);
      if (!nCell) continue;

      if (nCell.visualState === CellVisualState.COVERED) {
        coveredCount++;
        coveredNeighborKeys.push(nk);
      } else if (nCell.visualState === CellVisualState.MARKED_FILLED) {
        markedFilledCount++;
      }
    }

    const remainingFilled = clue.value - markedFilledCount;

    if (remainingFilled === 0 && coveredCount > 0) {
      for (const nk of coveredNeighborKeys) {
        forced.push({
          coord: nk,
          identity: 'empty',
          clueId: key,
          deductionType: markedFilledCount > 0 ? 'saturation' : 'trivial-elimination',
        });
      }
      continue;
    }

    if (remainingFilled > 0 && remainingFilled === coveredCount) {
      for (const nk of coveredNeighborKeys) {
        forced.push({
          coord: nk,
          identity: 'filled',
          clueId: key,
          deductionType: 'trivial-count',
        });
      }
    }
  }

  return forced;
}
