import { describe, it, expect } from 'vitest';
import { type HexCoord, coordKey, neighbors } from '../src/model/hex-coord';
import {
  CellGroundTruth,
  ClueNotation,
  type HexCell,
  createCell,
} from '../src/model/hex-cell';
import {
  computeNeighborClue,
  computeContiguity,
  formatNeighborClue,
} from '../src/clues/neighbor';

// --- Helpers ---

/** Build a cellMap from an array of (coord, groundTruth) pairs. */
function buildCellMap(
  entries: Array<[HexCoord, CellGroundTruth]>,
): Map<string, HexCell> {
  const map = new Map<string, HexCell>();
  for (const [coord, gt] of entries) {
    map.set(coordKey(coord), createCell(coord, gt));
  }
  return map;
}

/**
 * Build a full ring of 6 neighbors around `center`, all present in the map.
 * Returns entries for center + all 6 neighbors with specified ground truths.
 */
function fullNeighborEntries(
  center: HexCoord,
  neighborGroundTruths: CellGroundTruth[],
): Array<[HexCoord, CellGroundTruth]> {
  const nbrs = neighbors(center);
  const entries: Array<[HexCoord, CellGroundTruth]> = [
    [center, CellGroundTruth.EMPTY],
  ];
  for (let i = 0; i < 6; i++) {
    entries.push([nbrs[i], neighborGroundTruths[i]]);
  }
  return entries;
}

// --- T015: Neighbor clue computation tests ---

describe('computeNeighborClue', () => {
  const center: HexCoord = { col: 4, row: 4 };

  it('returns 0 when all 6 neighbors are EMPTY', () => {
    const allEmpty = Array<CellGroundTruth>(6).fill(CellGroundTruth.EMPTY);
    const cellMap = buildCellMap(fullNeighborEntries(center, allEmpty));
    expect(computeNeighborClue(center, cellMap)).toBe(0);
  });

  it('returns 6 when all 6 neighbors are FILLED', () => {
    const allFilled = Array<CellGroundTruth>(6).fill(CellGroundTruth.FILLED);
    const cellMap = buildCellMap(fullNeighborEntries(center, allFilled));
    expect(computeNeighborClue(center, cellMap)).toBe(6);
  });

  it('returns 3 when exactly 3 neighbors are FILLED', () => {
    const mixed = [
      CellGroundTruth.FILLED,
      CellGroundTruth.EMPTY,
      CellGroundTruth.FILLED,
      CellGroundTruth.EMPTY,
      CellGroundTruth.FILLED,
      CellGroundTruth.EMPTY,
    ];
    const cellMap = buildCellMap(fullNeighborEntries(center, mixed));
    expect(computeNeighborClue(center, cellMap)).toBe(3);
  });

  it('only counts neighbors that exist in the cellMap (boundary cell)', () => {
    // Only put 3 of the 6 neighbors in the map, all FILLED
    const nbrs = neighbors(center);
    const cellMap = buildCellMap([
      [center, CellGroundTruth.EMPTY],
      [nbrs[0], CellGroundTruth.FILLED],
      [nbrs[1], CellGroundTruth.FILLED],
      [nbrs[2], CellGroundTruth.FILLED],
      // nbrs[3], nbrs[4], nbrs[5] not in map (they don't exist in the grid)
    ]);
    expect(computeNeighborClue(center, cellMap)).toBe(3);
  });

  it('does not count neighbors that exist in map but are EMPTY', () => {
    const nbrs = neighbors(center);
    const cellMap = buildCellMap([
      [center, CellGroundTruth.EMPTY],
      [nbrs[0], CellGroundTruth.FILLED],
      [nbrs[1], CellGroundTruth.EMPTY],
      [nbrs[2], CellGroundTruth.EMPTY],
      [nbrs[3], CellGroundTruth.EMPTY],
      [nbrs[4], CellGroundTruth.EMPTY],
      [nbrs[5], CellGroundTruth.EMPTY],
    ]);
    expect(computeNeighborClue(center, cellMap)).toBe(1);
  });

  it('returns 0 when no neighbors are in the cellMap at all', () => {
    // Only the center exists
    const cellMap = buildCellMap([[center, CellGroundTruth.EMPTY]]);
    expect(computeNeighborClue(center, cellMap)).toBe(0);
  });

  it('correctly handles a boundary cell where 2 of 4 present neighbors are FILLED', () => {
    const nbrs = neighbors(center);
    const cellMap = buildCellMap([
      [center, CellGroundTruth.EMPTY],
      [nbrs[0], CellGroundTruth.FILLED],
      [nbrs[1], CellGroundTruth.EMPTY],
      [nbrs[3], CellGroundTruth.FILLED],
      [nbrs[5], CellGroundTruth.EMPTY],
    ]);
    expect(computeNeighborClue(center, cellMap)).toBe(2);
  });
});

