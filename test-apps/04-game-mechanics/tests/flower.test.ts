import { describe, it, expect } from 'vitest';
import {
  type HexCoord,
  coordKey,
  radius2Positions,
  neighbors,
} from '../src/model/hex-coord';
import {
  type HexCell,
  CellGroundTruth,
  createCell,
} from '../src/model/hex-cell';
import { computeFlowerClue } from '../src/clues/flower';

/** Helper: build a cellMap from an array of (coord, groundTruth) pairs. */
function buildCellMap(
  entries: Array<[HexCoord, CellGroundTruth]>,
): Map<string, HexCell> {
  const map = new Map<string, HexCell>();
  for (const [coord, truth] of entries) {
    map.set(coordKey(coord), createCell(coord, truth));
  }
  return map;
}

// --- T017: Flower clue computation ---

describe('computeFlowerClue', () => {
  const center: HexCoord = { col: 5, row: 5 };

  // ---- Zero filled cells ----

  it('returns 0 when all radius-2 positions are empty', () => {
    const positions = radius2Positions(center);
    const entries: Array<[HexCoord, CellGroundTruth]> = [
      [center, CellGroundTruth.EMPTY],
      ...positions.map(
        (c): [HexCoord, CellGroundTruth] => [c, CellGroundTruth.EMPTY],
      ),
    ];
    const cellMap = buildCellMap(entries);
    expect(computeFlowerClue(center, cellMap)).toBe(0);
  });

  it('returns 0 when no radius-2 positions exist in the cellMap', () => {
    // Only the center cell is in the map, no surrounding cells at all
    const cellMap = buildCellMap([[center, CellGroundTruth.FILLED]]);
    expect(computeFlowerClue(center, cellMap)).toBe(0);
  });

  // ---- All positions filled ----

  it('returns 18 when all 18 radius-2 positions are filled (interior cell)', () => {
    const positions = radius2Positions(center);
    const entries: Array<[HexCoord, CellGroundTruth]> = [
      [center, CellGroundTruth.EMPTY],
      ...positions.map(
        (c): [HexCoord, CellGroundTruth] => [c, CellGroundTruth.FILLED],
      ),
    ];
    const cellMap = buildCellMap(entries);
    expect(computeFlowerClue(center, cellMap)).toBe(18);
  });

  // ---- Various fill patterns ----

  it('counts only direct neighbors (distance 1) when they are filled and distance 2 are empty', () => {
    const dist1 = neighbors(center);
    const dist2Keys = new Set(
      radius2Positions(center)
        .filter((c) => !dist1.some((n) => coordKey(n) === coordKey(c)))
        .map(coordKey),
    );
    const entries: Array<[HexCoord, CellGroundTruth]> = [
      [center, CellGroundTruth.EMPTY],
      ...dist1.map(
        (c): [HexCoord, CellGroundTruth] => [c, CellGroundTruth.FILLED],
      ),
      ...radius2Positions(center)
        .filter((c) => dist2Keys.has(coordKey(c)))
        .map(
          (c): [HexCoord, CellGroundTruth] => [c, CellGroundTruth.EMPTY],
        ),
    ];
    const cellMap = buildCellMap(entries);
    expect(computeFlowerClue(center, cellMap)).toBe(6);
  });

  it('counts only distance-2 cells when they are filled and distance 1 are empty', () => {
    const dist1 = neighbors(center);
    const dist1Keys = new Set(dist1.map(coordKey));
    const allR2 = radius2Positions(center);
    const dist2 = allR2.filter((c) => !dist1Keys.has(coordKey(c)));

    const entries: Array<[HexCoord, CellGroundTruth]> = [
      [center, CellGroundTruth.EMPTY],
      ...dist1.map(
        (c): [HexCoord, CellGroundTruth] => [c, CellGroundTruth.EMPTY],
      ),
      ...dist2.map(
        (c): [HexCoord, CellGroundTruth] => [c, CellGroundTruth.FILLED],
      ),
    ];
    const cellMap = buildCellMap(entries);
    expect(computeFlowerClue(center, cellMap)).toBe(12);
  });

  it('counts a single filled cell in the radius-2 region', () => {
    const positions = radius2Positions(center);
    // Fill only the first position, rest are empty
    const entries: Array<[HexCoord, CellGroundTruth]> = [
      [center, CellGroundTruth.EMPTY],
      [positions[0], CellGroundTruth.FILLED],
      ...positions.slice(1).map(
        (c): [HexCoord, CellGroundTruth] => [c, CellGroundTruth.EMPTY],
      ),
    ];
    const cellMap = buildCellMap(entries);
    expect(computeFlowerClue(center, cellMap)).toBe(1);
  });

  it('counts exactly half of the positions when alternating filled/empty', () => {
    const positions = radius2Positions(center);
    const entries: Array<[HexCoord, CellGroundTruth]> = [
      [center, CellGroundTruth.EMPTY],
      ...positions.map(
        (c, i): [HexCoord, CellGroundTruth] => [
          c,
          i % 2 === 0 ? CellGroundTruth.FILLED : CellGroundTruth.EMPTY,
        ],
      ),
    ];
    const cellMap = buildCellMap(entries);
    // 18 positions, even indices: 0,2,4,...,16 = 9 filled
    expect(computeFlowerClue(center, cellMap)).toBe(9);
  });

  // ---- Boundary: some radius-2 positions missing from cellMap ----

  it('only counts positions that exist in cellMap AND are filled (partial map)', () => {
    const positions = radius2Positions(center);
    // Put only the first 5 positions into the map, all filled
    const entries: Array<[HexCoord, CellGroundTruth]> = [
      [center, CellGroundTruth.EMPTY],
      ...positions.slice(0, 5).map(
        (c): [HexCoord, CellGroundTruth] => [c, CellGroundTruth.FILLED],
      ),
    ];
    const cellMap = buildCellMap(entries);
    expect(computeFlowerClue(center, cellMap)).toBe(5);
  });

  it('does not count positions that exist in cellMap but are empty', () => {
    const positions = radius2Positions(center);
    // 3 filled, 5 empty, rest missing from map
    const entries: Array<[HexCoord, CellGroundTruth]> = [
      [center, CellGroundTruth.EMPTY],
      ...positions.slice(0, 3).map(
        (c): [HexCoord, CellGroundTruth] => [c, CellGroundTruth.FILLED],
      ),
      ...positions.slice(3, 8).map(
        (c): [HexCoord, CellGroundTruth] => [c, CellGroundTruth.EMPTY],
      ),
    ];
    const cellMap = buildCellMap(entries);
    expect(computeFlowerClue(center, cellMap)).toBe(3);
  });

  // ---- Edge of grid (fewer than 18 radius-2 positions in map) ----

  it('returns correct count for a corner cell with limited neighbors in map', () => {
    // Use (0,0) as an edge cell; only place a few radius-2 positions in the map
    const corner: HexCoord = { col: 0, row: 0 };
    const r2 = radius2Positions(corner);

    // Only include positions with non-negative coords (simulating a grid boundary)
    const inBounds = r2.filter((c) => c.col >= 0 && c.row >= 0);
    const filledCount = inBounds.length;

    const entries: Array<[HexCoord, CellGroundTruth]> = [
      [corner, CellGroundTruth.EMPTY],
      ...inBounds.map(
        (c): [HexCoord, CellGroundTruth] => [c, CellGroundTruth.FILLED],
      ),
    ];
    const cellMap = buildCellMap(entries);
    // Should equal however many in-bounds positions there are
    expect(computeFlowerClue(corner, cellMap)).toBe(filledCount);
    // Verify it's actually fewer than 18
    expect(filledCount).toBeLessThan(18);
  });

  it('returns correct count for edge cell with mix of filled and empty in-bounds cells', () => {
    const edge: HexCoord = { col: 0, row: 0 };
    const r2 = radius2Positions(edge);
    const inBounds = r2.filter((c) => c.col >= 0 && c.row >= 0);

    // Fill only every other in-bounds cell
    const entries: Array<[HexCoord, CellGroundTruth]> = [
      [edge, CellGroundTruth.EMPTY],
      ...inBounds.map(
        (c, i): [HexCoord, CellGroundTruth] => [
          c,
          i % 2 === 0 ? CellGroundTruth.FILLED : CellGroundTruth.EMPTY,
        ],
      ),
    ];
    const cellMap = buildCellMap(entries);
    const expectedFilled = inBounds.filter((_, i) => i % 2 === 0).length;
    expect(computeFlowerClue(edge, cellMap)).toBe(expectedFilled);
  });

  // ---- Center cell ground truth does not affect the count ----

  it('does not count the center cell itself even if it is filled', () => {
    const positions = radius2Positions(center);
    const entries: Array<[HexCoord, CellGroundTruth]> = [
      [center, CellGroundTruth.FILLED], // center is filled but should not be counted
      ...positions.map(
        (c): [HexCoord, CellGroundTruth] => [c, CellGroundTruth.EMPTY],
      ),
    ];
    const cellMap = buildCellMap(entries);
    expect(computeFlowerClue(center, cellMap)).toBe(0);
  });

  it('counts surrounding filled cells regardless of center ground truth', () => {
    const positions = radius2Positions(center);
    const entriesCenterFilled: Array<[HexCoord, CellGroundTruth]> = [
      [center, CellGroundTruth.FILLED],
      ...positions.map(
        (c): [HexCoord, CellGroundTruth] => [c, CellGroundTruth.FILLED],
      ),
    ];
    const entriesCenterEmpty: Array<[HexCoord, CellGroundTruth]> = [
      [center, CellGroundTruth.EMPTY],
      ...positions.map(
        (c): [HexCoord, CellGroundTruth] => [c, CellGroundTruth.FILLED],
      ),
    ];
    const mapFilled = buildCellMap(entriesCenterFilled);
    const mapEmpty = buildCellMap(entriesCenterEmpty);
    expect(computeFlowerClue(center, mapFilled)).toBe(18);
    expect(computeFlowerClue(center, mapEmpty)).toBe(18);
  });
});
