import type { SaveFile } from './types';
import type { HexGrid } from '../model/hex-grid';
import type { LineClueState } from '../view/line-clue-state';
import { serializePuzzle, deserializePuzzle } from './puzzle-mapper';
import { serializeProgress, deserializeProgress, type DeserializedProgress } from './progress-mapper';
import { ActionHistory } from './history';

export interface SaveFileInput {
  grid: HexGrid;
  name: string;
  description: string;
  lineClueStates: Map<string, LineClueState>;
  hiddenFlowerClues: Set<string>;
  dimmedFlowerClues: Set<string>;
  flowerGuideClues: Set<string>;
  history: ActionHistory;
}

export interface SaveFileOutput extends DeserializedProgress {
  grid: HexGrid;
  name: string;
  description: string;
  history: ActionHistory;
}

export function serializeSaveFile(input: SaveFileInput): string {
  const puzzle = serializePuzzle(input.grid, input.name, input.description);
  const progress = serializeProgress(
    input.grid,
    input.lineClueStates,
    input.hiddenFlowerClues,
    input.dimmedFlowerClues,
    input.flowerGuideClues,
  );

  const historySerialized = input.history.canUndo() || input.history.canRedo()
    ? input.history.serialize()
    : null;

  const saveFile: SaveFile = {
    version: 1,
    seed: null,
    puzzle,
    progress,
    history: historySerialized,
  };

  return JSON.stringify(saveFile, null, 2);
}

export function deserializeSaveFile(json: string): SaveFileOutput {
  const data = JSON.parse(json) as SaveFile;

  const grid = deserializePuzzle(data.puzzle);

  let progressResult: DeserializedProgress = {
    lineClueStates: new Map(),
    hiddenFlowerClues: new Set(),
    dimmedFlowerClues: new Set(),
    flowerGuideClues: new Set(),
  };

  if (data.progress) {
    progressResult = deserializeProgress(data.progress, grid);
  }

  const history = data.history
    ? ActionHistory.deserialize(data.history)
    : new ActionHistory();

  return {
    grid,
    name: data.puzzle.name,
    description: data.puzzle.description ?? '',
    history,
    ...progressResult,
  };
}
