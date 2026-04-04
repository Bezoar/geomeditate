/** Top-level save file structure. */
export interface SaveFile {
  version: number;
  seed?: number | null;
  puzzle: PuzzleDef;
  progress?: ProgressState | null;
  history?: HistoryState | null;
}

/** Puzzle definition — everything needed to set up a fresh game board. */
export interface PuzzleDef {
  name: string;
  description?: string;
  grid: GridDef;
  clues?: CluesDef | null;
}

export interface GridDef {
  width: number;
  height: number;
  groundTruth: string[];
  initialReveals?: string[] | null;
}

export interface CluesDef {
  neighbors?: Record<string, NeighborClueDef>;
  flowers?: Record<string, FlowerClueDef>;
  lines?: Record<string, LineClueDef>;
}

export interface NeighborClueDef {
  contiguity?: boolean;
  visibility?: 'visible' | 'hidden' | 'deleted';
}

export interface FlowerClueDef {
  visibility?: 'visible' | 'hidden' | 'deleted';
}

export interface LineClueDef {
  contiguity?: boolean;
  visibility?: 'visible' | 'invisible' | 'visible-with-line' | 'dimmed' | 'deleted';
}

/** Player's current state against a puzzle. */
export interface ProgressState {
  cells: string[];
  mistakes: number;
  remaining: number;
  clues?: ProgressCluesDef | null;
}

export interface ProgressCluesDef {
  flowers?: Record<string, ProgressFlowerClueDef>;
  lines?: Record<string, ProgressLineClueDef>;
}

export interface ProgressFlowerClueDef {
  visibility?: 'hidden' | 'dimmed' | 'guide';
}

export interface ProgressLineClueDef {
  visibility?: 'visible' | 'invisible' | 'visible-with-line' | 'dimmed';
}

/** Undo/redo action history. */
export interface HistoryState {
  actions: GameAction[];
  cursor: number;
}

/** A recorded game action for undo/redo. */
export type GameAction =
  | { type: 'open'; coord: string; wasMistake: boolean }
  | { type: 'mark'; coord: string; wasMistake: boolean }
  | { type: 'toggleFlowerVisibility'; coord: string; from: string; to: string }
  | { type: 'toggleLineVisibility'; key: string; from: string; to: string }
  | { type: 'dev:recover'; coord: string }
  | { type: 'dev:toggleTruth'; coord: string }
  | { type: 'dev:toggleMissing'; coord: string };