// --- T016: Contiguity detection tests ---

describe('computeContiguity', () => {
  const center: HexCoord = { col: 4, row: 4 };

  it('returns PLAIN when 0 neighbors are filled', () => {
    const allEmpty = Array<CellGroundTruth>(6).fill(CellGroundTruth.EMPTY);
    const cellMap = buildCellMap(fullNeighborEntries(center, allEmpty));
    expect(computeContiguity(center, cellMap)).toBe(ClueNotation.PLAIN);
  });

  it('returns PLAIN when exactly 1 neighbor is filled', () => {
    const one = [
      CellGroundTruth.FILLED,
      CellGroundTruth.EMPTY,
      CellGroundTruth.EMPTY,
      CellGroundTruth.EMPTY,
      CellGroundTruth.EMPTY,
      CellGroundTruth.EMPTY,
    ];
    const cellMap = buildCellMap(fullNeighborEntries(center, one));
    expect(computeContiguity(center, cellMap)).toBe(ClueNotation.PLAIN);
  });

  it('returns CONTIGUOUS when all 6 neighbors are filled (single group)', () => {
    const allFilled = Array<CellGroundTruth>(6).fill(CellGroundTruth.FILLED);
    const cellMap = buildCellMap(fullNeighborEntries(center, allFilled));
    expect(computeContiguity(center, cellMap)).toBe(ClueNotation.CONTIGUOUS);
  });

  it('returns CONTIGUOUS when 2 adjacent neighbors are filled', () => {
    // Neighbor indices 0 and 1 are adjacent to each other in the hex ring
    const truths: CellGroundTruth[] = [
      CellGroundTruth.FILLED,  // index 0
      CellGroundTruth.FILLED,  // index 1 (adjacent to 0)
      CellGroundTruth.EMPTY,
      CellGroundTruth.EMPTY,
      CellGroundTruth.EMPTY,
      CellGroundTruth.EMPTY,
    ];
    const cellMap = buildCellMap(fullNeighborEntries(center, truths));
    expect(computeContiguity(center, cellMap)).toBe(ClueNotation.CONTIGUOUS);
  });

  it('returns DISCONTIGUOUS when 2 non-adjacent neighbors are filled', () => {
    // Neighbor indices 0 and 3 are opposite in the hex ring (not adjacent)
    const truths: CellGroundTruth[] = [
      CellGroundTruth.FILLED,  // index 0
      CellGroundTruth.EMPTY,
      CellGroundTruth.EMPTY,
      CellGroundTruth.FILLED,  // index 3 (opposite side)
      CellGroundTruth.EMPTY,
      CellGroundTruth.EMPTY,
    ];
    const cellMap = buildCellMap(fullNeighborEntries(center, truths));
    expect(computeContiguity(center, cellMap)).toBe(ClueNotation.DISCONTIGUOUS);
  });

  it('returns CONTIGUOUS when 3 consecutive neighbors are filled', () => {
    // Indices 0, 1, 2 form a contiguous arc
    const truths: CellGroundTruth[] = [
      CellGroundTruth.FILLED,
      CellGroundTruth.FILLED,
      CellGroundTruth.FILLED,
      CellGroundTruth.EMPTY,
      CellGroundTruth.EMPTY,
      CellGroundTruth.EMPTY,
    ];
    const cellMap = buildCellMap(fullNeighborEntries(center, truths));
    expect(computeContiguity(center, cellMap)).toBe(ClueNotation.CONTIGUOUS);
  });

  it('returns DISCONTIGUOUS when filled neighbors form 2 separate groups', () => {
    // Indices 0, 1 form one group; index 4 alone forms another
    const truths: CellGroundTruth[] = [
      CellGroundTruth.FILLED,
      CellGroundTruth.FILLED,
      CellGroundTruth.EMPTY,
      CellGroundTruth.EMPTY,
      CellGroundTruth.FILLED,
      CellGroundTruth.EMPTY,
    ];
    const cellMap = buildCellMap(fullNeighborEntries(center, truths));
    expect(computeContiguity(center, cellMap)).toBe(ClueNotation.DISCONTIGUOUS);
  });

  it('returns DISCONTIGUOUS when filled neighbors form 3 separate groups', () => {
    // Indices 0, 2, 4 are each isolated (alternating pattern)
    const truths: CellGroundTruth[] = [
      CellGroundTruth.FILLED,
      CellGroundTruth.EMPTY,
      CellGroundTruth.FILLED,
      CellGroundTruth.EMPTY,
      CellGroundTruth.FILLED,
      CellGroundTruth.EMPTY,
    ];
    const cellMap = buildCellMap(fullNeighborEntries(center, truths));
    expect(computeContiguity(center, cellMap)).toBe(ClueNotation.DISCONTIGUOUS);
  });

  it('returns CONTIGUOUS when 5 neighbors are filled (one gap does not split)', () => {
    // 5 consecutive filled = one contiguous group
    const truths: CellGroundTruth[] = [
      CellGroundTruth.FILLED,
      CellGroundTruth.FILLED,
      CellGroundTruth.FILLED,
      CellGroundTruth.FILLED,
      CellGroundTruth.FILLED,
      CellGroundTruth.EMPTY,
    ];
    const cellMap = buildCellMap(fullNeighborEntries(center, truths));
    expect(computeContiguity(center, cellMap)).toBe(ClueNotation.CONTIGUOUS);
  });

  it('returns CONTIGUOUS for wrap-around contiguous group (indices 5 and 0)', () => {
    // Indices 4, 5, 0 form a contiguous arc that wraps around the ring
    const truths: CellGroundTruth[] = [
      CellGroundTruth.FILLED,  // 0
      CellGroundTruth.EMPTY,
      CellGroundTruth.EMPTY,
      CellGroundTruth.EMPTY,
      CellGroundTruth.FILLED,  // 4
      CellGroundTruth.FILLED,  // 5 (adjacent to both 4 and 0)
    ];
    const cellMap = buildCellMap(fullNeighborEntries(center, truths));
    expect(computeContiguity(center, cellMap)).toBe(ClueNotation.CONTIGUOUS);
  });

  it('returns PLAIN for boundary cell with only 1 filled neighbor in map', () => {
    // Only 2 neighbors in map, 1 filled
    const nbrs = neighbors(center);
    const cellMap = buildCellMap([
      [center, CellGroundTruth.EMPTY],
      [nbrs[0], CellGroundTruth.FILLED],
      [nbrs[1], CellGroundTruth.EMPTY],
    ]);
    expect(computeContiguity(center, cellMap)).toBe(ClueNotation.PLAIN);
  });

  it('handles boundary cell where missing neighbors do not break contiguity', () => {
    // 2 adjacent filled neighbors present, others missing from map
    const nbrs = neighbors(center);
    const cellMap = buildCellMap([
      [center, CellGroundTruth.EMPTY],
      [nbrs[0], CellGroundTruth.FILLED],
      [nbrs[1], CellGroundTruth.FILLED],
    ]);
    expect(computeContiguity(center, cellMap)).toBe(ClueNotation.CONTIGUOUS);
  });

  it('handles boundary cell where filled neighbors are not adjacent', () => {
    // 2 filled neighbors present but not adjacent to each other
    const nbrs = neighbors(center);
    const cellMap = buildCellMap([
      [center, CellGroundTruth.EMPTY],
      [nbrs[0], CellGroundTruth.FILLED],
      [nbrs[3], CellGroundTruth.FILLED],
    ]);
    expect(computeContiguity(center, cellMap)).toBe(ClueNotation.DISCONTIGUOUS);
  });

  it('returns PLAIN when 0 filled neighbors exist at boundary', () => {
    const nbrs = neighbors(center);
    const cellMap = buildCellMap([
      [center, CellGroundTruth.EMPTY],
      [nbrs[0], CellGroundTruth.EMPTY],
      [nbrs[1], CellGroundTruth.EMPTY],
    ]);
    expect(computeContiguity(center, cellMap)).toBe(ClueNotation.PLAIN);
  });

  it('works correctly with odd-column center', () => {
    const oddCenter: HexCoord = { col: 3, row: 3 };
    const nbrs = neighbors(oddCenter);
    // 2 adjacent filled neighbors
    const cellMap = buildCellMap([
      [oddCenter, CellGroundTruth.EMPTY],
      [nbrs[0], CellGroundTruth.FILLED],
      [nbrs[1], CellGroundTruth.FILLED],
      [nbrs[2], CellGroundTruth.EMPTY],
      [nbrs[3], CellGroundTruth.EMPTY],
      [nbrs[4], CellGroundTruth.EMPTY],
      [nbrs[5], CellGroundTruth.EMPTY],
    ]);
    expect(computeContiguity(oddCenter, cellMap)).toBe(ClueNotation.CONTIGUOUS);
  });

  it('works correctly with odd-column center and discontiguous neighbors', () => {
    const oddCenter: HexCoord = { col: 3, row: 3 };
    const nbrs = neighbors(oddCenter);
    // 2 non-adjacent filled neighbors
    const cellMap = buildCellMap([
      [oddCenter, CellGroundTruth.EMPTY],
      [nbrs[0], CellGroundTruth.FILLED],
      [nbrs[1], CellGroundTruth.EMPTY],
      [nbrs[2], CellGroundTruth.EMPTY],
      [nbrs[3], CellGroundTruth.FILLED],
      [nbrs[4], CellGroundTruth.EMPTY],
      [nbrs[5], CellGroundTruth.EMPTY],
    ]);
    expect(computeContiguity(oddCenter, cellMap)).toBe(ClueNotation.DISCONTIGUOUS);
  });
});

