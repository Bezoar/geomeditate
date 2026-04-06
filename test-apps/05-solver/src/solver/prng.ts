/** djb2 hash — converts an alphanumeric string to a 32-bit integer. */
export function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

export interface PRNG {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Pick a random element from an array (uniform). */
  pick<T>(items: readonly T[]): T;
  /** Pick from weighted categories. Returns null if all categories are empty. */
  pickWeighted<T>(categories: ReadonlyArray<{ weight: number; items: readonly T[] }>): T | null;
}

/**
 * Mulberry32 PRNG — simple, fast, deterministic.
 * Takes a 32-bit seed from hashSeed().
 */
export function createPRNG(seed: number): PRNG {
  let state = seed | 0;

  function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  }

  function pick<T>(items: readonly T[]): T {
    const index = Math.floor(next() * items.length);
    return items[index];
  }

  function pickWeighted<T>(
    categories: ReadonlyArray<{ weight: number; items: readonly T[] }>,
  ): T | null {
    // Filter to categories that have items
    const available = categories.filter(c => c.items.length > 0);
    if (available.length === 0) return null;

    const totalWeight = available.reduce((sum, c) => sum + c.weight, 0);
    let roll = next() * totalWeight;

    for (const cat of available) {
      roll -= cat.weight;
      if (roll <= 0) {
        return pick(cat.items);
      }
    }

    // Fallback (float rounding): pick from last available category
    return pick(available[available.length - 1].items);
  }

  return { next, pick, pickWeighted };
}
