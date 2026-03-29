import { describe, it, expect } from 'vitest';
import { coordKey, type HexCoord } from '../src/model/hex-coord';
import { CellGroundTruth, createCell, type HexCell } from '../src/model/hex-cell';
import {
  computeLineClue,
  computeAllLineClues,
} from '../src/clues/line';

// --- helpers ---

/** Build a cellMap from an array of [col, row, groundTruth] tuples. */
function buildCellMap(
  entries: Array<[number, number, CellGroundTruth]>,
): Map<string, HexCell> {
  const map = new Map<string, HexCell>();
  for (const [col, row, gt] of entries) {
    const coord: HexCoord = { col, row };
    map.set(coordKey(coord), createCell(coord, gt));
  }
  return map;
}

const F = CellGroundTruth.FILLED;
const E = CellGroundTruth.EMPTY;

// --- T018: Line clue computation tests ---

describe('computeLineClue', () => {
  describe('vertical lines', () => {
    it('counts filled cells in a vertical line (same column)', () => {
      // Cells at (2,0), (2,1), (2,2) — two filled, one empty
      const cellMap = buildCellMap([
        [2, 0, F],
        [2, 1, E],
        [2, 2, F],
      ]);
      const clue = computeLineClue({ col: 2, row: 0 }, 'vertical', cellMap);
      expect(clue.axis).toBe('vertical');
      expect(clue.startCoord).toEqual({ col: 2, row: 0 });
      expect(clue.cells.map(coordKey)).toEqual(['2,0', '2,1', '2,2']);
      expect(clue.value).toBe(2);
    });

    it('returns value = length when all cells are FILLED', () => {
      const cellMap = buildCellMap([
        [2, 0, F],
        [2, 1, F],
        [2, 2, F],
      ]);
      const clue = computeLineClue({ col: 2, row: 0 }, 'vertical', cellMap);
      expect(clue.value).toBe(3);
    });

    it('returns value = 0 when all cells are EMPTY', () => {
      const cellMap = buildCellMap([
        [2, 0, E],
        [2, 1, E],
        [2, 2, E],
      ]);
      const clue = computeLineClue({ col: 2, row: 0 }, 'vertical', cellMap);
      expect(clue.value).toBe(0);
    });

    it('stops at a gap (missing cell breaks the line)', () => {
      // Gap at (2,2): line should only include (2,0) and (2,1)
      const cellMap = buildCellMap([
        [2, 0, F],
        [2, 1, F],
        // (2,2) missing
        [2, 3, F],
      ]);
      const clue = computeLineClue({ col: 2, row: 0 }, 'vertical', cellMap);
      expect(clue.cells.map(coordKey)).toEqual(['2,0', '2,1']);
      expect(clue.value).toBe(2);
    });
  });

  describe('ascending lines', () => {
    it('counts filled cells along ascending diagonal', () => {
      // From (0,1) ascending: (0,1) -> (1,0) -> (2,0) -> (3,-1)
      // Even col (0,1) upper-right offset [+1,-1] -> (1,0)
      // Odd col (1,0) upper-right offset [+1,0] -> (2,0)
      // Even col (2,0) upper-right offset [+1,-1] -> (3,-1)
      const cellMap = buildCellMap([
        [0, 1, F],
        [1, 0, E],
        [2, 0, F],
        [3, -1, F],
      ]);
      const clue = computeLineClue({ col: 0, row: 1 }, 'ascending', cellMap);
      expect(clue.axis).toBe('ascending');
      expect(clue.startCoord).toEqual({ col: 0, row: 1 });
      expect(clue.cells.map(coordKey)).toEqual(['0,1', '1,0', '2,0', '3,-1']);
      expect(clue.value).toBe(3);
    });

    it('stops at a gap in ascending line', () => {
      // Missing (2,0) breaks the line after (1,0)
      const cellMap = buildCellMap([
        [0, 1, F],
        [1, 0, F],
        // (2,0) missing
        [3, -1, F],
      ]);
      const clue = computeLineClue({ col: 0, row: 1 }, 'ascending', cellMap);
      expect(clue.cells.map(coordKey)).toEqual(['0,1', '1,0']);
      expect(clue.value).toBe(2);
    });
  });

  describe('descending lines', () => {
    it('counts filled cells along descending diagonal', () => {
      // From (0,0) descending: (0,0) -> (1,0) -> (2,1) -> (3,1)
      // Even col (0,0) right offset [+1,0] -> (1,0)
      // Odd col (1,0) right offset [+1,+1] -> (2,1)
      // Even col (2,1) right offset [+1,0] -> (3,1)
      const cellMap = buildCellMap([
        [0, 0, F],
        [1, 0, E],
        [2, 1, F],
        [3, 1, E],
      ]);
      const clue = computeLineClue({ col: 0, row: 0 }, 'descending', cellMap);
      expect(clue.axis).toBe('descending');
      expect(clue.startCoord).toEqual({ col: 0, row: 0 });
      expect(clue.cells.map(coordKey)).toEqual(['0,0', '1,0', '2,1', '3,1']);
      expect(clue.value).toBe(2);
    });

    it('stops at a gap in descending line', () => {
      // Missing (2,1) breaks the line after (1,0)
      const cellMap = buildCellMap([
        [0, 0, F],
        [1, 0, F],
        // (2,1) missing
        [3, 1, F],
      ]);
      const clue = computeLineClue({ col: 0, row: 0 }, 'descending', cellMap);
      expect(clue.cells.map(coordKey)).toEqual(['0,0', '1,0']);
      expect(clue.value).toBe(2);
    });
  });

  describe('mixed ground truth', () => {
    it('counts only FILLED cells in a mixed vertical line', () => {
      const cellMap = buildCellMap([
        [0, 0, F],
        [0, 1, E],
        [0, 2, F],
        [0, 3, E],
        [0, 4, F],
      ]);
      const clue = computeLineClue({ col: 0, row: 0 }, 'vertical', cellMap);
      expect(clue.cells).toHaveLength(5);
      expect(clue.value).toBe(3);
    });
  });

  describe('single-cell line', () => {
    it('returns a single-cell line for an isolated FILLED cell', () => {
      const cellMap = buildCellMap([[5, 5, F]]);
      const clue = computeLineClue({ col: 5, row: 5 }, 'vertical', cellMap);
      expect(clue.cells.map(coordKey)).toEqual(['5,5']);
      expect(clue.value).toBe(1);
    });

    it('returns a single-cell line for an isolated EMPTY cell', () => {
      const cellMap = buildCellMap([[5, 5, E]]);
      const clue = computeLineClue({ col: 5, row: 5 }, 'ascending', cellMap);
      expect(clue.cells.map(coordKey)).toEqual(['5,5']);
      expect(clue.value).toBe(0);
    });
  });

  it('returns a clue with correct interface fields', () => {
    const cellMap = buildCellMap([[1, 1, F]]);
    const clue = computeLineClue({ col: 1, row: 1 }, 'vertical', cellMap);
    expect(clue).toHaveProperty('axis');
    expect(clue).toHaveProperty('startCoord');
    expect(clue).toHaveProperty('cells');
    expect(clue).toHaveProperty('value');
  });
});

