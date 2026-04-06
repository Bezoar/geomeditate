import type { TestGridConfig } from '../model/hex-grid';
import type { HexCoord } from '../model/hex-coord';

export function generateRandomGrid(
  width: number,
  height: number,
  fillDensity: number,
): TestGridConfig {
  const clamped = Math.max(0, Math.min(1, fillDensity));
  const totalCells = width * height;
  const fillCount = Math.round(clamped * totalCells);

  // Build all possible coords
  const allCoords: HexCoord[] = [];
  for (let col = 0; col < width; col++) {
    for (let row = 0; row < height; row++) {
      allCoords.push({ col, row });
    }
  }

  // Fisher-Yates shuffle, then take the first fillCount
  for (let i = allCoords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCoords[i], allCoords[j]] = [allCoords[j], allCoords[i]];
  }

  const filledCoords = allCoords.slice(0, fillCount);

  return {
    name: `Random ${width}x${height}`,
    description: `Randomly generated ${width}x${height} grid with ~${Math.round(clamped * 100)}% fill density.`,
    width,
    height,
    filledCoords,
    missingCoords: [],
  };
}
