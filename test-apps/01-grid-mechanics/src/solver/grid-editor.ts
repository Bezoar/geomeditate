import type { HexCoord } from '../model/hex-coord';
import { coordKey, neighbors } from '../model/hex-coord';
import { CellGroundTruth } from '../model/hex-cell';
import { HexGrid, type TestGridConfig } from '../model/hex-grid';
import { selectClues, allClueIds, type ClueSelection } from './clue-selector';
import { verify } from './verifier';
import { GLOBAL_REMAINING_ID } from './deductions';

export interface GridEdit {
  coord: HexCoord;
  type: 'toggle_truth' | 'add_cell' | 'remove_cell';
}

export interface EditResult {
  edits: GridEdit[];
  grid: HexGrid;
  clueSelection: ClueSelection;
}

/**
 * Clone a HexGrid into a fresh HexGrid instance by reconstructing its
 * TestGridConfig from the current state of cells.
 */
function cloneGrid(grid: HexGrid): HexGrid {
  const filledCoords: HexCoord[] = [];
  const existingKeys = new Set<string>();

  for (const cell of grid.cells.values()) {
    existingKeys.add(coordKey(cell.coord));
    if (cell.groundTruth === CellGroundTruth.FILLED) {
      filledCoords.push(cell.coord);
    }
  }

  // Positions in the grid bounds that are NOT in existingKeys are missing
  const missingCoords: HexCoord[] = [];
  for (let col = 0; col < grid.width; col++) {
    for (let row = 0; row < grid.height; row++) {
      const coord: HexCoord = { col, row };
      if (!existingKeys.has(coordKey(coord))) {
        missingCoords.push(coord);
      }
    }
  }

  const config: TestGridConfig = {
    name: 'cloned-grid',
    description: 'cloned grid for editing',
    width: grid.width,
    height: grid.height,
    filledCoords,
    missingCoords,
  };

  const cloned = new HexGrid(config);
  cloned.computeAllClues();
  cloned.coverAll();
  return cloned;
}

/**
 * Collect stuck cell coords and their neighbors as candidate coords to try edits on.
 * Returns them as an array of HexCoord (deduped).
 */
function getCandidates(grid: HexGrid, difficulty: 'easy' | 'hard'): HexCoord[] {
  const tier = difficulty === 'easy' ? 'simple' : 'advanced';
  const allClues = allClueIds(grid);
  if (difficulty === 'hard') {
    allClues.add(GLOBAL_REMAINING_ID);
  }

  const replay = verify(grid, allClues, tier);
  const seen = new Set<string>();
  const candidates: HexCoord[] = [];

  const addCandidate = (coord: HexCoord) => {
    const key = coordKey(coord);
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(coord);
    }
  };

  if (replay.stuckCells) {
    for (const key of replay.stuckCells) {
      const parts = key.split(',');
      const coord: HexCoord = { col: Number(parts[0]), row: Number(parts[1]) };
      addCandidate(coord);
      for (const n of neighbors(coord)) {
        addCandidate(n);
      }
    }
  }

  return candidates;
}

/**
 * Makes minimal edits to a grid to achieve solvability when clue selection
 * alone isn't enough.
 *
 * Returns null if:
 * - maxEdits <= 0 (and grid is not already solvable), or
 * - no single edit can make the grid solvable.
 *
 * Returns an EditResult with edits=[] if the grid is already solvable.
 */
export function editForSolvability(
  grid: HexGrid,
  difficulty: 'easy' | 'hard',
  maxEdits: number = 1,
): EditResult | null {
  // Step 1: If maxEdits <= 0, return null immediately (before checking solvability)
  if (maxEdits <= 0) {
    return null;
  }

  // Step 2: Check if already solvable
  const existingSelection = selectClues(grid, difficulty);
  if (existingSelection !== null) {
    return { edits: [], grid, clueSelection: existingSelection };
  }

  // Step 3: Get stuck cells and their neighbors as candidates
  const candidates = getCandidates(grid, difficulty);

  // Strategy 1 — Toggle ground truth: for each candidate coord that has a cell
  for (const coord of candidates) {
    const key = coordKey(coord);
    if (!grid.cells.has(key)) continue;

    const cloned = cloneGrid(grid);
    cloned.toggleGroundTruth(coord);
    cloned.computeAllClues();
    cloned.coverAll();

    const selection = selectClues(cloned, difficulty);
    if (selection !== null) {
      return {
        edits: [{ coord, type: 'toggle_truth' }],
        grid: cloned,
        clueSelection: selection,
      };
    }
  }

  // Strategy 2 — Remove cells: for each candidate that has a cell
  for (const coord of candidates) {
    const key = coordKey(coord);
    if (!grid.cells.has(key)) continue;

    const cloned = cloneGrid(grid);
    cloned.toggleMissing(coord); // removes the cell
    cloned.computeAllClues();
    cloned.coverAll();

    const selection = selectClues(cloned, difficulty);
    if (selection !== null) {
      return {
        edits: [{ coord, type: 'remove_cell' }],
        grid: cloned,
        clueSelection: selection,
      };
    }
  }

  // Strategy 3 — Add cells: for each candidate that does NOT have a cell and is within bounds
  for (const coord of candidates) {
    const key = coordKey(coord);
    if (grid.cells.has(key)) continue;
    // Must be within grid bounds
    if (coord.col < 0 || coord.col >= grid.width || coord.row < 0 || coord.row >= grid.height) {
      continue;
    }

    const cloned = cloneGrid(grid);
    cloned.toggleMissing(coord); // adds the cell
    cloned.computeAllClues();
    cloned.coverAll();

    const selection = selectClues(cloned, difficulty);
    if (selection !== null) {
      return {
        edits: [{ coord, type: 'add_cell' }],
        grid: cloned,
        clueSelection: selection,
      };
    }
  }

  // Nothing worked
  return null;
}
