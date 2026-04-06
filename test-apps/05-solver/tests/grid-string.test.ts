import { describe, it, expect } from 'vitest';
import { encodeGridString, decodeGridString } from '../src/save/grid-string';

describe('encodeGridString', () => {
  it('encodes a simple 3x2 grid', () => {
    const cells = new Map<string, string>([
      ['0,0', 'F'], ['1,0', 'E'], ['2,0', 'F'],
      ['0,1', 'E'], ['1,1', 'F'], ['2,1', 'E'],
    ]);
    const result = encodeGridString(3, 2, cells, '.');
    expect(result).toEqual([
      'F E F',
      ' E F E',
    ]);
  });

  it('encodes missing cells as the default character', () => {
    const cells = new Map<string, string>([
      ['0,0', 'F'], ['2,0', 'E'],
    ]);
    const result = encodeGridString(3, 1, cells, '.');
    expect(result).toEqual(['F . E']);
  });

  it('handles single-column grid', () => {
    const cells = new Map<string, string>([
      ['0,0', 'F'],
      ['0,1', 'E'],
    ]);
    const result = encodeGridString(1, 2, cells, '.');
    expect(result).toEqual(['F', ' E']);
  });
});

describe('decodeGridString', () => {
  it('decodes a simple 3x2 grid', () => {
    const result = decodeGridString(['F E F', ' E F E']);
    expect(result).toEqual(new Map([
      ['0,0', 'F'], ['1,0', 'E'], ['2,0', 'F'],
      ['0,1', 'E'], ['1,1', 'F'], ['2,1', 'E'],
    ]));
  });

  it('preserves missing cell characters', () => {
    const result = decodeGridString(['F . E']);
    expect(result).toEqual(new Map([
      ['0,0', 'F'], ['1,0', '.'], ['2,0', 'E'],
    ]));
  });

  it('round-trips with encodeGridString', () => {
    const original = new Map<string, string>([
      ['0,0', 'F'], ['1,0', 'E'], ['2,0', 'F'], ['3,0', '.'], ['4,0', 'E'],
      ['0,1', 'E'], ['1,1', 'F'], ['2,1', 'E'], ['3,1', 'F'], ['4,1', '.'],
      ['0,2', 'F'], ['1,2', '.'], ['2,2', 'F'], ['3,2', 'E'], ['4,2', 'F'],
    ]);
    const encoded = encodeGridString(5, 3, original, '.');
    const decoded = decodeGridString(encoded);
    expect(decoded).toEqual(original);
  });
});
