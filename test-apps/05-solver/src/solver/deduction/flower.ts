import type { HexGrid } from '../../model/hex-grid';
import type { VisibleClueSet } from '../visible-clues';
import type { ForcedCell } from '../types';
import { CellVisualState } from '../../model/hex-cell';
import { radius2Positions, coordKey, parseCoordKey } from '../../model/hex-coord';

export function flowerStrategy(grid: HexGrid, vcs: VisibleClueSet): ForcedCell[] {
  const forced: ForcedCell[] = [];

  for (const [key, clue] of vcs.flowerClues) {
    const coord = parseCoordKey(key);
    const zone = radius2Positions(coord);

    let coveredCount = 0;
    let markedCount = 0;
    const coveredKeys: string[] = [];

    for (const pos of zone) {
      const pk = coordKey(pos);
      const cell = grid.cells.get(pk);
      if (!cell) continue;

      if (cell.visualState === CellVisualState.COVERED) {
        coveredCount++;
        coveredKeys.push(pk);
      } else if (cell.visualState === CellVisualState.MARKED_FILLED) {
        markedCount++;
      }
    }

    if (coveredCount === 0) continue;

    const remainingFilled = clue.value - markedCount;

    if (remainingFilled === 0) {
      for (const ck of coveredKeys) {
        forced.push({ coord: ck, identity: 'empty', clueId: key, deductionType: 'flower' });
      }
      continue;
    }

    if (remainingFilled === coveredCount) {
      for (const ck of coveredKeys) {
        forced.push({ coord: ck, identity: 'filled', clueId: key, deductionType: 'flower' });
      }
    }
  }

  return forced;
}
