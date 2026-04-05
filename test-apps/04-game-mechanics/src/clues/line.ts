import type { HexCoord, LineAxis } from '../model/hex-coord';
import { coordKey, stepInDirection } from '../model/hex-coord';
import { CellGroundTruth, ClueNotation, type HexCell } from '../model/hex-cell';

export interface LineClue {
  axis: LineAxis;
  startCoord: HexCoord;
  cells: HexCoord[];
  /** Missing positions along the diagonal that can hold additional clue labels. */
  labelPositions: HexCoord[];
  value: number;
  notation: ClueNotation;
  contiguityEnabled: boolean;
}

interface GridBounds {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

function computeBounds(cellMap: Map<string, HexCell>): GridBounds {
  let minCol = Infinity, maxCol = -Infinity;
  let minRow = Infinity, maxRow = -Infinity;
  for (const cell of cellMap.values()) {
    minCol = Math.min(minCol, cell.coord.col);
    maxCol = Math.max(maxCol, cell.coord.col);
    minRow = Math.min(minRow, cell.coord.row);
    maxRow = Math.max(maxRow, cell.coord.row);
  }
  return { minCol, maxCol, minRow, maxRow };
}

/**
 * Compute the predecessor coordinate for a given cell along a given axis.
 * The predecessor is at col-1 (for diagonals) which has OPPOSITE parity.
 */
export function predecessor(coord: HexCoord, axis: LineAxis): HexCoord {
  if (axis === 'vertical') {
    return { col: coord.col, row: coord.row - 1 };
  }
  const predIsEven = coord.col % 2 !== 0;
  if (axis === 'left-facing') {
    return predIsEven
      ? { col: coord.col - 1, row: coord.row + 1 }
      : { col: coord.col - 1, row: coord.row };
  }
  return predIsEven
    ? { col: coord.col - 1, row: coord.row }
    : { col: coord.col - 1, row: coord.row - 1 };
}

function isWithinBounds(coord: HexCoord, bounds: GridBounds): boolean {
  return coord.col >= bounds.minCol && coord.col <= bounds.maxCol &&
         coord.row >= bounds.minRow && coord.row <= bounds.maxRow;
}

/**
 * Check if a cell is the first cell on its diagonal within the grid.
 * Walk backward along the axis; if any predecessor exists in the cellMap, this is not a start.
 */
function isDiagonalStart(
  coord: HexCoord,
  axis: LineAxis,
  cellMap: Map<string, HexCell>,
  bounds: GridBounds,
): boolean {
  let pred = predecessor(coord, axis);
  while (isWithinBounds(pred, bounds)) {
    if (cellMap.has(coordKey(pred))) return false;
    pred = predecessor(pred, axis);
  }
  return true;
}

/**
 * Walk the entire diagonal from start, collecting all cells that exist in the
 * cellMap. Gaps (missing cells within grid bounds) are skipped, not treated as
 * line breaks.
 */
export function computeLineClue(
  start: HexCoord,
  axis: LineAxis,
  cellMap: Map<string, HexCell>,
): LineClue {
  const bounds = computeBounds(cellMap);
  const cells: HexCoord[] = [];
  const labelPositions: HexCoord[] = [];
  let current = start;
  while (isWithinBounds(current, bounds)) {
    if (cellMap.has(coordKey(current))) {
      cells.push(current);
    } else {
      labelPositions.push(current);
    }
    current = stepInDirection(current, axis);
  }
  const filledFlags = cells.map((c) => {
    const cell = cellMap.get(coordKey(c));
    return cell !== undefined && cell.groundTruth === CellGroundTruth.FILLED;
  });
  const value = filledFlags.filter(Boolean).length;
  const notation = computeLineContiguity(filledFlags, value);
  return { axis, startCoord: cells[0], cells, labelPositions, value, notation, contiguityEnabled: true };
}

/**
 * Determine contiguity for filled cells along a line.
 * PLAIN if 0 or 1 filled. CONTIGUOUS if all filled form one unbroken run.
 * DISCONTIGUOUS if there are gaps (empty cells between filled cells).
 */
function computeLineContiguity(filledFlags: boolean[], count: number): ClueNotation {
  if (count <= 1) return ClueNotation.PLAIN;

  // Count the number of filled "runs" (contiguous groups)
  let runs = 0;
  let inRun = false;
  for (const filled of filledFlags) {
    if (filled && !inRun) {
      runs++;
      inRun = true;
    } else if (!filled) {
      inRun = false;
    }
  }

  return runs === 1 ? ClueNotation.CONTIGUOUS : ClueNotation.DISCONTIGUOUS;
}

const ALL_AXES: readonly LineAxis[] = ['vertical', 'left-facing', 'right-facing'];

export function computeAllLineClues(
  cellMap: Map<string, HexCell>,
): LineClue[] {
  if (cellMap.size === 0) return [];

  const bounds = computeBounds(cellMap);
  const result: LineClue[] = [];

  for (const cell of cellMap.values()) {
    for (const axis of ALL_AXES) {
      if (isDiagonalStart(cell.coord, axis, cellMap, bounds)) {
        result.push(computeLineClue(cell.coord, axis, cellMap));
      }
    }
  }

  return result;
}
