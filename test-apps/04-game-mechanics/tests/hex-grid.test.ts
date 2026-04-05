import { describe, it, expect } from 'vitest';
import {
  coordKey,
} from '../src/model/hex-coord';
import type { HexCoord } from '../src/model/hex-coord';
import {
  CellGroundTruth,
  CellVisualState,
  ClueNotation,
} from '../src/model/hex-cell';
import { HexGrid } from '../src/model/hex-grid';
import type { TestGridConfig, LineClue } from '../src/model/hex-grid';

// --- T019: HexGrid construction from TestGridConfig ---

describe('HexGrid construction', () => {
  const smallConfig: TestGridConfig = {
    name: 'small-test',
    description: 'A small 3x2 grid for testing',
    width: 3,
    height: 2,
    filledCoords: [{ col: 0, row: 0 }, { col: 1, row: 1 }],
    missingCoords: [{ col: 2, row: 1 }],
  };

  it('stores width and height from config', () => {
    const grid = new HexGrid(smallConfig);
    expect(grid.width).toBe(3);
    expect(grid.height).toBe(2);
  });

  it('creates cells for all positions in width×height except missingCoords', () => {
    const grid = new HexGrid(smallConfig);
    // 3×2 = 6 positions minus 1 missing = 5 cells
    expect(grid.cells.size).toBe(5);
  });

  it('includes expected positions in the cells map', () => {
    const grid = new HexGrid(smallConfig);
    expect(grid.cells.has('0,0')).toBe(true);
    expect(grid.cells.has('1,0')).toBe(true);
    expect(grid.cells.has('2,0')).toBe(true);
    expect(grid.cells.has('0,1')).toBe(true);
    expect(grid.cells.has('1,1')).toBe(true);
  });

  it('excludes missing positions from the cells map', () => {
    const grid = new HexGrid(smallConfig);
    expect(grid.cells.has('2,1')).toBe(false);
  });

  it('sets filled coords to CellGroundTruth.FILLED', () => {
    const grid = new HexGrid(smallConfig);
    expect(grid.cells.get('0,0')!.groundTruth).toBe(CellGroundTruth.FILLED);
    expect(grid.cells.get('1,1')!.groundTruth).toBe(CellGroundTruth.FILLED);
  });

  it('sets non-filled coords to CellGroundTruth.EMPTY', () => {
    const grid = new HexGrid(smallConfig);
    expect(grid.cells.get('1,0')!.groundTruth).toBe(CellGroundTruth.EMPTY);
    expect(grid.cells.get('2,0')!.groundTruth).toBe(CellGroundTruth.EMPTY);
    expect(grid.cells.get('0,1')!.groundTruth).toBe(CellGroundTruth.EMPTY);
  });

  it('starts cells in revealed state: EMPTY cells are OPEN_EMPTY', () => {
    const grid = new HexGrid(smallConfig);
    expect(grid.cells.get('1,0')!.visualState).toBe(CellVisualState.OPEN_EMPTY);
    expect(grid.cells.get('2,0')!.visualState).toBe(CellVisualState.OPEN_EMPTY);
    expect(grid.cells.get('0,1')!.visualState).toBe(CellVisualState.OPEN_EMPTY);
  });

  it('starts cells in revealed state: FILLED cells are MARKED_FILLED', () => {
    const grid = new HexGrid(smallConfig);
    expect(grid.cells.get('0,0')!.visualState).toBe(CellVisualState.MARKED_FILLED);
    expect(grid.cells.get('1,1')!.visualState).toBe(CellVisualState.MARKED_FILLED);
  });

  it('starts remainingCount at 0 (all cells revealed)', () => {
    const grid = new HexGrid(smallConfig);
    expect(grid.remainingCount).toBe(0);
  });

  it('starts mistakeCount at 0', () => {
    const grid = new HexGrid(smallConfig);
    expect(grid.mistakeCount).toBe(0);
  });

  it('uses coordKey format "col,row" as map keys', () => {
    const grid = new HexGrid(smallConfig);
    const keys = Array.from(grid.cells.keys());
    for (const key of keys) {
      expect(key).toMatch(/^-?\d+,-?\d+$/);
    }
  });

  it('stores correct coord on each cell', () => {
    const grid = new HexGrid(smallConfig);
    for (const [key, cell] of grid.cells) {
      expect(coordKey(cell.coord)).toBe(key);
    }
  });

  it('handles config with no filled coords (all EMPTY)', () => {
    const allEmptyConfig: TestGridConfig = {
      name: 'all-empty',
      description: 'All cells empty',
      width: 2,
      height: 2,
      filledCoords: [],
      missingCoords: [],
    };
    const grid = new HexGrid(allEmptyConfig);
    expect(grid.cells.size).toBe(4);
    for (const cell of grid.cells.values()) {
      expect(cell.groundTruth).toBe(CellGroundTruth.EMPTY);
      expect(cell.visualState).toBe(CellVisualState.OPEN_EMPTY);
    }
    expect(grid.remainingCount).toBe(0);
  });

  it('handles config with no missing coords', () => {
    const noMissingConfig: TestGridConfig = {
      name: 'no-missing',
      description: 'No missing cells',
      width: 2,
      height: 2,
      filledCoords: [{ col: 0, row: 0 }],
      missingCoords: [],
    };
    const grid = new HexGrid(noMissingConfig);
    // 2×2 = 4, none missing
    expect(grid.cells.size).toBe(4);
  });

  it('handles config with all positions missing', () => {
    const allMissingConfig: TestGridConfig = {
      name: 'all-missing',
      description: 'All positions missing',
      width: 2,
      height: 1,
      filledCoords: [],
      missingCoords: [{ col: 0, row: 0 }, { col: 1, row: 0 }],
    };
    const grid = new HexGrid(allMissingConfig);
    expect(grid.cells.size).toBe(0);
  });
});

