import { describe, it, expect } from 'vitest';
import {
  type HexCoord,
  neighbors,
  lineAlongAxis,
  radius2Positions,
  toPixel,
  coordKey,
} from '../src/model/hex-coord';

// --- T007: Neighbor offsets (even/odd column parity, all 6 directions, edge positions) ---

describe('neighbors', () => {
  it('returns 6 neighbors for an even-column cell', () => {
    const result = neighbors({ col: 0, row: 1 });
    expect(result).toHaveLength(6);
  });

  it('returns 6 neighbors for an odd-column cell', () => {
    const result = neighbors({ col: 1, row: 1 });
    expect(result).toHaveLength(6);
  });

  it('returns correct neighbors for even column (col=0, row=1)', () => {
    // Even col offsets: upper-right(+1,-1), right(+1,0), lower-right(0,+1),
    //                   lower-left(-1,0), left(-1,-1), upper-left(0,-1)
    const result = neighbors({ col: 0, row: 1 });
    const keys = result.map(coordKey);
    expect(keys).toContain('1,0');  // upper-right
    expect(keys).toContain('1,1');  // right (lower-right of even)
    expect(keys).toContain('0,2');  // lower-right (below)
    expect(keys).toContain('-1,1'); // lower-left
    expect(keys).toContain('-1,0'); // left
    expect(keys).toContain('0,0'); // upper-left
  });

  it('returns correct neighbors for odd column (col=1, row=1)', () => {
    // Odd col offsets: upper-right(+1,0), right(+1,+1), lower-right(0,+1),
    //                  lower-left(-1,+1), left(-1,0), upper-left(0,-1)
    const result = neighbors({ col: 1, row: 1 });
    const keys = result.map(coordKey);
    expect(keys).toContain('2,1');  // upper-right
    expect(keys).toContain('2,2');  // right
    expect(keys).toContain('1,2');  // lower-right (below)
    expect(keys).toContain('0,2');  // lower-left
    expect(keys).toContain('0,1');  // left
    expect(keys).toContain('1,0');  // upper-left
  });

  it('returns neighbors with negative coords for cells near origin', () => {
    const result = neighbors({ col: 0, row: 0 });
    const keys = result.map(coordKey);
    // upper-left of (0,0) even col is (0,-1), left is (-1,-1)
    expect(keys).toContain('0,-1');
    expect(keys).toContain('-1,-1');
  });
});

// --- T008: Line traversal (vertical, left-facing, right-facing) ---

describe('lineAlongAxis', () => {
  it('returns cells along the vertical axis (same column)', () => {
    const cells = new Set(['2,0', '2,1', '2,2', '2,3']);
    const result = lineAlongAxis({ col: 2, row: 0 }, 'vertical', cells);
    expect(result.map(coordKey)).toEqual(['2,0', '2,1', '2,2', '2,3']);
  });

  it('stops at gaps in the vertical axis', () => {
    const cells = new Set(['2,0', '2,1', '2,3']); // gap at 2,2
    const result = lineAlongAxis({ col: 2, row: 0 }, 'vertical', cells);
    expect(result.map(coordKey)).toEqual(['2,0', '2,1']);
  });

  it('traverses left-facing diagonal', () => {
    // From (0,1) going upper-right repeatedly
    // Even col (0,1) → upper-right is (1,0)
    // Odd col (1,0) → upper-right is (2,0)
    // Even col (2,0) → upper-right is (3,-1)
    const cells = new Set(['0,1', '1,0', '2,0', '3,-1']);
    const result = lineAlongAxis({ col: 0, row: 1 }, 'left-facing', cells);
    expect(result.map(coordKey)).toEqual(['0,1', '1,0', '2,0', '3,-1']);
  });

  it('traverses right-facing diagonal', () => {
    // From (0,0) going lower-right (which is "right" in even col offset)
    // Even col (0,0) → right is (1,0)
    // Odd col (1,0) → right is (2,1)
    // Even col (2,1) → right is (3,1) -- wait, let me reconsider
    // Actually "right-facing" = upper-right-to-lower-left direction
    // Let's define it as stepping via the "right" neighbor offset
    // Even col: right = (+1, 0); Odd col: right = (+1, +1)
    const cells = new Set(['0,0', '1,0', '2,1', '3,1']);
    const result = lineAlongAxis({ col: 0, row: 0 }, 'right-facing', cells);
    expect(result.map(coordKey)).toEqual(['0,0', '1,0', '2,1', '3,1']);
  });

  it('returns single cell when no neighbors in direction exist in set', () => {
    const cells = new Set(['5,5']);
    const result = lineAlongAxis({ col: 5, row: 5 }, 'vertical', cells);
    expect(result.map(coordKey)).toEqual(['5,5']);
  });
});

