import { coordKey } from '../model/hex-coord';
import { CellGroundTruth, CellVisualState, type HexCell } from '../model/hex-cell';
import type { HexGrid } from '../model/hex-grid';
import {
  type ClueId,
  type Deduction,
  GLOBAL_REMAINING_ID,
  neighborClueId,
  flowerClueId,
  parseClueId,
} from './deductions';
import { allClueIds } from './clue-selector';
import { type SolveTier, solve } from './solver';
import type { SolveStep, SolveReplay } from './verifier';

interface SimGrid {
  cells: Map<string, HexCell>;
  lineClues: HexGrid['lineClues'];
  remainingCount: number;
}

function cloneSimGrid(grid: HexGrid): SimGrid {
  const cells = new Map<string, HexCell>();
  for (const [key, cell] of grid.cells) {
    cells.set(key, { ...cell });
  }
  return { cells, lineClues: grid.lineClues, remainingCount: grid.remainingCount };
}

function snapshotBoardState(cells: Map<string, HexCell>): Map<string, CellVisualState> {
  const snapshot = new Map<string, CellVisualState>();
  for (const [key, cell] of cells) {
    snapshot.set(key, cell.visualState);
  }
  return snapshot;
}

function coverAll(sim: SimGrid): void {
  let filled = 0;
  for (const [key, cell] of sim.cells) {
    if (cell.visualState !== CellVisualState.COVERED) {
      sim.cells.set(key, { ...cell, visualState: CellVisualState.COVERED });
    }
    if (cell.groundTruth === CellGroundTruth.FILLED) filled++;
  }
  sim.remainingCount = filled;
}

function isSolved(sim: SimGrid): boolean {
  for (const cell of sim.cells.values()) {
    if (cell.visualState === CellVisualState.COVERED) return false;
  }
  return true;
}

/** Reveal a single clue's host cell on the sim grid. Returns the deduction describing the reveal. */
function revealClue(sim: SimGrid, clueId: ClueId): Deduction | null {
  const parsed = parseClueId(clueId);
  if (parsed.type === 'neighbor') {
    const key = coordKey(parsed.coord);
    const cell = sim.cells.get(key);
    if (cell && cell.visualState === CellVisualState.COVERED) {
      sim.cells.set(key, { ...cell, visualState: CellVisualState.OPEN_EMPTY });
      return {
        coord: parsed.coord,
        result: 'empty',
        reason: { clueIds: [clueId], explanation: `hint revealed — shows ${cell.neighborClueValue} filled neighbors` },
      };
    }
  } else if (parsed.type === 'flower') {
    const key = coordKey(parsed.coord);
    const cell = sim.cells.get(key);
    if (cell && cell.visualState === CellVisualState.COVERED) {
      sim.cells.set(key, { ...cell, visualState: CellVisualState.MARKED_FILLED });
      if (cell.groundTruth === CellGroundTruth.FILLED) sim.remainingCount--;
      return {
        coord: parsed.coord,
        result: 'filled',
        reason: { clueIds: [clueId], explanation: `hint revealed — shows ${cell.flowerClueValue} filled nearby` },
      };
    }
  }
  // Line and global clues don't reveal cells
  return null;
}

/**
 * Find a clue that, when revealed, enables at least one new deduction.
 * Tries each candidate on a clone of the sim and picks the one that
 * unblocks the most deductions.
 */
function findBestClue(
  sim: SimGrid,
  visibleClues: Set<ClueId>,
  candidates: ClueId[],
  tier: SolveTier,
): ClueId | null {
  let bestClue: ClueId | null = null;
  let bestCount = 0;

  for (const clueId of candidates) {
    if (visibleClues.has(clueId)) continue;

    // Clone sim, reveal this clue, try solving
    const testCells = new Map<string, HexCell>();
    for (const [k, c] of sim.cells) testCells.set(k, { ...c });
    const testSim: SimGrid = { cells: testCells, lineClues: sim.lineClues, remainingCount: sim.remainingCount };

    // Reveal the clue
    const parsed = parseClueId(clueId);
    if (parsed.type === 'neighbor') {
      const key = coordKey(parsed.coord);
      const cell = testSim.cells.get(key);
      if (cell && cell.visualState === CellVisualState.COVERED) {
        testSim.cells.set(key, { ...cell, visualState: CellVisualState.OPEN_EMPTY });
      }
    } else if (parsed.type === 'flower') {
      const key = coordKey(parsed.coord);
      const cell = testSim.cells.get(key);
      if (cell && cell.visualState === CellVisualState.COVERED) {
        testSim.cells.set(key, { ...cell, visualState: CellVisualState.MARKED_FILLED });
        if (cell.groundTruth === CellGroundTruth.FILLED) testSim.remainingCount--;
      }
    }
    // Line and global clues don't reveal cells — no sim change needed

    const testVisible = new Set(visibleClues);
    testVisible.add(clueId);
    const deductions = solve(testSim as unknown as HexGrid, testVisible, tier);

    if (deductions.length > bestCount) {
      bestCount = deductions.length;
      bestClue = clueId;
    }
  }

  return bestClue;
}