// --- T020: HexGrid.computeAllClues() ---

describe('HexGrid.computeAllClues()', () => {
  // 3×3 grid, no missing, known layout for hand-calculated clues
  // Filled: (0,0), (1,0), (2,2)
  // Empty:  (0,1), (0,2), (1,1), (1,2), (2,0), (2,1)
  const clueConfig: TestGridConfig = {
    name: 'clue-test',
    description: '3x3 grid for clue calculation',
    width: 3,
    height: 3,
    filledCoords: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 2 },
    ],
    missingCoords: [],
  };

  it('sets neighborClueValue for EMPTY cells', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    // Cell (1,1) is EMPTY (OPEN_EMPTY)
    // Odd col (1,1) neighbors: (2,1), (2,2), (1,2), (0,2), (0,1), (1,0)
    // In grid: (2,1)=EMPTY, (2,2)=FILLED, (1,2)=EMPTY, (0,2)=EMPTY, (0,1)=EMPTY, (1,0)=FILLED
    // neighborClueValue = 2
    const cell11 = grid.cells.get('1,1')!;
    expect(cell11.neighborClueValue).toBe(2);
  });

  it('sets neighborClueValue to 0 for EMPTY cells with no FILLED neighbors', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    // Cell (0,2) is EMPTY
    // Even col (0,2) neighbors: (1,1), (1,2), (0,3), (-1,2), (-1,1), (0,1)
    // In grid: (1,1)=EMPTY, (1,2)=EMPTY, (0,3)=not in grid, (-1,2)=not in grid, (-1,1)=not in grid, (0,1)=EMPTY
    // Only in-grid neighbors matter, and all are EMPTY
    // neighborClueValue = 0
    const cell02 = grid.cells.get('0,2')!;
    expect(cell02.neighborClueValue).toBe(0);
  });

  it('sets neighborClueValue correctly for cell with one FILLED neighbor', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    // Cell (2,1) is EMPTY
    // Even col (2,1) neighbors: (3,0), (3,1), (2,2), (1,1), (1,0), (2,0)
    // In grid: (3,0)=not in grid, (3,1)=not in grid, (2,2)=FILLED, (1,1)=EMPTY, (1,0)=FILLED, (2,0)=EMPTY
    // neighborClueValue = 2
    const cell21 = grid.cells.get('2,1')!;
    expect(cell21.neighborClueValue).toBe(2);
  });

  it('sets neighborClueValue correctly for cell (2,0)', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    // Cell (2,0) is EMPTY
    // Even col (2,0) neighbors: (3,-1), (3,0), (2,1), (1,0), (1,-1), (2,-1)
    // In grid: only (2,1)=EMPTY, (1,0)=FILLED
    // neighborClueValue = 1
    const cell20 = grid.cells.get('2,0')!;
    expect(cell20.neighborClueValue).toBe(1);
  });

  it('sets neighborClueValue correctly for cell (0,1)', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    // Cell (0,1) is EMPTY
    // Even col (0,1) neighbors: (1,0), (1,1), (0,2), (-1,1), (-1,0), (0,0)
    // In grid: (1,0)=FILLED, (1,1)=EMPTY, (0,2)=EMPTY, (0,0)=FILLED
    // (-1,1) and (-1,0) are not in grid
    // neighborClueValue = 2
    const cell01 = grid.cells.get('0,1')!;
    expect(cell01.neighborClueValue).toBe(2);
  });

  it('sets neighborClueNotation for EMPTY cells', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    // Cell (1,1) has 2 FILLED neighbors: (2,2) and (1,0)
    // Neighbor order: (2,1), (2,2), (1,2), (0,2), (0,1), (1,0)
    // Filled pattern: [false, true, false, false, false, true]
    // The filled neighbors are at indices 1 and 5 — they are adjacent
    // (circular: index 5 is next to index 0, index 1 is next to index 0;
    //  so 5 and 1 have gap of 1 at index 0 — they are NOT adjacent)
    // Actually in circular sequence: 1, then gap at 2,3,4, then 5
    // Forward: 1→5 is distance 4; backward: 5→1 (wrapping through 0) is distance 2
    // So they are DISCONTIGUOUS (not adjacent)
    const cell11 = grid.cells.get('1,1')!;
    expect(cell11.neighborClueNotation).not.toBeNull();
    expect([ClueNotation.PLAIN, ClueNotation.CONTIGUOUS, ClueNotation.DISCONTIGUOUS])
      .toContain(cell11.neighborClueNotation);
  });

  it('does not set neighborClueValue on FILLED cells', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    // Filled cells (MARKED_FILLED) should not have neighborClueValue
    const cell00 = grid.cells.get('0,0')!;
    expect(cell00.neighborClueValue).toBeNull();
  });

  it('sets flowerClueValue for FILLED cells', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    // Cell (0,0) is FILLED. flowerClueValue = count of FILLED cells in 2-hex radius
    // radius2Positions for (0,0): all positions within distance 2
    // Of those, which are in the grid AND FILLED?
    // (1,0) is FILLED and is a direct neighbor of (0,0) → in radius 2
    // (2,2) is FILLED — distance from (0,0): need to check
    // For even col (0,0), neighbors are: (1,-1),(1,0),(0,1),(-1,0),(-1,-1),(0,-1)
    // Dist-2 includes neighbors-of-neighbors.
    // (2,2) is likely NOT within 2-hex radius of (0,0) for this layout
    // So flowerClueValue for (0,0) should be 1 (just (1,0))
    const cell00 = grid.cells.get('0,0')!;
    expect(cell00.flowerClueValue).toBe(1);
  });

  it('sets flowerClueValue for cell (1,0)', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    // Cell (1,0) is FILLED. flowerClueValue = count of FILLED in 2-hex radius (excluding self)
    // (0,0) is FILLED and is a neighbor of (1,0) → in radius 2
    // (2,2) — need to check if within 2 of (1,0)
    // Odd col (1,0) neighbors: (2,0),(2,1),(1,1),(0,1),(0,0),(1,-1)
    // Distance-2 from (1,0): includes neighbors-of-neighbors
    // (2,1) neighbors (even col): (3,0),(3,1),(2,2),(1,1),(1,0),(2,0)
    // So (2,2) is a neighbor of (2,1) which is a neighbor of (1,0) → distance 2
    // So flowerClueValue for (1,0) should be 2 (both (0,0) and (2,2))
    const cell10 = grid.cells.get('1,0')!;
    expect(cell10.flowerClueValue).toBe(2);
  });

  it('does not set flowerClueValue on EMPTY cells', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    const cell11 = grid.cells.get('1,1')!;
    expect(cell11.flowerClueValue).toBeNull();
  });

  it('populates lineClues array', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    expect(Array.isArray(grid.lineClues)).toBe(true);
    expect(grid.lineClues.length).toBeGreaterThan(0);
  });

  it('lineClues cover all three axes', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    const axes = new Set(grid.lineClues.map((lc: LineClue) => lc.axis));
    expect(axes.has('vertical')).toBe(true);
    expect(axes.has('left-facing')).toBe(true);
    expect(axes.has('right-facing')).toBe(true);
  });

  it('vertical line clues count FILLED cells correctly', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    // Vertical lines run down each column
    // Col 0: (0,0)=FILLED, (0,1)=EMPTY, (0,2)=EMPTY → value=1
    // Col 1: (1,0)=FILLED, (1,1)=EMPTY, (1,2)=EMPTY → value=1
    // Col 2: (2,0)=EMPTY, (2,1)=EMPTY, (2,2)=FILLED → value=1
    const verticalClues = grid.lineClues.filter(
      (lc: LineClue) => lc.axis === 'vertical',
    );
    for (const lc of verticalClues) {
      // All vertical lines in this grid have exactly 1 filled cell
      expect(lc.value).toBe(1);
    }
  });

  it('line clue cells array contains coords along the line', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    for (const lc of grid.lineClues) {
      expect(lc.cells.length).toBeGreaterThan(0);
      // Each cell in the line should exist in the grid
      for (const c of lc.cells) {
        expect(grid.cells.has(coordKey(c))).toBe(true);
      }
    }
  });

  it('line clue value equals actual FILLED count along the line', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    for (const lc of grid.lineClues) {
      const actualFilled = lc.cells.filter(
        (c: HexCoord) => grid.cells.get(coordKey(c))!.groundTruth === CellGroundTruth.FILLED,
      ).length;
      expect(lc.value).toBe(actualFilled);
    }
  });

  it('line clue startCoord is the first cell in the line', () => {
    const grid = new HexGrid(clueConfig);
    grid.computeAllClues();

    for (const lc of grid.lineClues) {
      expect(coordKey(lc.startCoord)).toBe(coordKey(lc.cells[0]));
    }
  });
});

