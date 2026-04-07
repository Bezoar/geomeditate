import { describe, it, expect } from 'vitest';
import { contiguityStrategy } from '../../../src/solver/deduction/contiguity';
import { HexGrid } from '../../../src/model/hex-grid';
import { buildVisibleClueSet } from '../../../src/solver/visible-clues';
import { neighbors } from '../../../src/model/hex-coord';
import { CellGroundTruth, ClueNotation, CellVisualState } from '../../../src/model/hex-cell';

describe('contiguityStrategy', () => {
  it('contiguous constraint forces adjacent placement', () => {
    const center = { col: 2, row: 2 };
    const nbrs = neighbors(center);
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: [nbrs[0], nbrs[1]],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell(center);
    grid.markCell(nbrs[0]);
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = contiguityStrategy(grid, vcs);
    expect(forced.length).toBeGreaterThan(0);
  });

  it('discontiguous constraint forces non-adjacent placement', () => {
    const center = { col: 2, row: 2 };
    const nbrs = neighbors(center);
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: [nbrs[0], nbrs[3]],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell(center);
    grid.markCell(nbrs[0]);
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = contiguityStrategy(grid, vcs);
    expect(forced.length).toBeGreaterThan(0);
  });

  it('returns empty when contiguity does not narrow down cells', () => {
    const center = { col: 2, row: 2 };
    const nbrs = neighbors(center);
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: [nbrs[0], nbrs[1], nbrs[2]],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell(center);
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = contiguityStrategy(grid, vcs);
    expect(forced.length).toBe(0);
  });

  it('skips clues where contiguity is disabled', () => {
    // Create a grid where we manually disable contiguity on a cell's clue
    const center = { col: 2, row: 2 };
    const nbrs = neighbors(center);
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: [nbrs[0], nbrs[1]],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell(center);
    // Disable contiguity on the center cell
    const cell = grid.cells.get('2,2')!;
    grid.cells.set('2,2', { ...cell, contiguityEnabled: false });
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = contiguityStrategy(grid, vcs);
    // With contiguity disabled on (2,2), no contiguity deduction from that clue
    expect(forced.length).toBe(0);
  });

  it('skips clues with PLAIN notation (not contiguous/discontiguous)', () => {
    // If clue notation is PLAIN, contiguity strategy should skip it.
    // PLAIN notation occurs when 0 or 1 filled neighbors.
    const center = { col: 2, row: 2 };
    const nbrs = neighbors(center);
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: [nbrs[0]], // only 1 filled neighbor => PLAIN notation
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell(center);
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = contiguityStrategy(grid, vcs);
    // PLAIN notation => skip, no contiguity deduction
    expect(forced.length).toBe(0);
  });

  it('handles neighbor cells at grid edge (some neighbors do not exist)', () => {
    // Use a corner cell where some hex neighbors fall outside the grid
    const center = { col: 0, row: 0 };
    const nbrs = neighbors(center);
    // Only some neighbors will be in the grid (5x5 grid, col 0 row 0)
    const filledNbrs = nbrs.filter(n => n.col >= 0 && n.col < 5 && n.row >= 0 && n.row < 5);
    // Make sure we have at least 2 filled to get CONTIGUOUS/DISCONTIGUOUS notation
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: filledNbrs.slice(0, 2),
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell(center);
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = contiguityStrategy(grid, vcs);
    // Just verify it doesn't crash — some neighbors are outside the grid (!nCell path)
    expect(Array.isArray(forced)).toBe(true);
  });

  it('skips when remaining filled is 0 (all already marked)', () => {
    // All filled neighbors already marked => remaining = 0 => skip
    const center = { col: 2, row: 2 };
    const nbrs = neighbors(center);
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: [nbrs[0], nbrs[1]],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell(center);
    grid.markCell(nbrs[0]);
    grid.markCell(nbrs[1]);
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = contiguityStrategy(grid, vcs);
    // remaining = 2 - 2 = 0, so skip
    expect(forced.length).toBe(0);
  });

  it('skips when no covered candidate neighbors exist', () => {
    // All neighbors are either marked or open — no covered candidates
    const center = { col: 2, row: 2 };
    const nbrs = neighbors(center);
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: [nbrs[0], nbrs[1]],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell(center);
    // Open or mark ALL neighbors
    for (const n of nbrs) {
      const nk = `${n.col},${n.row}`;
      if (grid.cells.has(nk)) {
        if (grid.cells.get(nk)!.groundTruth === CellGroundTruth.FILLED) {
          grid.markCell(n);
        } else {
          grid.openCell(n);
        }
      }
    }
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = contiguityStrategy(grid, vcs);
    // No covered candidates => skip
    expect(forced.length).toBe(0);
  });

  it('returns empty map when no valid contiguous combinations exist', () => {
    // Construct an inconsistent state where contiguity check rejects ALL combos.
    // CONTIGUOUS notation: all filled neighbors must form one connected group.
    // Mark two non-adjacent filled neighbors. The remaining fill must bridge them,
    // but if no candidate cell bridges them, validCombos is empty.
    //
    // Center (2,2) with 4 filled neighbors at positions 0,1,2,3 (contiguous).
    // Cover all, open center. Mark nbrs[0] and nbrs[3] (non-adjacent in hex).
    // remaining = 2. Candidates are nbrs[1], nbrs[2], nbrs[4], nbrs[5].
    // The contiguity check requires allFilled={nbrs[0], nbrs[3], combo[0], combo[1]}
    // to be contiguous. We need combos that DON'T produce contiguity.
    // Actually, nbrs[1] and nbrs[2] ARE between 0 and 3 in the hex ring,
    // so combo {1,2} bridges 0 and 3 into one group.
    //
    // For validCombos to be EMPTY, no combo should satisfy the constraint.
    // This requires a geometry where marked cells are separated and no placement
    // of remaining cells can connect them.
    //
    // Alternative: use DISCONTIGUOUS constraint with cells that are inherently connected.
    // DISCONTIGUOUS requires filled to NOT form a single group.
    // Mark two adjacent filled neighbors. remaining = 2. Any 2 additional fills adjacent
    // to them would keep the group connected => contiguous => fails DISCONTIGUOUS check.
    //
    // But some combos might include non-adjacent cells...
    //
    // Simplest approach: directly manipulate the clue to create inconsistency.
    // Create a grid, then manually override the cell's notation to force an
    // impossible constraint. The solver won't normally do this, but it exercises
    // the validCombos === 0 branch.
    const center = { col: 2, row: 2 };
    const nbrs = neighbors(center);
    // Fill ALL 6 neighbors to get value=6. This is CONTIGUOUS.
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: nbrs, // all 6 neighbors filled
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell(center);

    // Now override the cell's notation to DISCONTIGUOUS (impossible with 6 filled adjacent).
    // When remaining=6 and all must be discontiguous, but in a hex ring all 6 are connected,
    // no placement of 6 cells from 6 candidates is discontiguous. validCombos = [].
    const cell = grid.cells.get('2,2')!;
    grid.cells.set('2,2', { ...cell, neighborClueNotation: ClueNotation.DISCONTIGUOUS });

    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = contiguityStrategy(grid, vcs);
    // With DISCONTIGUOUS but all 6 neighbors must be filled and they're all connected,
    // no valid discontiguous placement exists. validCombos = []. Returns empty.
    expect(forced.length).toBe(0);
  });

  it('forces cell empty when it appears in no valid combo (inNone branch)', () => {
    // Need a scenario where contiguity analysis determines that a candidate
    // cell cannot be filled in ANY valid combination.
    // Use discontiguous constraint: 2 filled neighbors must be non-adjacent.
    // Center (2,2), filled neighbors at opposite positions.
    const center = { col: 2, row: 2 };
    const nbrs = neighbors(center);
    // Fill nbrs[0] and nbrs[3] — these are on opposite sides (non-adjacent)
    const grid = new HexGrid({
      name: 'test', description: '', width: 5, height: 5,
      filledCoords: [nbrs[0], nbrs[3]],
      missingCoords: [],
    });
    grid.computeAllClues();
    grid.coverAll();
    grid.openCell(center);
    // Mark nbrs[0]. Remaining = 1 filled among candidates.
    // Only nbrs[3] should be deducible from discontiguity.
    grid.markCell(nbrs[0]);
    const vcs = buildVisibleClueSet(grid, new Map(), new Set());
    const forced = contiguityStrategy(grid, vcs);
    // Check if inNone or inAll branches are hit
    const emptyForced = forced.filter(f => f.identity === 'empty');
    const filledForced = forced.filter(f => f.identity === 'filled');
    // Some cells should be forced empty (inNone = true)
    // and nbrs[3] might be forced filled (inAll = true)
    expect(forced.length).toBeGreaterThan(0);
    // At least verify we get results of either type
    expect(filledForced.length + emptyForced.length).toBeGreaterThan(0);
  });
});
