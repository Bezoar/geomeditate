import type { HexCoord } from '../model/hex-coord';
import { coordKey, radius2Positions } from '../model/hex-coord';
import { CellGroundTruth, type HexCell } from '../model/hex-cell';

export function computeFlowerClue(coord: HexCoord, cellMap: Map<string, HexCell>): number {
  let count = 0;
  for (const pos of radius2Positions(coord)) {
    const cell = cellMap.get(coordKey(pos));
    if (cell != null && cell.groundTruth === CellGroundTruth.FILLED) {
      count++;
    }
  }
  return count;
}
