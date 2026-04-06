import { describe, it, expect } from 'vitest';
import { generateRandomGrid } from '../src/grids/random-grid';

describe('generateRandomGrid', () => {
  // --- Dimensions ---

  it('respects width and height dimensions', () => {
    const config = generateRandomGrid(6, 5, 0.5);

    expect(config.width).toBe(6);
    expect(config.height).toBe(5);
  });

  it('returns a valid TestGridConfig', () => {
    const config = generateRandomGrid(4, 3, 0.4);

    expect(config.name).toBe('Random 4x3');
    expect(typeof config.description).toBe('string');
    expect(config.description.length).toBeGreaterThan(0);
    expect(config.width).toBe(4);
    expect(config.height).toBe(3);
    expect(Array.isArray(config.filledCoords)).toBe(true);
    expect(Array.isArray(config.missingCoords)).toBe(true);
    expect(config.missingCoords).toEqual([]);
  });

  it('all filled coords are within grid bounds', () => {
    const config = generateRandomGrid(5, 4, 0.6);

    for (const coord of config.filledCoords) {
      expect(coord.col).toBeGreaterThanOrEqual(0);
      expect(coord.col).toBeLessThan(5);
      expect(coord.row).toBeGreaterThanOrEqual(0);
      expect(coord.row).toBeLessThan(4);
    }
  });

  it('produces no duplicate filled coords', () => {
    const config = generateRandomGrid(6, 5, 0.5);
    const keys = config.filledCoords.map((c) => `${c.col},${c.row}`);
    const unique = new Set(keys);

    expect(unique.size).toBe(keys.length);
  });

  // --- Fill density ---

  it('respects fill density within 10% tolerance for grids >= 20 cells', () => {
    const width = 10;
    const height = 5;
    const totalCells = width * height; // 50
    const density = 0.4;

    const config = generateRandomGrid(width, height, density);
    const actualDensity = config.filledCoords.length / totalCells;

    expect(actualDensity).toBeGreaterThanOrEqual(density - 0.1);
    expect(actualDensity).toBeLessThanOrEqual(density + 0.1);
  });

  // --- Edge cases ---

  it('0% density produces all empty grid', () => {
    const config = generateRandomGrid(5, 4, 0);

    expect(config.filledCoords).toEqual([]);
  });

  it('100% density fills all cells', () => {
    const config = generateRandomGrid(5, 4, 1);
    const totalCells = 5 * 4;

    expect(config.filledCoords.length).toBe(totalCells);
  });

  it('handles 1-cell grid', () => {
    const config = generateRandomGrid(1, 1, 1);

    expect(config.width).toBe(1);
    expect(config.height).toBe(1);
    expect(config.filledCoords).toEqual([{ col: 0, row: 0 }]);
    expect(config.missingCoords).toEqual([]);
  });

  it('handles 1-cell grid with 0 density', () => {
    const config = generateRandomGrid(1, 1, 0);

    expect(config.filledCoords).toEqual([]);
  });

  // --- Non-determinism ---

  it('produces non-deterministic output', () => {
    // Generate two grids; with 50 cells at 50% density, the chance of
    // identical output is astronomically low.
    const a = generateRandomGrid(10, 5, 0.5);
    const b = generateRandomGrid(10, 5, 0.5);

    const keysA = a.filledCoords.map((c) => `${c.col},${c.row}`).sort().join(';');
    const keysB = b.filledCoords.map((c) => `${c.col},${c.row}`).sort().join(';');

    expect(keysA).not.toBe(keysB);
  });

  // --- Density clamping ---

  it('clamps density below 0 to 0', () => {
    const config = generateRandomGrid(3, 3, -0.5);

    expect(config.filledCoords).toEqual([]);
  });

  it('clamps density above 1 to 1', () => {
    const config = generateRandomGrid(3, 3, 1.5);

    expect(config.filledCoords.length).toBe(9);
  });
});
