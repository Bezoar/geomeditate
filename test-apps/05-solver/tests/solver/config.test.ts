import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, mergeConfig } from '../../src/solver/config';

describe('DEFAULT_CONFIG', () => {
  it('has all deduction levels enabled', () => {
    for (const value of Object.values(DEFAULT_CONFIG.deductionLevels)) {
      expect(value).toBe(true);
    }
  });

  it('has easy difficulty by default', () => {
    expect(DEFAULT_CONFIG.difficulty).toBe('easy');
  });

  it('has seed "1"', () => {
    expect(DEFAULT_CONFIG.seed).toBe('1');
  });

  it('has easy weights summing to 100', () => {
    const w = DEFAULT_CONFIG.clueWeights.easy;
    expect(w.cell + w.line + w.flower).toBe(100);
  });

  it('has hard weights summing to 100', () => {
    const w = DEFAULT_CONFIG.clueWeights.hard;
    expect(w.cell + w.line + w.flower).toBe(100);
  });

  it('easy min actionable is 3', () => {
    expect(DEFAULT_CONFIG.easyModeMinActionable).toBe(3);
  });

  it('hard min actionable is 1', () => {
    expect(DEFAULT_CONFIG.hardModeMinActionable).toBe(1);
  });
});

describe('mergeConfig', () => {
  it('returns DEFAULT_CONFIG when given empty overrides', () => {
    const result = mergeConfig({});
    expect(result).toEqual(DEFAULT_CONFIG);
  });

  it('overrides seed', () => {
    const result = mergeConfig({ seed: '999' });
    expect(result.seed).toBe('999');
  });

  it('overrides difficulty', () => {
    const result = mergeConfig({ difficulty: 'hard' });
    expect(result.difficulty).toBe('hard');
  });

  it('partially overrides deduction levels', () => {
    const result = mergeConfig({ deductionLevels: { trivial: false } });
    expect(result.deductionLevels.trivial).toBe(false);
    expect(result.deductionLevels.contiguity).toBe(true);
  });

  it('partially overrides clue weights', () => {
    const result = mergeConfig({ clueWeights: { easy: { cell: 50, line: 40, flower: 10 } } });
    expect(result.clueWeights.easy).toEqual({ cell: 50, line: 40, flower: 10 });
    expect(result.clueWeights.hard).toEqual(DEFAULT_CONFIG.clueWeights.hard);
  });
});