describe('computeAllLineClues', () => {
  describe('vertical lines', () => {
    it('finds vertical lines starting from the topmost cell in each column', () => {
      // Two columns: col 0 has rows 0-2, col 1 has rows 1-3
      const cellMap = buildCellMap([
        [0, 0, F],
        [0, 1, E],
        [0, 2, F],
        [1, 1, F],
        [1, 2, F],
        [1, 3, E],
      ]);
      const clues = computeAllLineClues(cellMap);
      const verticals = clues.filter(c => c.axis === 'vertical');

      // Should find two vertical lines: one starting at (0,0) and one at (1,1)
      const starts = verticals.map(c => coordKey(c.startCoord)).sort();
      expect(starts).toContain('0,0');
      expect(starts).toContain('1,1');

      const col0Line = verticals.find(c => coordKey(c.startCoord) === '0,0')!;
      expect(col0Line.cells).toHaveLength(3);
      expect(col0Line.value).toBe(2);

      const col1Line = verticals.find(c => coordKey(c.startCoord) === '1,1')!;
      expect(col1Line.cells).toHaveLength(3);
      expect(col1Line.value).toBe(2);
    });

    it('creates separate vertical lines when a column has a gap', () => {
      // Col 0: rows 0, 1, then gap at 2, then row 3
      const cellMap = buildCellMap([
        [0, 0, F],
        [0, 1, F],
        // (0,2) missing
        [0, 3, F],
      ]);
      const clues = computeAllLineClues(cellMap);
      const verticals = clues.filter(c => c.axis === 'vertical');

      // Should find two vertical starts: (0,0) and (0,3)
      // (0,3) has no predecessor at (0,2) so it's a start
      const starts = verticals.map(c => coordKey(c.startCoord)).sort();
      expect(starts).toContain('0,0');
      expect(starts).toContain('0,3');
    });
  });

  describe('ascending diagonal lines', () => {
    it('finds ascending lines starting from cells with no predecessor', () => {
      // Ascending line: (0,1) -> (1,0) -> (2,0)
      // The predecessor of (0,1) along ascending would be stepping backwards.
      // Reverse of ascending from even col offset [+1,-1] applied to (0,1):
      //   predecessor would be at (-1,2) for even col, which is not in map.
      // So (0,1) is a start.
      const cellMap = buildCellMap([
        [0, 1, F],
        [1, 0, F],
        [2, 0, E],
      ]);
      const clues = computeAllLineClues(cellMap);
      const ascending = clues.filter(c => c.axis === 'ascending');

      const startKeys = ascending.map(c => coordKey(c.startCoord));
      expect(startKeys).toContain('0,1');

      const line = ascending.find(c => coordKey(c.startCoord) === '0,1')!;
      expect(line.cells.map(coordKey)).toEqual(['0,1', '1,0', '2,0']);
      expect(line.value).toBe(2);
    });
  });

  describe('descending diagonal lines', () => {
    it('finds descending lines starting from cells with no predecessor', () => {
      // Descending line: (0,0) -> (1,0) -> (2,1)
      // Predecessor of (0,0) along descending would be outside the map.
      const cellMap = buildCellMap([
        [0, 0, F],
        [1, 0, E],
        [2, 1, F],
      ]);
      const clues = computeAllLineClues(cellMap);
      const descending = clues.filter(c => c.axis === 'descending');

      const startKeys = descending.map(c => coordKey(c.startCoord));
      expect(startKeys).toContain('0,0');

      const line = descending.find(c => coordKey(c.startCoord) === '0,0')!;
      expect(line.cells.map(coordKey)).toEqual(['0,0', '1,0', '2,1']);
      expect(line.value).toBe(2);
    });
  });

  describe('start cell identification', () => {
    it('a cell whose predecessor along an axis is NOT in cellMap is a start', () => {
      // For vertical, predecessor is (col, row-1)
      // Cell (3,5) with no cell at (3,4) should be a vertical start
      const cellMap = buildCellMap([
        [3, 5, F],
        [3, 6, E],
      ]);
      const clues = computeAllLineClues(cellMap);
      const verticals = clues.filter(c => c.axis === 'vertical');
      const starts = verticals.map(c => coordKey(c.startCoord));
      expect(starts).toContain('3,5');
    });

    it('a mid-line cell is NOT a start', () => {
      // Cell (2,1) has predecessor (2,0) in the map, so (2,1) is not a vertical start
      const cellMap = buildCellMap([
        [2, 0, F],
        [2, 1, F],
        [2, 2, F],
      ]);
      const clues = computeAllLineClues(cellMap);
      const verticals = clues.filter(c => c.axis === 'vertical');
      const starts = verticals.map(c => coordKey(c.startCoord));
      expect(starts).toContain('2,0');
      expect(starts).not.toContain('2,1');
      expect(starts).not.toContain('2,2');
    });
  });

  describe('single-cell lines', () => {
    it('produces a LineClue for an isolated FILLED cell across all 3 axes', () => {
      const cellMap = buildCellMap([[5, 5, F]]);
      const clues = computeAllLineClues(cellMap);

      // An isolated cell is a start for all 3 axes
      const axes = clues.map(c => c.axis).sort();
      expect(axes).toContain('vertical');
      expect(axes).toContain('ascending');
      expect(axes).toContain('descending');

      for (const clue of clues) {
        expect(clue.cells).toHaveLength(1);
        expect(coordKey(clue.startCoord)).toBe('5,5');
        expect(clue.value).toBe(1);
      }
    });

    it('produces a LineClue with value 0 for an isolated EMPTY cell', () => {
      const cellMap = buildCellMap([[5, 5, E]]);
      const clues = computeAllLineClues(cellMap);

      for (const clue of clues) {
        expect(clue.cells).toHaveLength(1);
        expect(clue.value).toBe(0);
      }
    });
  });

  describe('complex grid', () => {
    it('finds all line clues across a multi-cell grid', () => {
      // Build a small grid:
      //   (0,0) (1,0) (2,0)
      //   (0,1) (1,1) (2,1)
      const cellMap = buildCellMap([
        [0, 0, F],
        [1, 0, E],
        [2, 0, F],
        [0, 1, E],
        [1, 1, F],
        [2, 1, E],
      ]);
      const clues = computeAllLineClues(cellMap);

      // Should have clues for all 3 axes
      const axes = new Set(clues.map(c => c.axis));
      expect(axes.size).toBe(3);

      // Every clue must have at least 1 cell
      for (const clue of clues) {
        expect(clue.cells.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('does not produce duplicate line clues', () => {
      const cellMap = buildCellMap([
        [0, 0, F],
        [0, 1, F],
        [0, 2, F],
        [1, 0, E],
        [1, 1, E],
      ]);
      const clues = computeAllLineClues(cellMap);

      // Each clue should have a unique (axis, startCoord) pair
      const keys = clues.map(c => `${c.axis}:${coordKey(c.startCoord)}`);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  it('returns an empty array for an empty cellMap', () => {
    const cellMap = new Map<string, HexCell>();
    const clues = computeAllLineClues(cellMap);
    expect(clues).toEqual([]);
  });
});
