import type { HexGrid } from '../../model/hex-grid';
import type { VisibleClueSet } from '../visible-clues';
import type { ForcedCell } from '../types';
import { CellVisualState } from '../../model/hex-cell';
import { coordKey } from '../../model/hex-coord';

export function lineSegmentStrategy(grid: HexGrid, vcs: VisibleClueSet): ForcedCell[] {
  const forced: ForcedCell[] = [];

  for (const [segId, { segment }] of vcs.lineSegments) {
    let coveredCount = 0;
    let markedCount = 0;
    const coveredKeys: string[] = [];

    for (const c of segment.cells) {
      const ck = coordKey(c);
      const cell = grid.cells.get(ck);
      if (!cell) continue;

      if (cell.visualState === CellVisualState.COVERED) {
        coveredCount++;
        coveredKeys.push(ck);
      } else if (cell.visualState === CellVisualState.MARKED_FILLED) {
        markedCount++;
      }
    }

    if (coveredCount === 0) continue;

    const remainingFilled = segment.value - markedCount;

    if (remainingFilled === 0) {
      for (const ck of coveredKeys) {
        forced.push({ coord: ck, identity: 'empty', clueId: segId, deductionType: 'line-segment' });
      }
      continue;
    }

    if (remainingFilled === coveredCount) {
      for (const ck of coveredKeys) {
        forced.push({ coord: ck, identity: 'filled', clueId: segId, deductionType: 'line-segment' });
      }
    }
  }

  return forced;
}