describe('HexGrid.computeAllClues() — all-empty grid', () => {
  const allEmptyConfig: TestGridConfig = {
    name: 'all-empty-clue',
    description: 'All cells empty for clue testing',
    width: 3,
    height: 3,
    filledCoords: [],
    missingCoords: [],
  };

  it('all neighbor clues are 0 when no cells are FILLED', () => {
    const grid = new HexGrid(allEmptyConfig);
    grid.computeAllClues();

    for (const cell of grid.cells.values()) {
      // All cells are EMPTY (OPEN_EMPTY), so they all get neighborClueValue
      expect(cell.neighborClueValue).toBe(0);
    }
  });

  it('no flower clues are set when no cells are FILLED', () => {
    const grid = new HexGrid(allEmptyConfig);
    grid.computeAllClues();

    for (const cell of grid.cells.values()) {
      // No FILLED cells means no flowerClueValue assignments
      expect(cell.flowerClueValue).toBeNull();
    }
  });

  it('all line clue values are 0 when no cells are FILLED', () => {
    const grid = new HexGrid(allEmptyConfig);
    grid.computeAllClues();

    for (const lc of grid.lineClues) {
      expect(lc.value).toBe(0);
    }
  });

  it('neighborClueNotation is set for all EMPTY cells', () => {
    const grid = new HexGrid(allEmptyConfig);
    grid.computeAllClues();

    for (const cell of grid.cells.values()) {
      expect(cell.neighborClueNotation).not.toBeNull();
    }
  });
});

