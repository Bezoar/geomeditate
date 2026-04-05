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

    it('spans gaps in the line (missing cells are skipped)', () => {
      // Gap at (2,2): line still includes cells on both sides
      const cellMap = buildCellMap([
        [2, 0, F],
        [2, 1, F],
        // (2,2) missing
        [2, 3, F],
      ]);
      const clue = computeLineClue({ col: 2, row: 0 }, 'vertical', cellMap);
      expect(clue.cells.map(coordKey)).toEqual(['2,0', '2,1', '2,3']);
      expect(clue.value).toBe(3);
    });
  });

  describe('left-facing lines', () => {
    it('counts filled cells along left-facing diagonal', () => {
      // From (0,1) left-facing: (0,1) -> (1,0) -> (2,0) -> (3,-1)
      // Even col (0,1) upper-right offset [+1,-1] -> (1,0)
      // Odd col (1,0) upper-right offset [+1,0] -> (2,0)
      // Even col (2,0) upper-right offset [+1,-1] -> (3,-1)
      const cellMap = buildCellMap([
        [0, 1, F],
        [1, 0, E],
        [2, 0, F],
        [3, -1, F],
      ]);
      const clue = computeLineClue({ col: 0, row: 1 }, 'left-facing', cellMap);
      expect(clue.axis).toBe('left-facing');
      expect(clue.startCoord).toEqual({ col: 0, row: 1 });
      expect(clue.cells.map(coordKey)).toEqual(['0,1', '1,0', '2,0', '3,-1']);
      expect(clue.value).toBe(3);
    });

    it('spans gaps in left-facing line', () => {
      // Missing (2,0): line still includes cells on both sides
      const cellMap = buildCellMap([
        [0, 1, F],
        [1, 0, F],
        // (2,0) missing
        [3, -1, F],
      ]);
      const clue = computeLineClue({ col: 0, row: 1 }, 'left-facing', cellMap);
      expect(clue.cells.map(coordKey)).toEqual(['0,1', '1,0', '3,-1']);
      expect(clue.value).toBe(3);
    });
  });

  describe('right-facing lines', () => {
    it('counts filled cells along right-facing diagonal', () => {
      // From (0,0) right-facing: (0,0) -> (1,0) -> (2,1) -> (3,1)
      // Even col (0,0) right offset [+1,0] -> (1,0)
      // Odd col (1,0) right offset [+1,+1] -> (2,1)
      // Even col (2,1) right offset [+1,0] -> (3,1)
      const cellMap = buildCellMap([
        [0, 0, F],
        [1, 0, E],
        [2, 1, F],
        [3, 1, E],
      ]);
      const clue = computeLineClue({ col: 0, row: 0 }, 'right-facing', cellMap);
      expect(clue.axis).toBe('right-facing');
      expect(clue.startCoord).toEqual({ col: 0, row: 0 });
      expect(clue.cells.map(coordKey)).toEqual(['0,0', '1,0', '2,1', '3,1']);
      expect(clue.value).toBe(2);
    });

    it('spans gaps in right-facing line', () => {
      // Missing (2,1): line still includes cells on both sides
      const cellMap = buildCellMap([
        [0, 0, F],
        [1, 0, F],
        // (2,1) missing
        [3, 1, F],
      ]);
      const clue = computeLineClue({ col: 0, row: 0 }, 'right-facing', cellMap);
      expect(clue.cells.map(coordKey)).toEqual(['0,0', '1,0', '3,1']);
      expect(clue.value).toBe(3);
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
      const clue = computeLineClue({ col: 5, row: 5 }, 'left-facing', cellMap);
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

  it('line clue defaults contiguityEnabled to true', () => {
    const cells = new Map<string, HexCell>();
    cells.set('0,0', createCell({ col: 0, row: 0 }, CellGroundTruth.FILLED));
    cells.set('0,1', createCell({ col: 0, row: 1 }, CellGroundTruth.EMPTY));
    const clue = computeLineClue({ col: 0, row: 0 }, 'vertical', cells);
    expect(clue.contiguityEnabled).toBe(true);
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

    it('spans gaps in a column (one line clue for the whole diagonal)', () => {
      // Col 0: rows 0, 1, then gap at 2, then row 3
      const cellMap = buildCellMap([
        [0, 0, F],
        [0, 1, F],
        // (0,2) missing
        [0, 3, F],
      ]);
      const clues = computeAllLineClues(cellMap);
      const verticals = clues.filter(c => c.axis === 'vertical');

      // Should find ONE vertical line starting at (0,0) spanning the gap
      const starts = verticals.map(c => coordKey(c.startCoord));
      expect(starts).toContain('0,0');
      expect(starts).not.toContain('0,3');

      const line = verticals.find(c => coordKey(c.startCoord) === '0,0')!;
      expect(line.cells).toHaveLength(3); // (0,0), (0,1), (0,3) — gap skipped
      expect(line.value).toBe(3); // all 3 are filled
    });
  });

  describe('left-facing diagonal lines', () => {
    it('finds left-facing lines starting from cells with no predecessor', () => {
      // Left-facing line: (0,1) -> (1,0) -> (2,0)
      // The predecessor of (0,1) along left-facing would be stepping backwards.
      // Reverse of left-facing from even col offset [+1,-1] applied to (0,1):
      //   predecessor would be at (-1,2) for even col, which is not in map.
      // So (0,1) is a start.
      const cellMap = buildCellMap([
        [0, 1, F],
        [1, 0, F],
        [2, 0, E],
      ]);
      const clues = computeAllLineClues(cellMap);
      const leftFacing = clues.filter(c => c.axis === 'left-facing');

      const startKeys = leftFacing.map(c => coordKey(c.startCoord));
      expect(startKeys).toContain('0,1');

      const line = leftFacing.find(c => coordKey(c.startCoord) === '0,1')!;
      expect(line.cells.map(coordKey)).toEqual(['0,1', '1,0', '2,0']);
      expect(line.value).toBe(2);
    });
  });

  describe('right-facing diagonal lines', () => {
    it('finds right-facing lines starting from cells with no predecessor', () => {
      // Right-facing line: (0,0) -> (1,0) -> (2,1)
      // Predecessor of (0,0) along right-facing would be outside the map.
      const cellMap = buildCellMap([
        [0, 0, F],
        [1, 0, E],
        [2, 1, F],
      ]);
      const clues = computeAllLineClues(cellMap);
      const rightFacing = clues.filter(c => c.axis === 'right-facing');

      const startKeys = rightFacing.map(c => coordKey(c.startCoord));
      expect(startKeys).toContain('0,0');

      const line = rightFacing.find(c => coordKey(c.startCoord) === '0,0')!;
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
      expect(axes).toContain('left-facing');
      expect(axes).toContain('right-facing');

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
