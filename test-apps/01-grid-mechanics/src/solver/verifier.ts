import { coordKey } from '../model/hex-coord';
import { CellGroundTruth, CellVisualState, type HexCell } from '../model/hex-cell';
import type { HexGrid } from '../model/hex-grid';
import { type ClueId, type Deduction, parseClueId } from './deductions';
import { type SolveTier, solve } from './solver';

export interface SolveStep {
  deductions: Deduction[];
  boardState: Map<string, CellVisualState>;
}

export interface SolveReplay {
  steps: SolveStep[];
  stuck: boolean;
  stuckCells?: Set<string>;
}

/**
 * Lightweight simulation grid that satisfies the shape solve() requires:
 *   grid.cells, grid.lineClues, grid.remainingCount
 * We use Object.create(HexGrid.prototype) so that any prototype methods are
 * available if needed, without running the HexGrid constructor.
 */
interface SimGrid {
  cells: Map<string, HexCell>;
  lineClues: HexGrid['lineClues'];
  remainingCount: number;
}

function cloneSimGrid(grid: HexGrid): SimGrid {
  // Deep-copy each cell (HexCell is a plain object with no nested references)
  const cells = new Map<string, HexCell>();
  for (const [key, cell] of grid.cells) {
    cells.set(key, { ...cell });
  }
  return {
    cells,
    lineClues: grid.lineClues, // LineClue objects are read-only in solve()
    remainingCount: grid.remainingCount,
  };
}

/**
 * Snapshot the current visual state of every cell.
 */
function snapshotBoardState(cells: Map<string, HexCell>): Map<string, CellVisualState> {
  const snapshot = new Map<string, CellVisualState>();
  for (const [key, cell] of cells) {
    snapshot.set(key, cell.visualState);
  }
  return snapshot;
}

/**
 * Pre-reveal clue cells in the simulation so that solve() can read them:
 *   - neighbor clue: the EMPTY cell hosting the clue must be OPEN_EMPTY
 *   - flower clue:   the FILLED cell hosting the clue must be MARKED_FILLED
 *                    (and remainingCount is decremented)
 * Line and global clues don't require a specific cell state.
 */
function preRevealClueCells(sim: SimGrid, visibleClues: Set<ClueId>): void {
  for (const clueId of visibleClues) {
    const parsed = parseClueId(clueId);

    if (parsed.type === 'neighbor') {
      const key = coordKey(parsed.coord);
      const cell = sim.cells.get(key);
      if (cell !== undefined && cell.visualState === CellVisualState.COVERED) {
        sim.cells.set(key, { ...cell, visualState: CellVisualState.OPEN_EMPTY });
      }
    } else if (parsed.type === 'flower') {
      const key = coordKey(parsed.coord);
      const cell = sim.cells.get(key);
      if (cell !== undefined && cell.visualState === CellVisualState.COVERED) {
        sim.cells.set(key, { ...cell, visualState: CellVisualState.MARKED_FILLED });
        if (cell.groundTruth === CellGroundTruth.FILLED) {
          sim.remainingCount--;
        }
      }
    }
    // line and global clues: no cell-state pre-reveal needed
  }
}

/**
 * Apply a list of deductions to the simulation grid.
 * Only COVERED cells are updated.
 */
function applyDeductions(sim: SimGrid, deductions: Deduction[]): void {
  for (const deduction of deductions) {
    const key = coordKey(deduction.coord);
    const cell = sim.cells.get(key);
    if (cell === undefined || cell.visualState !== CellVisualState.COVERED) continue;

    if (deduction.result === 'filled') {
      sim.cells.set(key, { ...cell, visualState: CellVisualState.MARKED_FILLED });
      if (cell.groundTruth === CellGroundTruth.FILLED) {
        sim.remainingCount--;
      }
    } else {
      sim.cells.set(key, { ...cell, visualState: CellVisualState.OPEN_EMPTY });
    }
  }
}

/**
 * Run the solver in a loop against a cloned grid and produce a SolveReplay.
 * The original grid is never mutated.
 */
export function verify(grid: HexGrid, visibleClues: Set<ClueId>, tier: SolveTier): SolveReplay {
  const sim = cloneSimGrid(grid);

  // Pre-reveal cells that host visible clues
  preRevealClueCells(sim, visibleClues);

  const steps: SolveStep[] = [];
  const maxIterations = grid.cells.size;

  for (let i = 0; i < maxIterations; i++) {
    // solve() accepts HexGrid but only uses .cells, .lineClues, .remainingCount
    const deductions = solve(sim as unknown as HexGrid, visibleClues, tier);
    if (deductions.length === 0) break;

    applyDeductions(sim, deductions);
    steps.push({
      deductions,
      boardState: snapshotBoardState(sim.cells),
    });
  }

  // Check for stuck cells
  const stuckKeys = new Set<string>();
  for (const [key, cell] of sim.cells) {
    if (cell.visualState === CellVisualState.COVERED) {
      stuckKeys.add(key);
    }
  }

  if (stuckKeys.size > 0) {
    return { steps, stuck: true, stuckCells: stuckKeys };
  }
  return { steps, stuck: false };
}