describe('HexGrid.computeAllClues() — contiguity notation', () => {
  // Grid designed so we can verify contiguity behavior
  // 3×1 grid: (0,0)=FILLED, (1,0)=EMPTY, (2,0)=FILLED
  const contiguityConfig: TestGridConfig = {
    name: 'contiguity-test',
    description: 'Grid for testing neighbor clue contiguity',
    width: 3,
    height: 1,
    filledCoords: [{ col: 0, row: 0 }, { col: 2, row: 0 }],
    missingCoords: [],
  };

  it('sets neighborClueNotation to a valid ClueNotation value', () => {
    const grid = new HexGrid(contiguityConfig);
    grid.computeAllClues();

    const cell10 = grid.cells.get('1,0')!;
    expect(cell10.neighborClueNotation).not.toBeNull();
    expect([
      ClueNotation.PLAIN,
      ClueNotation.CONTIGUOUS,
      ClueNotation.DISCONTIGUOUS,
      ClueNotation.NO_CLUE,
    ]).toContain(cell10.neighborClueNotation);
  });

  it('EMPTY cell with 0 FILLED neighbors gets appropriate notation', () => {
    // Single-cell grid where the cell has no filled neighbors
    const isolatedConfig: TestGridConfig = {
      name: 'isolated',
      description: 'Isolated empty cell',
      width: 1,
      height: 1,
      filledCoords: [],
      missingCoords: [],
    };
    const grid = new HexGrid(isolatedConfig);
    grid.computeAllClues();

    const cell = grid.cells.get('0,0')!;
    expect(cell.neighborClueValue).toBe(0);
    expect(cell.neighborClueNotation).not.toBeNull();
  });
});

// --- Phase 4: Interaction tests ---