/**
 * Solve a puzzle progressively: start with no clues, reveal them one at a
 * time as the solver gets stuck, interleaving clue reveals with deductions.
 *
 * Each step in the output replay is a single cell change (either a clue
 * reveal or a deduction), making it ideal for step-by-step visualization.
 */
export function solveProgressively(
  grid: HexGrid,
  tier: SolveTier,
): SolveReplay {
  const sim = cloneSimGrid(grid);
  coverAll(sim);

  // Global remaining is always visible — only used by advanced tier via solve().
  // Full line: clues are excluded — the solver works with lineseg: for granular control.
  const candidates = Array.from(allClueIds(grid)).filter(id => !id.startsWith('line:'));
  const visibleClues = new Set<ClueId>();
  if (tier === 'advanced') {
    visibleClues.add(GLOBAL_REMAINING_ID);
  }
  const steps: SolveStep[] = [];
  const maxIterations = grid.cells.size * 2; // safety bound

  for (let iter = 0; iter < maxIterations; iter++) {
    if (isSolved(sim)) break;

    // Try to deduce with current visible clues
    const deductions = solve(sim as unknown as HexGrid, visibleClues, tier);

    if (deductions.length > 0) {
      // Record each deduction as its own step
      for (const d of deductions) {
        const key = coordKey(d.coord);
        const cell = sim.cells.get(key);
        if (!cell || cell.visualState !== CellVisualState.COVERED) continue;
        if (d.result === 'filled') {
          sim.cells.set(key, { ...cell, visualState: CellVisualState.MARKED_FILLED });
          if (cell.groundTruth === CellGroundTruth.FILLED) sim.remainingCount--;
          // Marking a cell as filled reveals its flower clue
          if (cell.flowerClueValue !== null) visibleClues.add(flowerClueId(d.coord));
        } else {
          sim.cells.set(key, { ...cell, visualState: CellVisualState.OPEN_EMPTY });
          // Opening an empty cell reveals its neighbor clue
          if (cell.neighborClueValue !== null) visibleClues.add(neighborClueId(d.coord));
        }
        steps.push({
          deductions: [d],
          boardState: snapshotBoardState(sim.cells),
          visibleClues: new Set(visibleClues),
        });
      }
      continue;
    }

    // Stuck — find a clue to reveal
    const bestClue = findBestClue(sim, visibleClues, candidates, tier);
    if (bestClue === null) break; // No clue helps — truly stuck

    visibleClues.add(bestClue);
    const revealDeduction = revealClue(sim, bestClue);
    if (revealDeduction) {
      // Cell-based clue reveal (neighbor/flower)
      steps.push({
        deductions: [revealDeduction],
        boardState: snapshotBoardState(sim.cells),
        visibleClues: new Set(visibleClues),
      });
    } else {
      // Non-cell clue (line or lineseg) — record activation as a step with no cell change
      const parsed = parseClueId(bestClue);
      // Only line and lineseg clues reach here (global is pre-added, not a candidate)
      const parsed2 = parsed as { type: 'line' | 'lineseg'; axis: string; coord: import('../model/hex-coord').HexCoord; segIndex?: number };
      const explanation = parsed2.type === 'lineseg'
        ? `Solver activated ${parsed2.axis} segment ${parsed2.segIndex} at (${coordKey(parsed2.coord)})`
        : `Solver activated ${parsed2.axis} line clue at (${coordKey(parsed2.coord)})`;
      const stepCoord = parsed2.coord;
      steps.push({
        deductions: [{
          coord: stepCoord,
          result: 'empty',
          reason: { clueIds: [bestClue], explanation },
        }],
        boardState: snapshotBoardState(sim.cells),
        visibleClues: new Set(visibleClues),
      });
    }
  }

  // Check for stuck cells
  const stuckCells = new Set<string>();
  for (const [key, cell] of sim.cells) {
    if (cell.visualState === CellVisualState.COVERED) stuckCells.add(key);
  }

  return {
    steps,
    stuck: stuckCells.size > 0,
    stuckCells: stuckCells.size > 0 ? stuckCells : undefined,
  };
}
