import type { TestGridConfig } from '../model/hex-grid';

// ---------------------------------------------------------------------------
// 1. Basic neighbor clues — small grid (7 cells, classic hex flower)
//    Center cell is empty; its neighbor clue shows how many of its 6
//    neighbours are filled. Surrounding cells are a mix of filled/empty.
//    Cells at (0,0) and (2,0) could be assigned NO_CLUE (?) at render time.
// ---------------------------------------------------------------------------
const basicNeighborClues: TestGridConfig = {
  name: 'Basic Neighbor Clues',
  description:
    'A 7-cell flower pattern demonstrating neighbor clue variety. ' +
    'The center cell is empty and surrounded by a mix of filled/empty neighbors.',
  width: 3,
  height: 3,
  filledCoords: [
    // Ring around center — 4 of 6 present neighbors filled
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 2, row: 0 },
    { col: 0, row: 1 },
    // (1,1) is the empty center — will show neighbor clue
    // (2,1) is empty — will show neighbor clue
  ],
  missingCoords: [
    { col: 0, row: 2 },
    { col: 2, row: 2 },
  ],
};

// ---------------------------------------------------------------------------
// 2. Flower clues — medium grid with radius-2 surroundings
//    An 8-wide, 5-tall grid with a cluster of filled cells in the interior.
//    Filled cells display flower clues (count of filled within radius 2).
//    Includes missingCoords to test gap handling.
// ---------------------------------------------------------------------------
const flowerClues: TestGridConfig = {
  name: 'Flower Clues',
  description:
    'A medium grid (8x5) with interior filled cells that produce non-trivial ' +
    'flower clue values. Includes missing coords to test gaps.',
  width: 8,
  height: 5,
  filledCoords: [
    // Central filled cluster
    { col: 3, row: 1 },
    { col: 4, row: 1 },
    { col: 3, row: 2 },
    { col: 4, row: 2 },
    { col: 5, row: 2 },
    { col: 2, row: 2 },
    { col: 3, row: 3 },
    { col: 4, row: 3 },
    // Outlier filled cells to vary flower counts
    { col: 1, row: 1 },
    { col: 6, row: 3 },
    { col: 5, row: 1 },
  ],
  missingCoords: [
    // Gaps around the edges
    { col: 0, row: 0 },
    { col: 7, row: 0 },
    { col: 0, row: 4 },
    { col: 7, row: 4 },
  ],
};

// ---------------------------------------------------------------------------
// 3. Line clues — grid with clear vertical and diagonal lines
//    A 5x6 grid where filled cells form recognisable lines along the three
//    hex axes: vertical, ascending-diagonal, and descending-diagonal.
// ---------------------------------------------------------------------------
const lineClues: TestGridConfig = {
  name: 'Line Clues',
  description:
    'A 5x6 grid with filled cells arranged along vertical and diagonal lines ' +
    'to exercise line-clue computation on all three axes.',
  width: 5,
  height: 6,
  filledCoords: [
    // Vertical line at col 2
    { col: 2, row: 0 },
    { col: 2, row: 1 },
    { col: 2, row: 2 },
    { col: 2, row: 3 },
    { col: 2, row: 4 },
    { col: 2, row: 5 },
    // Ascending diagonal from (0,4) stepping upper-right
    // even col (0): upper-right offset (+1, -1)
    // odd col (1): upper-right offset (+1, 0)
    // even col (2): upper-right offset (+1, -1) — already filled above
    { col: 0, row: 4 },
    { col: 1, row: 3 },
    // col 2 row 2 already present
    { col: 3, row: 2 },
    { col: 4, row: 1 },
    // Descending diagonal from (0,0) stepping right
    // even col (0): right offset (+1, 0)
    // odd col (1): right offset (+1, +1)
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    // col 2 row 1 already present
    { col: 3, row: 1 },
    { col: 4, row: 2 },
  ],
  missingCoords: [],
};

