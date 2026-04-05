import type { ProgressState, ProgressCluesDef, ProgressFlowerClueDef, ProgressLineClueDef } from './types';
import type { HexGrid } from '../model/hex-grid';
import type { LineClueState } from '../view/line-clue-state';
import { CellVisualState } from '../model/hex-cell';
import { encodeGridString, decodeGridString } from './grid-string';

function visualStateChar(state: CellVisualState): string {
  switch (state) {
    case CellVisualState.COVERED: return 'C';
    case CellVisualState.OPEN_EMPTY: return 'O';
    case CellVisualState.MARKED_FILLED: return 'M';
  }
}

function charToVisualState(char: string): CellVisualState {
  switch (char) {
    case 'C': return CellVisualState.COVERED;
    case 'O': return CellVisualState.OPEN_EMPTY;
    case 'M': return CellVisualState.MARKED_FILLED;
    default: throw new Error(`Unknown cell state character: ${char}`);
  }
}

/** Convert internal line clue key format "axis:col,row" to save format "l:col,row". */
function toSaveLineKey(internalKey: string): string {
  const colonIdx = internalKey.indexOf(':');
  const axis = internalKey.substring(0, colonIdx);
  const coord = internalKey.substring(colonIdx + 1);
  const abbrev = axis === 'vertical' ? 'v' : axis === 'left-facing' ? 'l' : 'r';
  return `${abbrev}:${coord}`;
}

/** Convert save format line key "l:col,row" to internal format "left-facing:col,row". */
function toInternalLineKey(saveKey: string): string {
  const colonIdx = saveKey.indexOf(':');
  const abbrev = saveKey.substring(0, colonIdx);
  const coord = saveKey.substring(colonIdx + 1);
  const axis = abbrev === 'v' ? 'vertical' : abbrev === 'l' ? 'left-facing' : 'right-facing';
  return `${axis}:${coord}`;
}

export function serializeProgress(
  grid: HexGrid,
  lineClueStates: Map<string, LineClueState>,
  hiddenFlowerClues: Set<string>,
  dimmedFlowerClues: Set<string>,
  flowerGuideClues: Set<string>,
): ProgressState {
  // Encode cell visual states
  const cellChars = new Map<string, string>();
  for (const [key, cell] of grid.cells) {
    cellChars.set(key, visualStateChar(cell.visualState));
  }
  const cells = encodeGridString(grid.width, grid.height, cellChars, '.');

  // Collect flower clue overrides
  const flowerOverrides: Record<string, ProgressFlowerClueDef> = {};
  for (const ck of hiddenFlowerClues) {
    flowerOverrides[ck] = { visibility: 'hidden' };
  }
  for (const ck of dimmedFlowerClues) {
    flowerOverrides[ck] = { visibility: 'dimmed' };
  }
  for (const ck of flowerGuideClues) {
    flowerOverrides[ck] = { visibility: 'guide' };
  }

  // Collect line clue overrides (non-default visibility)
  const lineOverrides: Record<string, ProgressLineClueDef> = {};
  for (const [key, state] of lineClueStates) {
    if (state.visibility !== 'visible') {
      lineOverrides[toSaveLineKey(key)] = { visibility: state.visibility };
    }
  }

  const hasClueOverrides =
    Object.keys(flowerOverrides).length > 0 ||
    Object.keys(lineOverrides).length > 0;

  const clues: ProgressCluesDef | null = hasClueOverrides
    ? {
        flowers: Object.keys(flowerOverrides).length > 0 ? flowerOverrides : undefined,
        lines: Object.keys(lineOverrides).length > 0 ? lineOverrides : undefined,
      }
    : null;

  return {
    cells,
    mistakes: grid.mistakeCount,
    remaining: grid.remainingCount,
    clues,
  };
}

export interface DeserializedProgress {
  lineClueStates: Map<string, LineClueState>;
  hiddenFlowerClues: Set<string>;
  dimmedFlowerClues: Set<string>;
  flowerGuideClues: Set<string>;
}

export function deserializeProgress(
  progress: ProgressState,
  grid: HexGrid,
): DeserializedProgress {
  // Restore cell visual states
  const decoded = decodeGridString(progress.cells);
  for (const [key, char] of decoded) {
    if (char === '.') continue;
    const cell = grid.cells.get(key);
    if (cell) {
      grid.cells.set(key, { ...cell, visualState: charToVisualState(char) });
    }
  }
  grid.mistakeCount = progress.mistakes;
  grid.remainingCount = progress.remaining;

  // Restore flower clue visibility
  const hiddenFlowerClues = new Set<string>();
  const dimmedFlowerClues = new Set<string>();
  const flowerGuideClues = new Set<string>();

  if (progress.clues?.flowers) {
    for (const [key, def] of Object.entries(progress.clues.flowers)) {
      switch (def.visibility) {
        case 'hidden': hiddenFlowerClues.add(key); break;
        case 'dimmed': dimmedFlowerClues.add(key); break;
        case 'guide': flowerGuideClues.add(key); break;
      }
    }
  }

  // Restore line clue visibility
  const lineClueStates = new Map<string, LineClueState>();
  if (progress.clues?.lines) {
    for (const [saveKey, def] of Object.entries(progress.clues.lines)) {
      const internalKey = toInternalLineKey(saveKey);
      if (def.visibility) {
        lineClueStates.set(internalKey, {
          visibility: def.visibility,
          savedVisibility: def.visibility === 'invisible' ? 'visible' : def.visibility,
        });
      }
    }
  }

  return { lineClueStates, hiddenFlowerClues, dimmedFlowerClues, flowerGuideClues };
}