// --- T009: 2-hex-radius positions (18 surrounding cells) ---

describe('radius2Positions', () => {
  it('returns 18 positions for a cell with full surroundings', () => {
    const result = radius2Positions({ col: 5, row: 5 });
    expect(result).toHaveLength(18);
  });

  it('does not include the center cell itself', () => {
    const result = radius2Positions({ col: 5, row: 5 });
    const keys = result.map(coordKey);
    expect(keys).not.toContain('5,5');
  });

  it('includes all 6 direct neighbors (distance 1)', () => {
    const center: HexCoord = { col: 4, row: 4 };
    const result = radius2Positions(center);
    const resultKeys = new Set(result.map(coordKey));
    const neighborKeys = neighbors(center).map(coordKey);
    for (const nk of neighborKeys) {
      expect(resultKeys).toContain(nk);
    }
  });

  it('includes 12 distance-2 cells', () => {
    const result = radius2Positions({ col: 5, row: 5 });
    const directNeighborKeys = new Set(neighbors({ col: 5, row: 5 }).map(coordKey));
    const distance2 = result.filter(c => !directNeighborKeys.has(coordKey(c)));
    expect(distance2).toHaveLength(12);
  });

  it('returns no duplicate positions', () => {
    const result = radius2Positions({ col: 3, row: 2 });
    const keys = result.map(coordKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// --- T010: Pixel conversion (cell-to-pixel for flat-top offset-column layout) ---

describe('toPixel', () => {
  it('returns origin for cell (0,0) with default radius', () => {
    const { x, y } = toPixel({ col: 0, row: 0 }, 16);
    expect(x).toBeCloseTo(0, 1);
    expect(y).toBeCloseTo(0, 1);
  });

  it('places col 1 at 1.5*R horizontally', () => {
    const { x } = toPixel({ col: 1, row: 0 }, 16);
    expect(x).toBeCloseTo(24, 1); // 1.5 * 16
  });

  it('places col 2 at 3*R horizontally', () => {
    const { x } = toPixel({ col: 2, row: 0 }, 16);
    expect(x).toBeCloseTo(48, 1); // 3 * 16
  });

  it('places row 1 at sqrt(3)*R vertically for even column', () => {
    const { y } = toPixel({ col: 0, row: 1 }, 16);
    expect(y).toBeCloseTo(16 * Math.sqrt(3), 1); // ~27.7
  });

  it('shifts odd columns down by half a row', () => {
    const evenY = toPixel({ col: 0, row: 0 }, 16).y;
    const oddY = toPixel({ col: 1, row: 0 }, 16).y;
    expect(oddY - evenY).toBeCloseTo(16 * Math.sqrt(3) / 2, 1); // half row
  });

  it('scales correctly with different radius', () => {
    const { x, y } = toPixel({ col: 1, row: 1 }, 20);
    expect(x).toBeCloseTo(30, 1);  // 1.5 * 20
    // odd col row 1: row * sqrt(3)*R + halfRow = 1 * sqrt(3)*20 + sqrt(3)*20/2
    expect(y).toBeCloseTo(20 * Math.sqrt(3) + 20 * Math.sqrt(3) / 2, 1);
  });
});