// Shared config for interaction tests
// 3×2 grid, filled: (0,0) and (1,1), missing: (2,1)
// Cells: (0,0)=FILLED, (1,0)=EMPTY, (2,0)=EMPTY, (0,1)=EMPTY, (1,1)=FILLED
const interactionConfig: TestGridConfig = {
  name: 'interaction-test',
  description: 'Grid for interaction testing',
  width: 3,
  height: 2,
  filledCoords: [{ col: 0, row: 0 }, { col: 1, row: 1 }],
  missingCoords: [{ col: 2, row: 1 }],
};

function coveredGrid(): HexGrid {
  const grid = new HexGrid(interactionConfig);
  grid.computeAllClues();
  grid.coverAll();
  return grid;
}

// --- T030: openCell() ---

describe('HexGrid.openCell()', () => {
  it('opens a covered EMPTY cell to OPEN_EMPTY', () => {
    const grid = coveredGrid();
    grid.openCell({ col: 1, row: 0 });
    expect(grid.cells.get('1,0')!.visualState).toBe(CellVisualState.OPEN_EMPTY);
  });

  it('keeps a covered FILLED cell COVERED on mistake', () => {
    const grid = coveredGrid();
    grid.openCell({ col: 0, row: 0 });
    expect(grid.cells.get('0,0')!.visualState).toBe(CellVisualState.COVERED);
  });

  it('is a no-op on an already OPEN_EMPTY cell', () => {
    const grid = coveredGrid();
    grid.openCell({ col: 1, row: 0 }); // opens it
    grid.openCell({ col: 1, row: 0 }); // no-op
    expect(grid.cells.get('1,0')!.visualState).toBe(CellVisualState.OPEN_EMPTY);
    expect(grid.mistakeCount).toBe(0);
  });

  it('is a no-op on a MARKED_FILLED cell', () => {
    const grid = coveredGrid();
    grid.markCell({ col: 1, row: 1 }); // mark it
    const mistakesBefore = grid.mistakeCount;
    grid.openCell({ col: 1, row: 1 }); // no-op
    expect(grid.cells.get('1,1')!.visualState).toBe(CellVisualState.MARKED_FILLED);
    expect(grid.mistakeCount).toBe(mistakesBefore);
  });

  it('does not change remainingCount when opening a FILLED cell (mistake)', () => {
    const grid = coveredGrid();
    const before = grid.remainingCount;
    grid.openCell({ col: 0, row: 0 }); // FILLED cell — mistake, stays covered
    expect(grid.remainingCount).toBe(before);
  });

  it('does not change remainingCount when opening an EMPTY cell', () => {
    const grid = coveredGrid();
    const before = grid.remainingCount;
    grid.openCell({ col: 1, row: 0 }); // EMPTY cell
    expect(grid.remainingCount).toBe(before);
  });
});

// --- T031: markCell() ---

describe('HexGrid.markCell()', () => {
  it('marks a covered FILLED cell as MARKED_FILLED', () => {
    const grid = coveredGrid();
    grid.markCell({ col: 1, row: 1 });
    expect(grid.cells.get('1,1')!.visualState).toBe(CellVisualState.MARKED_FILLED);
  });

  it('keeps a covered EMPTY cell COVERED on mistake', () => {
    const grid = coveredGrid();
    grid.markCell({ col: 1, row: 0 });
    expect(grid.cells.get('1,0')!.visualState).toBe(CellVisualState.COVERED);
  });

  it('is a no-op on an already OPEN_EMPTY cell', () => {
    const grid = coveredGrid();
    grid.openCell({ col: 1, row: 0 }); // open it
    grid.markCell({ col: 1, row: 0 }); // no-op
    expect(grid.cells.get('1,0')!.visualState).toBe(CellVisualState.OPEN_EMPTY);
  });

  it('is a no-op on an already MARKED_FILLED cell', () => {
    const grid = coveredGrid();
    grid.markCell({ col: 1, row: 1 }); // mark it
    const mistakesBefore = grid.mistakeCount;
    grid.markCell({ col: 1, row: 1 }); // no-op
    expect(grid.cells.get('1,1')!.visualState).toBe(CellVisualState.MARKED_FILLED);
    expect(grid.mistakeCount).toBe(mistakesBefore);
  });

  it('decrements remainingCount when marking a FILLED cell', () => {
    const grid = coveredGrid();
    const before = grid.remainingCount;
    grid.markCell({ col: 1, row: 1 }); // FILLED cell
    expect(grid.remainingCount).toBe(before - 1);
  });

  it('does not change remainingCount when marking an EMPTY cell (mistake)', () => {
    const grid = coveredGrid();
    const before = grid.remainingCount;
    grid.markCell({ col: 1, row: 0 }); // EMPTY cell — mistake
    expect(grid.remainingCount).toBe(before);
  });
});

