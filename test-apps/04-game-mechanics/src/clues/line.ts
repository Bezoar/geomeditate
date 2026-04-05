import type { HexCoord, LineAxis } from '../model/hex-coord';
import { coordKey, stepInDirection } from '../model/hex-coord';
import { CellGroundTruth, ClueNotation, type HexCell } from '../model/hex-cell';

// --- Segment / LineGroup types ---

export interface Segment {
  id: string;
  lineGroupId: string;
  axis: LineAxis;
  cluePosition: HexCoord;
  cells: HexCoord[];
  value: number;
  notation: ClueNotation;
  isEdgeClue: boolean;
  contiguityEnabled: boolean;
}

export interface LineGroup {
  id: string;
  axis: LineAxis;
  allCells: HexCoord[];
  gapPositions: HexCoord[];
  segmentIds: string[];
  startCoord: HexCoord;
  endCoord: HexCoord;
}

export function segmentId(axis: LineAxis, cluePosition: HexCoord): string {
  return `seg:${axis}:${coordKey(cluePosition)}`;
}

export function lineGroupId(axis: LineAxis, startCoord: HexCoord): string {
  return `line:${axis}:${coordKey(startCoord)}`;
}

// --- computeAllSegmentsAndGroups ---

export function computeAllSegmentsAndGroups(
  cellMap: Map<string, HexCell>,
): { segments: Map<string, Segment>; lineGroups: Map<string, LineGroup> } {
  const segments = new Map<string, Segment>();
  const lineGroups = new Map<string, LineGroup>();

  if (cellMap.size === 0) return { segments, lineGroups };

  const bounds = computeBounds(cellMap);

  for (const cell of cellMap.values()) {
    for (const axis of ALL_AXES) {
      if (!isDiagonalStart(cell.coord, axis, cellMap, bounds)) continue;

      const firstCell = cell.coord;
      const allCells: HexCoord[] = [];
      const gapPositions: HexCoord[] = [];

      // Walk forward collecting game cells and gap positions within bounds
      let current = firstCell;
      while (isWithinBounds(current, bounds)) {
        if (cellMap.has(coordKey(current))) {
          allCells.push(current);
        } else {
          gapPositions.push(current);
        }
        current = stepInDirection(current, axis);
      }

      // The last game cell is the endCoord
      const endCoord = allCells[allCells.length - 1];
      const groupId = lineGroupId(axis, firstCell);
      const segIds: string[] = [];

      // --- Edge segment: clue at predecessor(firstCell), covers ALL game cells ---
      const edgeCluePos = predecessor(firstCell, axis);
      const edgeSegId = segmentId(axis, edgeCluePos);
      const edgeFilledFlags = allCells.map((c) => {
        const cell = cellMap.get(coordKey(c));
        return cell !== undefined && cell.groundTruth === CellGroundTruth.FILLED;
      });
      const edgeValue = edgeFilledFlags.filter(Boolean).length;
      const edgeNotation = computeLineContiguity(edgeFilledFlags, edgeValue);
      const edgeSegment: Segment = {
        id: edgeSegId,
        lineGroupId: groupId,
        axis,
        cluePosition: edgeCluePos,
        cells: allCells,
        value: edgeValue,
        notation: edgeNotation,
        isEdgeClue: true,
        contiguityEnabled: true,
      };
      segments.set(edgeSegId, edgeSegment);
      segIds.push(edgeSegId);

      // --- Gap segments: one per gap position, covers cells from after the gap to the end ---
      for (const gapPos of gapPositions) {
        const cellsAfterGap = getCellsAfterPosition(gapPos, allCells, axis, bounds);
        if (cellsAfterGap.length === 0) continue; // trailing gap with no cells after it
        const gapSegId = segmentId(axis, gapPos);
        const gapFilledFlags = cellsAfterGap.map((c) => {
          const cell = cellMap.get(coordKey(c));
          return cell !== undefined && cell.groundTruth === CellGroundTruth.FILLED;
        });
        const gapValue = gapFilledFlags.filter(Boolean).length;
        const gapNotation = computeLineContiguity(gapFilledFlags, gapValue);
        const gapSegment: Segment = {
          id: gapSegId,
          lineGroupId: groupId,
          axis,
          cluePosition: gapPos,
          cells: cellsAfterGap,
          value: gapValue,
          notation: gapNotation,
          isEdgeClue: false,
          contiguityEnabled: true,
        };
        segments.set(gapSegId, gapSegment);
        segIds.push(gapSegId);
      }

      const lineGroup: LineGroup = {
        id: groupId,
        axis,
        allCells,
        gapPositions,
        segmentIds: segIds,
        startCoord: firstCell,
        endCoord,
      };
      lineGroups.set(groupId, lineGroup);
    }
  }

  return { segments, lineGroups };
}

/**
 * Return the subset of allCells that come AFTER the given position along the axis.
 * "After" means: the cell's position is reachable by stepping forward from afterPos.
 * We walk forward from afterPos and collect matches in allCells.
 */
function getCellsAfterPosition(
  afterPos: HexCoord,
  allCells: HexCoord[],
  axis: LineAxis,
  bounds: GridBounds,
): HexCoord[] {
  // Build a set of positions that are strictly after afterPos
  const afterKeys = new Set<string>();
  let cur = stepInDirection(afterPos, axis);
  while (isWithinBounds(cur, bounds)) {
    afterKeys.add(coordKey(cur));
    cur = stepInDirection(cur, axis);
  }
  return allCells.filter((c) => afterKeys.has(coordKey(c)));
}

// ---

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
function predecessor(coord: HexCoord, axis: LineAxis): HexCoord {
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
