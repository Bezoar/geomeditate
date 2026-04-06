import type { SolverConfig, DeductionLevels, ClueWeights } from './types';

export const DEFAULT_CONFIG: SolverConfig = {
  seed: '1',
  difficulty: 'easy',
  deductionLevels: {
    trivial: true,
    contiguity: true,
    lineSegment: true,
    flower: true,
    pairwiseIntersection: true,
    constraintPropagation: true,
    setReasoning: true,
  },
  clueWeights: {
    easy: { cell: 70, line: 25, flower: 5 },
    hard: { cell: 20, line: 30, flower: 50 },
  },
  easyModeMinActionable: 3,
  hardModeMinActionable: 1,
};

export interface ConfigOverrides {
  seed?: string;
  difficulty?: 'easy' | 'hard';
  deductionLevels?: Partial<DeductionLevels>;
  clueWeights?: {
    easy?: ClueWeights;
    hard?: ClueWeights;
  };
  easyModeMinActionable?: number;
  hardModeMinActionable?: number;
}

export function mergeConfig(overrides: ConfigOverrides): SolverConfig {
  return {
    seed: overrides.seed ?? DEFAULT_CONFIG.seed,
    difficulty: overrides.difficulty ?? DEFAULT_CONFIG.difficulty,
    deductionLevels: {
      ...DEFAULT_CONFIG.deductionLevels,
      ...overrides.deductionLevels,
    },
    clueWeights: {
      easy: overrides.clueWeights?.easy ?? DEFAULT_CONFIG.clueWeights.easy,
      hard: overrides.clueWeights?.hard ?? DEFAULT_CONFIG.clueWeights.hard,
    },
    easyModeMinActionable: overrides.easyModeMinActionable ?? DEFAULT_CONFIG.easyModeMinActionable,
    hardModeMinActionable: overrides.hardModeMinActionable ?? DEFAULT_CONFIG.hardModeMinActionable,
  };
}