// --- T032: toggleGroundTruth() ---

describe('HexGrid.toggleGroundTruth()', () => {
  it('toggles a FILLED cell to EMPTY', () => {
    const grid = new HexGrid(interactionConfig);
    grid.computeAllClues();
    grid.toggleGroundTruth({ col: 0, row: 0 });
    expect(grid.cells.get('0,0')!.groundTruth).toBe(CellGroundTruth.EMPTY);
  });

  it('toggles an EMPTY cell to FILLED', () => {
    const grid = new HexGrid(interactionConfig);
    grid.computeAllClues();
    grid.toggleGroundTruth({ col: 1, row: 0 });
    expect(grid.cells.get('1,0')!.groundTruth).toBe(CellGroundTruth.FILLED);
  });

  it('recomputes neighbor clues for affected cells', () => {
    const grid = new HexGrid(interactionConfig);
    grid.computeAllClues();

    // (0,1) is EMPTY, its neighbor (0,0) is FILLED
    const clueBefore = grid.cells.get('0,1')!.neighborClueValue!;

    // Toggle (0,0) from FILLED to EMPTY
    grid.toggleGroundTruth({ col: 0, row: 0 });

    const clueAfter = grid.cells.get('0,1')!.neighborClueValue!;
    expect(clueAfter).toBe(clueBefore - 1);
  });

  it('recomputes flower clues for affected filled cells', () => {
    const grid = new HexGrid(interactionConfig);
    grid.computeAllClues();

    // (1,1) is FILLED, (0,0) is FILLED and within radius-2 of (1,1)
    const flowerBefore = grid.cells.get('1,1')!.flowerClueValue!;

    // Toggle (0,0) from FILLED to EMPTY
    grid.toggleGroundTruth({ col: 0, row: 0 });

    const flowerAfter = grid.cells.get('1,1')!.flowerClueValue!;
    expect(flowerAfter).toBe(flowerBefore - 1);
  });

  it('recomputes line clues after toggle', () => {
    const grid = new HexGrid(interactionConfig);
    grid.computeAllClues();

    // Get line clue values before toggle
    const verticalCol0Before = grid.lineClues.find(
      lc => lc.axis === 'vertical' && lc.startCoord.col === 0,
    );
    const valueBefore = verticalCol0Before?.value ?? 0;

    // Toggle (0,0) from FILLED to EMPTY
    grid.toggleGroundTruth({ col: 0, row: 0 });

    const verticalCol0After = grid.lineClues.find(
      lc => lc.axis === 'vertical' && lc.startCoord.col === 0,
    );
    expect(verticalCol0After!.value).toBe(valueBefore - 1);
  });

  it('updates visual state when toggling a revealed FILLED cell to EMPTY', () => {
    const grid = new HexGrid(interactionConfig);
    grid.computeAllClues();
    // (0,0) is MARKED_FILLED (blue)
    expect(grid.cells.get('0,0')!.visualState).toBe(CellVisualState.MARKED_FILLED);
    grid.toggleGroundTruth({ col: 0, row: 0 });
    // Now EMPTY → should become OPEN_EMPTY (dark)
    expect(grid.cells.get('0,0')!.visualState).toBe(CellVisualState.OPEN_EMPTY);
  });

  it('updates visual state when toggling a revealed EMPTY cell to FILLED', () => {
    const grid = new HexGrid(interactionConfig);
    grid.computeAllClues();
    // (1,0) is OPEN_EMPTY (dark)
    expect(grid.cells.get('1,0')!.visualState).toBe(CellVisualState.OPEN_EMPTY);
    grid.toggleGroundTruth({ col: 1, row: 0 });
    // Now FILLED → should become MARKED_FILLED (blue)
    expect(grid.cells.get('1,0')!.visualState).toBe(CellVisualState.MARKED_FILLED);
  });

  it('keeps remainingCount at 0 when toggling revealed cells', () => {
    const grid = new HexGrid(interactionConfig);
    grid.computeAllClues();
    // All revealed, remainingCount = 0
    expect(grid.remainingCount).toBe(0);

    // Toggle (1,0) EMPTY→FILLED: becomes MARKED_FILLED, still counted → remains 0
    grid.toggleGroundTruth({ col: 1, row: 0 });
    expect(grid.remainingCount).toBe(0);

    // Toggle (0,0) FILLED→EMPTY: was MARKED_FILLED, now OPEN_EMPTY → remains 0
    grid.toggleGroundTruth({ col: 0, row: 0 });
    expect(grid.remainingCount).toBe(0);
  });

  it('preserves COVERED visual state when toggling', () => {
    const grid = coveredGrid();
    // (1,0) is COVERED and EMPTY
    grid.toggleGroundTruth({ col: 1, row: 0 });
    // Visual state stays COVERED
    expect(grid.cells.get('1,0')!.visualState).toBe(CellVisualState.COVERED);
    expect(grid.cells.get('1,0')!.groundTruth).toBe(CellGroundTruth.FILLED);
  });

  it('decrements remainingCount when toggling COVERED FILLED to EMPTY', () => {
    const grid = coveredGrid();
    // (0,0) is COVERED and FILLED, remainingCount = 2
    const before = grid.remainingCount;
    grid.toggleGroundTruth({ col: 0, row: 0 });
    // Now EMPTY and COVERED — one less unfound FILLED cell
    expect(grid.remainingCount).toBe(before - 1);
  });

  it('increments remainingCount when toggling COVERED EMPTY to FILLED', () => {
    const grid = coveredGrid();
    // (1,0) is COVERED and EMPTY, remainingCount = 2
    const before = grid.remainingCount;
    grid.toggleGroundTruth({ col: 1, row: 0 });
    // Now FILLED and COVERED — one more unfound FILLED cell
    expect(grid.remainingCount).toBe(before + 1);
  });
});