// --- Notation formatting tests ---

describe('formatNeighborClue', () => {
  it('formats PLAIN notation as bare number', () => {
    expect(formatNeighborClue(3, ClueNotation.PLAIN)).toBe('3');
  });

  it('formats PLAIN notation with 0', () => {
    expect(formatNeighborClue(0, ClueNotation.PLAIN)).toBe('0');
  });

  it('formats PLAIN notation with 6', () => {
    expect(formatNeighborClue(6, ClueNotation.PLAIN)).toBe('6');
  });

  it('formats CONTIGUOUS notation with curly braces', () => {
    expect(formatNeighborClue(3, ClueNotation.CONTIGUOUS)).toBe('{3}');
  });

  it('formats CONTIGUOUS notation with different values', () => {
    expect(formatNeighborClue(5, ClueNotation.CONTIGUOUS)).toBe('{5}');
  });

  it('formats DISCONTIGUOUS notation with dashes', () => {
    expect(formatNeighborClue(3, ClueNotation.DISCONTIGUOUS)).toBe('-3-');
  });

  it('formats DISCONTIGUOUS notation with different values', () => {
    expect(formatNeighborClue(4, ClueNotation.DISCONTIGUOUS)).toBe('-4-');
  });

  it('formats NO_CLUE as question mark regardless of value', () => {
    expect(formatNeighborClue(0, ClueNotation.NO_CLUE)).toBe('?');
  });

  it('formats NO_CLUE as question mark even with non-zero value', () => {
    expect(formatNeighborClue(5, ClueNotation.NO_CLUE)).toBe('?');
  });
});

