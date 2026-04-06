import type { HexGrid } from '../model/hex-grid';
import type { HexCell } from '../model/hex-cell';
import { CellVisualState } from '../model/hex-cell';
import type { Segment } from '../clues/line';
import type { SegmentState } from '../view/segment-state';
import { getState } from '../view/segment-state';

export interface VisibleNeighborClue {
  coord: string;
  value: number;
  notation: string;
  contiguityEnabled: boolean;
  cell: HexCell;
}

export interface VisibleFlowerClue {
  coord: string;
  value: number;
  cell: HexCell;
}

export interface VisibleLineSegment {
  segmentId: string;
  segment: Segment;
}

export interface VisibleClueSet {
  neighborClues: Map<string, VisibleNeighborClue>;
  flowerClues: Map<string, VisibleFlowerClue>;
  lineSegments: Map<string, VisibleLineSegment>;
}

export function buildVisibleClueSet(
  grid: HexGrid,
  segmentStates: Map<string, SegmentState>,
  hiddenFlowerClues: Set<string>,
): VisibleClueSet {
  const neighborClues = new Map<string, VisibleNeighborClue>();
  const flowerClues = new Map<string, VisibleFlowerClue>();
  const lineSegments = new Map<string, VisibleLineSegment>();

  for (const [key, cell] of grid.cells) {
    if (cell.visualState === CellVisualState.OPEN_EMPTY &&
        cell.neighborClueValue !== null &&
        cell.neighborClueNotation !== null) {
      neighborClues.set(key, {
        coord: key,
        value: cell.neighborClueValue,
        notation: cell.neighborClueNotation,
        contiguityEnabled: cell.contiguityEnabled,
        cell,
      });
    }

    if (cell.visualState === CellVisualState.MARKED_FILLED &&
        cell.flowerClueValue !== null &&
        !hiddenFlowerClues.has(key)) {
      flowerClues.set(key, {
        coord: key,
        value: cell.flowerClueValue,
        cell,
      });
    }
  }

  for (const [segId, segment] of grid.segments) {
    const state = getState(segmentStates, segment);
    if (state.visibility !== 'invisible') {
      lineSegments.set(segId, { segmentId: segId, segment });
    }
  }

  return { neighborClues, flowerClues, lineSegments };
}
