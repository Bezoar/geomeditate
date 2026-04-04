import { describe, it, expect } from 'vitest';
import {
  neighborClueId,
  flowerClueId,
  lineClueId,
  GLOBAL_REMAINING_ID,
  parseClueId,
} from '../../src/solver/deductions';

describe('clue ID helpers', () => {
  it('creates neighbor clue ID', () => {
    expect(neighborClueId({ col: 3, row: 5 })).toBe('neighbor:3,5');
  });

  it('creates flower clue ID', () => {
    expect(flowerClueId({ col: 0, row: 0 })).toBe('flower:0,0');
  });

  it('creates line clue ID', () => {
    expect(lineClueId('ascending', { col: 1, row: 2 })).toBe('line:ascending:1,2');
  });

  it('has global remaining ID constant', () => {
    expect(GLOBAL_REMAINING_ID).toBe('global:remaining');
  });

  it('parses neighbor clue ID', () => {
    const parsed = parseClueId('neighbor:3,5');
    expect(parsed).toEqual({ type: 'neighbor', coord: { col: 3, row: 5 } });
  });

  it('parses flower clue ID', () => {
    const parsed = parseClueId('flower:0,0');
    expect(parsed).toEqual({ type: 'flower', coord: { col: 0, row: 0 } });
  });

  it('parses line clue ID', () => {
    const parsed = parseClueId('line:ascending:1,2');
    expect(parsed).toEqual({ type: 'line', axis: 'ascending', coord: { col: 1, row: 2 } });
  });

  it('parses global remaining ID', () => {
    const parsed = parseClueId('global:remaining');
    expect(parsed).toEqual({ type: 'global' });
  });

  it('throws on unknown clue ID format', () => {
    expect(() => parseClueId('unknown:foo')).toThrow();
  });
});
