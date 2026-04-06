import type { HexGrid } from '../../model/hex-grid';
import type { VisibleClueSet } from '../visible-clues';
import type { ForcedCell, DeductionLevels } from '../types';
import { trivialStrategy } from './trivial';

export type DeductionStrategy = (grid: HexGrid, vcs: VisibleClueSet) => ForcedCell[];

interface StrategyEntry {
  key: keyof DeductionLevels;
  fn: DeductionStrategy;
}

export class DeductionEngine {
  private readonly strategies: StrategyEntry[];

  constructor(private readonly levels: DeductionLevels) {
    this.strategies = [
      { key: 'trivial', fn: trivialStrategy },
      // More strategies will be added in Tasks 6-9
    ];
  }

  run(grid: HexGrid, vcs: VisibleClueSet): ForcedCell[] {
    for (const entry of this.strategies) {
      if (!this.levels[entry.key]) continue;
      const result = entry.fn(grid, vcs);
      if (result.length > 0) return result;
    }
    return [];
  }
}
