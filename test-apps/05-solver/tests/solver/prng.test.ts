import { describe, it, expect } from 'vitest';
import { hashSeed, createPRNG } from '../../src/solver/prng';

describe('hashSeed', () => {
  it('converts numeric string to a consistent 32-bit number', () => {
    const h1 = hashSeed('42');
    const h2 = hashSeed('42');
    expect(h1).toBe(h2);
    expect(Number.isInteger(h1)).toBe(true);
  });

  it('produces different hashes for different seeds', () => {
    expect(hashSeed('1')).not.toBe(hashSeed('2'));
  });

  it('handles empty string', () => {
    const h = hashSeed('');
    expect(Number.isInteger(h)).toBe(true);
  });

  it('handles multi-character numeric string', () => {
    const h = hashSeed('12345');
    expect(Number.isInteger(h)).toBe(true);
  });
});

describe('createPRNG', () => {
  it('returns deterministic sequence for same seed', () => {
    const a = createPRNG(hashSeed('42'));
    const b = createPRNG(hashSeed('42'));
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it('next() returns values in [0, 1)', () => {
    const prng = createPRNG(hashSeed('99'));
    for (let i = 0; i < 100; i++) {
      const v = prng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const a = createPRNG(hashSeed('1'));
    const b = createPRNG(hashSeed('2'));
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).not.toEqual(seqB);
  });

  it('pick() selects an element from an array', () => {
    const prng = createPRNG(hashSeed('42'));
    const items = ['a', 'b', 'c', 'd', 'e'];
    const picked = prng.pick(items);
    expect(items).toContain(picked);
  });

  it('pick() is deterministic for same seed', () => {
    const items = [10, 20, 30, 40, 50];
    const a = createPRNG(hashSeed('7'));
    const b = createPRNG(hashSeed('7'));
    expect(a.pick(items)).toBe(b.pick(items));
  });

  it('pickWeighted() selects from categories by weight', () => {
    const prng = createPRNG(hashSeed('42'));
    const categories = [
      { weight: 70, items: ['cell1', 'cell2'] },
      { weight: 25, items: ['line1'] },
      { weight: 5, items: ['flower1'] },
    ];
    const result = prng.pickWeighted(categories);
    const allItems = categories.flatMap(c => c.items);
    expect(allItems).toContain(result);
  });

  it('pickWeighted() skips categories with empty items', () => {
    const prng = createPRNG(hashSeed('42'));
    const categories = [
      { weight: 70, items: [] as string[] },
      { weight: 25, items: ['line1'] },
      { weight: 5, items: [] as string[] },
    ];
    const result = prng.pickWeighted(categories);
    expect(result).toBe('line1');
  });

  it('pickWeighted() returns null when all categories are empty', () => {
    const prng = createPRNG(hashSeed('42'));
    const categories = [
      { weight: 70, items: [] as string[] },
      { weight: 25, items: [] as string[] },
    ];
    const result = prng.pickWeighted(categories);
    expect(result).toBeNull();
  });
});