// ---------------------------------------------------------------------------
// 4. Large grid — 50+ cells (10 x 7 = 70 minus missing = 62 cells)
//    A bigger board with scattered filled cells and several missing coords
//    to stress-test rendering, clue computation, and gap handling.
//    Some empty cells (e.g. (0,0), (9,6)) could be assigned NO_CLUE (?) at
//    render time for testing purposes.
// ---------------------------------------------------------------------------
const largeGrid: TestGridConfig = {
  name: 'Large Grid',
  description:
    'A 10x7 grid (62 active cells) with scattered fills and missing coords, ' +
    'useful for stress-testing rendering and clue computation.',
  width: 10,
  height: 7,
  filledCoords: [
    // Scattered pattern — roughly 30 filled cells
    { col: 1, row: 1 },
    { col: 2, row: 1 },
    { col: 3, row: 1 },
    { col: 5, row: 0 },
    { col: 6, row: 0 },
    { col: 7, row: 1 },
    { col: 8, row: 1 },
    { col: 1, row: 3 },
    { col: 2, row: 3 },
    { col: 3, row: 2 },
    { col: 4, row: 2 },
    { col: 4, row: 3 },
    { col: 5, row: 3 },
    { col: 6, row: 2 },
    { col: 7, row: 3 },
    { col: 8, row: 3 },
    { col: 0, row: 5 },
    { col: 1, row: 5 },
    { col: 2, row: 5 },
    { col: 3, row: 4 },
    { col: 4, row: 5 },
    { col: 5, row: 5 },
    { col: 6, row: 4 },
    { col: 7, row: 5 },
    { col: 8, row: 5 },
    { col: 9, row: 4 },
    { col: 3, row: 6 },
    { col: 4, row: 6 },
    { col: 5, row: 6 },
    { col: 6, row: 6 },
  ],
  missingCoords: [
    // Holes scattered around the board
    { col: 0, row: 0 },
    { col: 9, row: 0 },
    { col: 0, row: 6 },
    { col: 9, row: 6 },
    { col: 4, row: 0 },
    { col: 5, row: 1 },
    { col: 4, row: 4 },
    { col: 5, row: 4 },
  ],
};

// ---------------------------------------------------------------------------
// 5. Tiny 3-cell grid — minimum viable puzzle
//    Three cells in a line; one filled, two empty.
//    Good for unit testing basic clue output.
// ---------------------------------------------------------------------------
const tiny3Cell: TestGridConfig = {
  name: 'Tiny 3-Cell',
  description:
    'Minimal 3-cell grid (one filled, two empty) for basic clue sanity checks.',
  width: 3,
  height: 1,
  filledCoords: [
    { col: 1, row: 0 },
  ],
  missingCoords: [],
};

// ---------------------------------------------------------------------------
// 6. Really large grid — 30x20 with scattered missing cells
//    Stress test for rendering, clue computation, and interior line clues.
// ---------------------------------------------------------------------------
const reallyLargeGrid: TestGridConfig = (() => {
  const width = 30;
  const height = 20;
  const filledCoords: Array<{ col: number; row: number }> = [];
  const missingCoords: Array<{ col: number; row: number }> = [];

  // Seed-based pseudo-random for reproducibility
  let seed = 42;
  function rand() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  for (let col = 0; col < width; col++) {
    for (let row = 0; row < height; row++) {
      // Missing cells: scattered holes (~8% of cells)
      if (rand() < 0.08) {
        missingCoords.push({ col, row });
        continue;
      }
      // Fill ~35% of remaining cells
      if (rand() < 0.35) {
        filledCoords.push({ col, row });
      }
    }
  }

  return {
    name: 'Really Large Grid',
    description: 'A 30x20 grid with ~8% missing cells and ~35% fill density for stress testing.',
    width,
    height,
    filledCoords,
    missingCoords,
  };
})();

// ---------------------------------------------------------------------------
// Exported collection
// ---------------------------------------------------------------------------
export const TEST_GRIDS: TestGridConfig[] = [
  basicNeighborClues,
  flowerClues,
  lineClues,
  largeGrid,
  tiny3Cell,
  reallyLargeGrid,
];
