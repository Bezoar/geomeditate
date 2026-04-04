import { describe, it, expect } from 'vitest';
import {
  neighborClueId,
  flowerClueId,
  lineClueId,
  GLOBAL_REMAINING_ID,
  parseClueId,
  deduceFromNeighborClue,
  deduceFromFlowerClue,
  deduceFromLineClue,
  deduceFromGlobalRemaining,
} from '../../src/solver/deductions';
import { createCell, CellGroundTruth, CellVisualState } from '../../src/model/hex-cell';
import type { HexCell } from '../../src/model/hex-cell';
import type { HexCoord } from '../../src/model/hex-coord';
import { coordKey } from '../../src/model/hex-coord';
import type { LineClue } from '../../src/clues/line';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeCell(coord: HexCoord, groundTruth: CellGroundTruth, visualState: CellVisualState): HexCell {
  return { ...createCell(coord, groundTruth), visualState };
}

function buildMap(cells: HexCell[]): Map<string, HexCell> {
  return new Map(cells.map((c) => [coordKey(c.coord), c]));
}

// ─── Clue ID helpers ──────────────────────────────────────────────────────────

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

// ─── deduceFromNeighborClue ───────────────────────────────────────────────────

describe('deduceFromNeighborClue', () => {
  /**
   * Layout: center at (2,2), OPEN_EMPTY with neighborClueValue=2.
   * We'll have 2 MARKED_FILLED neighbors and 2 COVERED neighbors.
   * clueValue (2) == markedFilled (2) → all covered are EMPTY.
   */
  it('deduces covered neighbors empty when clue value equals filled count', () => {
    // Even col=2, so offsets: [+1,-1],[+1,0],[0,+1],[-1,0],[-1,-1],[0,-1]
    // Neighbors of (2,2): (3,1),(3,2),(2,3),(1,2),(1,1),(2,1)
    const center: HexCoord = { col: 2, row: 2 };
    const n1: HexCoord = { col: 3, row: 1 }; // MARKED_FILLED
    const n2: HexCoord = { col: 3, row: 2 }; // MARKED_FILLED
    const n3: HexCoord = { col: 2, row: 3 }; // COVERED
    const n4: HexCoord = { col: 1, row: 2 }; // COVERED

    const cells = [
      makeCell(center, CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(n1, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(n2, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(n3, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(n4, CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);

    const result = deduceFromNeighborClue(center, 2, cellMap);
    expect(result).toHaveLength(2);
    const coords = result.map((d) => d.coord);
    expect(coords).toContainEqual(n3);
    expect(coords).toContainEqual(n4);
    result.forEach((d) => {
      expect(d.result).toBe('empty');
      expect(d.reason.clueIds).toContain(neighborClueId(center));
    });
  });

  /**
   * Layout: center at (2,2), OPEN_EMPTY with neighborClueValue=3.
   * 1 MARKED_FILLED neighbor, 2 COVERED neighbors.
   * (3 - 1) == 2 == covered count → all covered are FILLED.
   */
  it('deduces covered neighbors filled when remaining equals covered count', () => {
    const center: HexCoord = { col: 2, row: 2 };
    const n1: HexCoord = { col: 3, row: 1 }; // MARKED_FILLED
    const n2: HexCoord = { col: 3, row: 2 }; // COVERED
    const n3: HexCoord = { col: 2, row: 3 }; // COVERED

    const cells = [
      makeCell(center, CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(n1, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(n2, CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell(n3, CellGroundTruth.FILLED, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);

    const result = deduceFromNeighborClue(center, 3, cellMap);
    expect(result).toHaveLength(2);
    result.forEach((d) => {
      expect(d.result).toBe('filled');
      expect(d.reason.clueIds).toContain(neighborClueId(center));
    });
    const coords = result.map((d) => d.coord);
    expect(coords).toContainEqual(n2);
    expect(coords).toContainEqual(n3);
  });

  /**
   * Ambiguous: clue=2, 1 filled, 3 covered → can't determine.
   */
  it('returns [] when ambiguous', () => {
    const center: HexCoord = { col: 2, row: 2 };
    const n1: HexCoord = { col: 3, row: 1 }; // MARKED_FILLED
    const n2: HexCoord = { col: 3, row: 2 }; // COVERED
    const n3: HexCoord = { col: 2, row: 3 }; // COVERED
    const n4: HexCoord = { col: 1, row: 2 }; // COVERED

    const cells = [
      makeCell(center, CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(n1, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(n2, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(n3, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(n4, CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);

    const result = deduceFromNeighborClue(center, 2, cellMap);
    expect(result).toEqual([]);
  });

  /**
   * Boundary cell: at edge of grid, fewer than 6 neighbors in the map.
   * Corner cell at (0,0) — only 1 neighbor exists: (1,0) for even-col offsets [+1,-1]
   * Actually (0,0) is even col: neighbors are (1,-1),(1,0),(0,1),(-1,0),(-1,-1),(0,-1)
   * We put only (1,0) in map as COVERED, clueValue=0, so deduce empty.
   */
  it('handles boundary cells with fewer than 6 neighbors', () => {
    const center: HexCoord = { col: 0, row: 0 };
    const neighbor: HexCoord = { col: 1, row: 0 }; // COVERED (in map)

    const cells = [
      makeCell(center, CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(neighbor, CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);

    // clueValue=0, markedFilled=0 → 0==0 → all covered empty
    const result = deduceFromNeighborClue(center, 0, cellMap);
    expect(result).toHaveLength(1);
    expect(result[0].coord).toEqual(neighbor);
    expect(result[0].result).toBe('empty');
  });

  /**
   * Returns [] when center cell is COVERED (clue not visible).
   */
  it('returns [] when cell is still COVERED', () => {
    const center: HexCoord = { col: 2, row: 2 };
    const n1: HexCoord = { col: 3, row: 1 };

    const cells = [
      makeCell(center, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(n1, CellGroundTruth.FILLED, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);

    const result = deduceFromNeighborClue(center, 0, cellMap);
    expect(result).toEqual([]);
  });
});

// ─── deduceFromFlowerClue ─────────────────────────────────────────────────────

describe('deduceFromFlowerClue', () => {
  /**
   * Center at (2,2), MARKED_FILLED with flowerClueValue=1.
   * 1 MARKED_FILLED at radius-2, 2 COVERED at radius-2.
   * clueValue (1) == markedFilled (1) → all covered are EMPTY.
   */
  it('deduces covered radius-2 cells empty when clue equals filled count', () => {
    const center: HexCoord = { col: 2, row: 2 };
    // A radius-2 neighbor (distance-2 cell): step twice up-right from (2,2)
    // (2,2) → (3,1) → (4,1) for even cols ascending
    const r2_filled: HexCoord = { col: 4, row: 1 };  // MARKED_FILLED
    const r2_cov1: HexCoord = { col: 0, row: 2 };    // COVERED (distance-2: left twice)
    const r2_cov2: HexCoord = { col: 2, row: 4 };    // COVERED (distance-2: down twice)

    const cells = [
      makeCell(center, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(r2_filled, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(r2_cov1, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(r2_cov2, CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);

    const result = deduceFromFlowerClue(center, 1, cellMap);
    expect(result).toHaveLength(2);
    const coords = result.map((d) => d.coord);
    expect(coords).toContainEqual(r2_cov1);
    expect(coords).toContainEqual(r2_cov2);
    result.forEach((d) => {
      expect(d.result).toBe('empty');
      expect(d.reason.clueIds).toContain(flowerClueId(center));
    });
  });

  /**
   * Center at (2,2), MARKED_FILLED with flowerClueValue=3.
   * 1 MARKED_FILLED at radius-2, 2 COVERED at radius-2.
   * (3 - 1) == 2 == covered count → all covered are FILLED.
   */
  it('deduces covered radius-2 cells filled when remaining equals covered count', () => {
    const center: HexCoord = { col: 2, row: 2 };
    const r2_filled: HexCoord = { col: 4, row: 1 };
    const r2_cov1: HexCoord = { col: 0, row: 2 };
    const r2_cov2: HexCoord = { col: 2, row: 4 };

    const cells = [
      makeCell(center, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(r2_filled, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(r2_cov1, CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell(r2_cov2, CellGroundTruth.FILLED, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);

    const result = deduceFromFlowerClue(center, 3, cellMap);
    expect(result).toHaveLength(2);
    result.forEach((d) => {
      expect(d.result).toBe('filled');
      expect(d.reason.clueIds).toContain(flowerClueId(center));
    });
  });

  /**
   * Returns [] when center cell is not MARKED_FILLED (clue not visible).
   */
  it('returns [] when cell not MARKED_FILLED', () => {
    const center: HexCoord = { col: 2, row: 2 };
    const r2_cov: HexCoord = { col: 4, row: 1 };

    const cells = [
      makeCell(center, CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell(r2_cov, CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);

    const result = deduceFromFlowerClue(center, 0, cellMap);
    expect(result).toEqual([]);
  });

  /**
   * Ambiguous: clue=2, 1 filled, 3 covered.
   */
  it('returns [] when ambiguous', () => {
    const center: HexCoord = { col: 2, row: 2 };
    const r2_filled: HexCoord = { col: 4, row: 1 };
    const r2_cov1: HexCoord = { col: 0, row: 2 };
    const r2_cov2: HexCoord = { col: 2, row: 4 };
    const r2_cov3: HexCoord = { col: 4, row: 2 }; // another covered

    const cells = [
      makeCell(center, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(r2_filled, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(r2_cov1, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(r2_cov2, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(r2_cov3, CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);

    const result = deduceFromFlowerClue(center, 2, cellMap);
    expect(result).toEqual([]);
  });
});

// ─── deduceFromLineClue ───────────────────────────────────────────────────────

describe('deduceFromLineClue', () => {
  function makeLineClue(cells: HexCoord[], value: number): LineClue {
    return {
      axis: 'vertical',
      startCoord: cells[0],
      cells,
      labelPositions: [],
      value,
      notation: 'PLAIN' as any,
      contiguityEnabled: false,
    };
  }

  /**
   * Line with 3 cells: 2 MARKED_FILLED, 1 COVERED. clueValue=2 → covered is EMPTY.
   */
  it('deduces covered cells empty when line clue equals marked count', () => {
    const c1: HexCoord = { col: 0, row: 0 };
    const c2: HexCoord = { col: 0, row: 1 };
    const c3: HexCoord = { col: 0, row: 2 };

    const cells = [
      makeCell(c1, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(c2, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(c3, CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const lineClue = makeLineClue([c1, c2, c3], 2);

    const result = deduceFromLineClue(lineClue, cellMap);
    expect(result).toHaveLength(1);
    expect(result[0].coord).toEqual(c3);
    expect(result[0].result).toBe('empty');
    expect(result[0].reason.clueIds).toContain(lineClueId('vertical', c1));
  });

  /**
   * Line with 3 cells: 1 MARKED_FILLED, 2 COVERED. clueValue=3 → (3-1)==2==covered → all FILLED.
   */
  it('deduces covered cells filled when remaining equals covered count', () => {
    const c1: HexCoord = { col: 0, row: 0 };
    const c2: HexCoord = { col: 0, row: 1 };
    const c3: HexCoord = { col: 0, row: 2 };

    const cells = [
      makeCell(c1, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(c2, CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell(c3, CellGroundTruth.FILLED, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const lineClue = makeLineClue([c1, c2, c3], 3);

    const result = deduceFromLineClue(lineClue, cellMap);
    expect(result).toHaveLength(2);
    result.forEach((d) => {
      expect(d.result).toBe('filled');
      expect(d.reason.clueIds).toContain(lineClueId('vertical', c1));
    });
    const coords = result.map((d) => d.coord);
    expect(coords).toContainEqual(c2);
    expect(coords).toContainEqual(c3);
  });

  /**
   * Ambiguous: clue=2, 1 filled, 3 covered.
   */
  it('returns [] when ambiguous', () => {
    const c1: HexCoord = { col: 0, row: 0 };
    const c2: HexCoord = { col: 0, row: 1 };
    const c3: HexCoord = { col: 0, row: 2 };
    const c4: HexCoord = { col: 0, row: 3 };

    const cells = [
      makeCell(c1, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(c2, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(c3, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(c4, CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);
    const lineClue = makeLineClue([c1, c2, c3, c4], 2);

    const result = deduceFromLineClue(lineClue, cellMap);
    expect(result).toEqual([]);
  });
});

// ─── deduceFromGlobalRemaining ────────────────────────────────────────────────

describe('deduceFromGlobalRemaining', () => {
  /**
   * remaining=0 → all COVERED cells are EMPTY.
   */
  it('deduces all covered cells empty when remaining is 0', () => {
    const c1: HexCoord = { col: 0, row: 0 };
    const c2: HexCoord = { col: 0, row: 1 };
    const c3: HexCoord = { col: 0, row: 2 };

    const cells = [
      makeCell(c1, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
      makeCell(c2, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(c3, CellGroundTruth.EMPTY, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);

    const result = deduceFromGlobalRemaining(0, cellMap);
    expect(result).toHaveLength(2);
    const coords = result.map((d) => d.coord);
    expect(coords).toContainEqual(c2);
    expect(coords).toContainEqual(c3);
    result.forEach((d) => {
      expect(d.result).toBe('empty');
      expect(d.reason.clueIds).toContain(GLOBAL_REMAINING_ID);
    });
  });

  /**
   * remaining==covered count → all covered cells are FILLED.
   */
  it('deduces all covered cells filled when remaining equals covered count', () => {
    const c1: HexCoord = { col: 0, row: 0 };
    const c2: HexCoord = { col: 0, row: 1 };
    const c3: HexCoord = { col: 0, row: 2 };

    const cells = [
      makeCell(c1, CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(c2, CellGroundTruth.FILLED, CellVisualState.COVERED),
      makeCell(c3, CellGroundTruth.FILLED, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);

    const result = deduceFromGlobalRemaining(2, cellMap);
    expect(result).toHaveLength(2);
    result.forEach((d) => {
      expect(d.result).toBe('filled');
      expect(d.reason.clueIds).toContain(GLOBAL_REMAINING_ID);
    });
  });

  /**
   * Ambiguous: remaining=1, covered=3.
   */
  it('returns [] when ambiguous', () => {
    const c1: HexCoord = { col: 0, row: 0 };
    const c2: HexCoord = { col: 0, row: 1 };
    const c3: HexCoord = { col: 0, row: 2 };

    const cells = [
      makeCell(c1, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(c2, CellGroundTruth.EMPTY, CellVisualState.COVERED),
      makeCell(c3, CellGroundTruth.FILLED, CellVisualState.COVERED),
    ];
    const cellMap = buildMap(cells);

    const result = deduceFromGlobalRemaining(1, cellMap);
    expect(result).toEqual([]);
  });

  /**
   * No covered cells → nothing to deduce.
   */
  it('returns [] when no covered cells', () => {
    const c1: HexCoord = { col: 0, row: 0 };
    const c2: HexCoord = { col: 0, row: 1 };

    const cells = [
      makeCell(c1, CellGroundTruth.EMPTY, CellVisualState.OPEN_EMPTY),
      makeCell(c2, CellGroundTruth.FILLED, CellVisualState.MARKED_FILLED),
    ];
    const cellMap = buildMap(cells);

    const result = deduceFromGlobalRemaining(0, cellMap);
    expect(result).toEqual([]);
  });
});
