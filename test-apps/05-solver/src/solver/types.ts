export type Difficulty = 'easy' | 'hard';

export type DeductionType =
  | 'trivial-count'
  | 'trivial-elimination'
  | 'saturation'
  | 'contiguity'
  | 'line-segment'
  | 'flower'
  | 'pairwise-intersection'
  | 'constraint-propagation'
  | 'set-reasoning';

export interface DeductionLevels {
  trivial: boolean;
  contiguity: boolean;
  lineSegment: boolean;
  flower: boolean;
  pairwiseIntersection: boolean;
  constraintPropagation: boolean;
  setReasoning: boolean;
}

export interface ClueWeights {
  cell: number;
  line: number;
  flower: number;
}

export interface SolverConfig {
  seed: string;
  difficulty: Difficulty;
  deductionLevels: DeductionLevels;
  clueWeights: {
    easy: ClueWeights;
    hard: ClueWeights;
  };
  easyModeMinActionable: number;
  hardModeMinActionable: number;
}

export interface ForcedCell {
  coord: string;
  identity: 'filled' | 'empty';
  clueId: string;
  deductionType: DeductionType;
}

export type ClueActivationType = 'cell' | 'line' | 'flower';

export interface TraceStep {
  turnNumber: number;
  phase: 'clue-activation' | 'deduction' | 'endgame';
  clueActivated?: {
    type: ClueActivationType;
    id: string;
    label: string;
    reason: string;
  };
  deduction?: {
    clueId: string;
    clueLabel: string;
    deductionType: DeductionType;
    cellResolved: string;
    resolvedTo: 'filled' | 'empty';
  };
  endgame?: {
    type: 'all-filled' | 'all-empty';
    cellsResolved: string[];
  };
  boardState: SerializedBoardState;
  remainingCount: number;
  actionableClueCount: number;
  actionableClueIds: string[];
}

export interface SerializedBoardState {
  cells: string[];
  segmentVisibility: Record<string, string>;
  hiddenFlowerClues: string[];
}

export interface SolveResult {
  trace: TraceStep[];
  activatedClues: Set<string>;
}