// --- T033: recoverCell() ---

describe('HexGrid.recoverCell()', () => {
  it('re-covers an OPEN_EMPTY cell', () => {
    const grid = coveredGrid();
    grid.openCell({ col: 1, row: 0 }); // EMPTY → OPEN_EMPTY
    grid.recoverCell({ col: 1, row: 0 });
    expect(grid.cells.get('1,0')!.visualState).toBe(CellVisualState.COVERED);
  });

  it('re-covers a MARKED_FILLED cell', () => {
    const grid = coveredGrid();
    grid.markCell({ col: 1, row: 1 }); // FILLED → MARKED_FILLED
    grid.recoverCell({ col: 1, row: 1 });
    expect(grid.cells.get('1,1')!.visualState).toBe(CellVisualState.COVERED);
  });

  it('is a no-op on an already COVERED cell', () => {
    const grid = coveredGrid();
    grid.recoverCell({ col: 1, row: 0 }); // already covered
    expect(grid.cells.get('1,0')!.visualState).toBe(CellVisualState.COVERED);
  });

  it('increments remainingCount when re-covering a FILLED cell that was MARKED', () => {
    const grid = coveredGrid();
    grid.markCell({ col: 1, row: 1 }); // FILLED → MARKED_FILLED, remaining decreases
    const afterMark = grid.remainingCount;
    grid.recoverCell({ col: 1, row: 1 }); // back to COVERED
    expect(grid.remainingCount).toBe(afterMark + 1);
  });

  it('does not change remainingCount when re-covering an EMPTY cell', () => {
    const grid = coveredGrid();
    grid.openCell({ col: 1, row: 0 }); // EMPTY → OPEN_EMPTY
    const before = grid.remainingCount;
    grid.recoverCell({ col: 1, row: 0 });
    expect(grid.remainingCount).toBe(before);
  });
});

// --- T034: Mistake detection ---

describe('HexGrid mistake detection', () => {
  it('increments mistakeCount when clicking a FILLED cell', () => {
    const grid = coveredGrid();
    expect(grid.mistakeCount).toBe(0);
    grid.openCell({ col: 0, row: 0 }); // FILLED — mistake
    expect(grid.mistakeCount).toBe(1);
  });

  it('does not increment mistakeCount when clicking an EMPTY cell', () => {
    const grid = coveredGrid();
    grid.openCell({ col: 1, row: 0 }); // EMPTY — correct
    expect(grid.mistakeCount).toBe(0);
  });

  it('increments mistakeCount when Shift+clicking an EMPTY cell', () => {
    const grid = coveredGrid();
    grid.markCell({ col: 1, row: 0 }); // EMPTY — mistake
    expect(grid.mistakeCount).toBe(1);
  });

  it('does not increment mistakeCount when Shift+clicking a FILLED cell', () => {
    const grid = coveredGrid();
    grid.markCell({ col: 1, row: 1 }); // FILLED — correct
    expect(grid.mistakeCount).toBe(0);
  });

  it('accumulates mistakes across multiple actions', () => {
    const grid = coveredGrid();
    grid.openCell({ col: 0, row: 0 }); // mistake (FILLED)
    grid.markCell({ col: 2, row: 0 }); // mistake (EMPTY)
    expect(grid.mistakeCount).toBe(2);
  });

  it('does not increment mistakeCount on no-op actions', () => {
    const grid = coveredGrid();
    grid.openCell({ col: 1, row: 0 }); // correct open
    grid.openCell({ col: 1, row: 0 }); // no-op (already open)
    expect(grid.mistakeCount).toBe(0);
  });
});

