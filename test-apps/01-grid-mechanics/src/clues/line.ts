import type { HexCoord, LineAxis } from '../model/hex-coord';
import { coordKey, lineAlongAxis } from '../model/hex-coord';
import { CellGroundTruth, type HexCell } from '../model/hex-cell';

export interface LineClue {
  axis: LineAxis;
  startCoord: HexCoord;
  cells: HexCoord[];
  value: number;
}

export function computeLineClue(
  start: HexCoord,
  axis: LineAxis,
  cellMap: Map<string, HexCell>,
): LineClue {
  const cellKeys = new Set<string>(cellMap.keys());
  const cells = lineAlongAxis(start, axis, cellKeys);
  const value = cells.filter((c) => {
    const cell = cellMap.get(coordKey(c));
    return cell !== undefined && cell.groundTruth === CellGroundTruth.FILLED;
  }).length;
  return { axis, startCoord: start, cells, value };
}

/**
 * Compute the predecessor coordinate for a given cell along a given axis.
 * The predecessor is the reverse of the forward step direction.
 */
function predecessor(coord: HexCoord, axis: LineAxis): HexCoord {
  if (axis === 'vertical') {
    return { col: coord.col, row: coord.row - 1 };
  }
  const isEven = coord.col % 2 === 0;
  if (axis === 'ascending') {
    // Forward ascending step: even col [+1,-1], odd col [+1,0]
    // Reverse: even col [-1,+1], odd col [-1,0]
    return isEven
      ? { col: coord.col - 1, row: coord.row + 1 }
      : { col: coord.col - 1, row: coord.row };
  }
  // descending
  // Forward descending step: even col [+1,0], odd col [+1,+1]
  // Reverse: even col [-1,0], odd col [-1,-1]
  return isEven
    ? { col: coord.col - 1, row: coord.row }
    : { col: coord.col - 1, row: coord.row - 1 };
}

const ALL_AXES: readonly LineAxis[] = ['vertical', 'ascending', 'descending'];

export function computeAllLineClues(
  cellMap: Map<string, HexCell>,
): LineClue[] {
  const result: LineClue[] = [];

  for (const cell of cellMap.values()) {
    for (const axis of ALL_AXES) {
      const pred = predecessor(cell.coord, axis);
      if (!cellMap.has(coordKey(pred))) {
        result.push(computeLineClue(cell.coord, axis, cellMap));
      }
    }
  }

  return result;
}