// --- T040: Contiguity toggle tests ---

describe('formatNeighborClue with contiguityEnabled', () => {
  describe('when contiguityEnabled is true (default)', () => {
    it('formats CONTIGUOUS with curly braces', () => {
      expect(formatNeighborClue(3, ClueNotation.CONTIGUOUS, true)).toBe('{3}');
    });

    it('formats DISCONTIGUOUS with dashes', () => {
      expect(formatNeighborClue(4, ClueNotation.DISCONTIGUOUS, true)).toBe('-4-');
    });

    it('formats PLAIN as bare number', () => {
      expect(formatNeighborClue(2, ClueNotation.PLAIN, true)).toBe('2');
    });

    it('formats NO_CLUE as question mark', () => {
      expect(formatNeighborClue(5, ClueNotation.NO_CLUE, true)).toBe('?');
    });

    it('defaults contiguityEnabled to true when omitted', () => {
      expect(formatNeighborClue(3, ClueNotation.CONTIGUOUS)).toBe('{3}');
      expect(formatNeighborClue(4, ClueNotation.DISCONTIGUOUS)).toBe('-4-');
    });
  });

  describe('when contiguityEnabled is false', () => {
    it('formats CONTIGUOUS as plain number', () => {
      expect(formatNeighborClue(3, ClueNotation.CONTIGUOUS, false)).toBe('3');
    });

    it('formats DISCONTIGUOUS as plain number', () => {
      expect(formatNeighborClue(4, ClueNotation.DISCONTIGUOUS, false)).toBe('4');
    });

    it('formats PLAIN as bare number (unchanged)', () => {
      expect(formatNeighborClue(2, ClueNotation.PLAIN, false)).toBe('2');
    });

    it('formats NO_CLUE as question mark (always)', () => {
      expect(formatNeighborClue(5, ClueNotation.NO_CLUE, false)).toBe('?');
    });

    it('formats CONTIGUOUS with value 0 as plain number', () => {
      expect(formatNeighborClue(0, ClueNotation.CONTIGUOUS, false)).toBe('0');
    });

    it('formats DISCONTIGUOUS with value 6 as plain number', () => {
      expect(formatNeighborClue(6, ClueNotation.DISCONTIGUOUS, false)).toBe('6');
    });
  });
});
