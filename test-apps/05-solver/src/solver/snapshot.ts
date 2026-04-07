import type { HexGrid } from '../model/hex-grid';
import type { SegmentState } from '../view/segment-state';
import type { SerializedBoardState } from './types';
import { encodeGridString } from '../save/grid-string';
import { CellVisualState } from '../model/hex-cell';

function visualStateChar(state: CellVisualState): string {
  switch (state) {
    case CellVisualState.COVERED: return 'C';
    case CellVisualState.OPEN_EMPTY: return 'O';
    case CellVisualState.MARKED_FILLED: return 'M';
  }
}

export function captureSnapshot(
  grid: HexGrid,
  segmentStates: Map<string, SegmentState>,
  hiddenFlowerClues: Set<string>,
): SerializedBoardState {
  const cellChars = new Map<string, string>();
  for (const [key, cell] of grid.cells) {
    cellChars.set(key, visualStateChar(cell.visualState));
  }
  const cells = encodeGridString(grid.width, grid.height, cellChars, '.');

  const segmentVisibility: Record<string, string> = {};
  for (const [segId, state] of segmentStates) {
    segmentVisibility[segId] = state.visibility;
  }

  return {
    cells,
    segmentVisibility,
    hiddenFlowerClues: [...hiddenFlowerClues],
  };
}