// --- Invalid coord handling ---

describe('HexGrid methods with invalid coords', () => {
  it('openCell is a no-op for coords not in the grid', () => {
    const grid = coveredGrid();
    const before = grid.mistakeCount;
    grid.openCell({ col: 99, row: 99 });
    expect(grid.mistakeCount).toBe(before);
  });

  it('markCell is a no-op for coords not in the grid', () => {
    const grid = coveredGrid();
    const before = grid.mistakeCount;
    grid.markCell({ col: 99, row: 99 });
    expect(grid.mistakeCount).toBe(before);
  });

  it('recoverCell is a no-op for coords not in the grid', () => {
    const grid = coveredGrid();
    const before = grid.remainingCount;
    grid.recoverCell({ col: 99, row: 99 });
    expect(grid.remainingCount).toBe(before);
  });

  it('toggleGroundTruth is a no-op for coords not in the grid', () => {
    const grid = coveredGrid();
    const before = grid.remainingCount;
    grid.toggleGroundTruth({ col: 99, row: 99 });
    expect(grid.remainingCount).toBe(before);
  });
});

// --- T050 (partial): coverAll() ---

describe('HexGrid.coverAll()', () => {
  it('sets all cells to COVERED', () => {
    const grid = new HexGrid(interactionConfig);
    grid.coverAll();
    for (const cell of grid.cells.values()) {
      expect(cell.visualState).toBe(CellVisualState.COVERED);
    }
  });

  it('sets remainingCount to total FILLED cells', () => {
    const grid = new HexGrid(interactionConfig);
    grid.coverAll();
    // 2 filled cells: (0,0) and (1,1)
    expect(grid.remainingCount).toBe(2);
  });

  it('resets mistakeCount to 0', () => {
    const grid = coveredGrid();
    grid.openCell({ col: 0, row: 0 }); // mistake
    expect(grid.mistakeCount).toBe(1);
    grid.coverAll();
    expect(grid.mistakeCount).toBe(0);
  });
});

// --- T048: restart() ---

describe('HexGrid.restart()', () => {
  it('resets all cells to initial revealed state after interactions', () => {
    const grid = coveredGrid();
    grid.openCell({ col: 1, row: 0 });
    grid.markCell({ col: 1, row: 1 });
    grid.restart();

    for (const cell of grid.cells.values()) {
      if (cell.groundTruth === CellGroundTruth.EMPTY) {
        expect(cell.visualState).toBe(CellVisualState.OPEN_EMPTY);
      } else {
        expect(cell.visualState).toBe(CellVisualState.MARKED_FILLED);
      }
    }
  });

  it('resets EMPTY cells to OPEN_EMPTY', () => {
    const grid = coveredGrid();
    grid.restart();
    expect(grid.cells.get('1,0')!.visualState).toBe(CellVisualState.OPEN_EMPTY);
  });

  it('resets FILLED cells to MARKED_FILLED', () => {
    const grid = coveredGrid();
    grid.restart();
    expect(grid.cells.get('0,0')!.visualState).toBe(CellVisualState.MARKED_FILLED);
  });

  it('resets mistakeCount to 0', () => {
    const grid = coveredGrid();
    grid.openCell({ col: 0, row: 0 });
    expect(grid.mistakeCount).toBe(1);
    grid.restart();
    expect(grid.mistakeCount).toBe(0);
  });

  it('resets remainingCount to 0 (all revealed)', () => {
    const grid = coveredGrid();
    expect(grid.remainingCount).toBe(2);
    grid.restart();
    expect(grid.remainingCount).toBe(0);
  });

  it('preserves clue values after restart', () => {
    const grid = new HexGrid(interactionConfig);
    grid.computeAllClues();
    const cluesBefore = new Map<string, { neighbor: number | null; flower: number | null }>();
    for (const [key, cell] of grid.cells) {
      cluesBefore.set(key, {
        neighbor: cell.neighborClueValue,
        flower: cell.flowerClueValue,
      });
    }

    grid.coverAll();
    grid.restart();

    for (const [key, cell] of grid.cells) {
      const before = cluesBefore.get(key)!;
      expect(cell.neighborClueValue).toBe(before.neighbor);
      expect(cell.flowerClueValue).toBe(before.flower);
    }
  });
});
