import type { HexCoord } from './hex-coord';
import { coordKey, neighbors, radius2Positions } from './hex-coord';
import {
  CellGroundTruth,
  CellVisualState,
  type HexCell,
  createCell,
  revealCell,
  openCell as openCellFn,
  markCell as markCellFn,
  recoverCell as recoverCellFn,
  toggleGroundTruth as toggleGroundTruthFn,
} from './hex-cell';
import { computeNeighborClue, computeContiguity } from '../clues/neighbor';
import { computeFlowerClue } from '../clues/flower';
import { computeAllLineClues, type LineClue } from '../clues/line';

export type { LineClue };

export interface TestGridConfig {
  name: string;
  description: string;
  width: number;
  height: number;
  filledCoords: HexCoord[];
  missingCoords: HexCoord[];
}

export class HexGrid {
  readonly width: number;
  readonly height: number;
  readonly cells: Map<string, HexCell>;
  lineClues: LineClue[];
  remainingCount: number;
  mistakeCount: number;

  constructor(config: TestGridConfig) {
    this.width = config.width;
    this.height = config.height;
    this.lineClues = [];
    this.remainingCount = 0;
    this.mistakeCount = 0;

    const filledSet = new Set(config.filledCoords.map(coordKey));
    const missingSet = new Set(config.missingCoords.map(coordKey));

    this.cells = new Map<string, HexCell>();
    for (let col = 0; col < config.width; col++) {
      for (let row = 0; row < config.height; row++) {
        const coord: HexCoord = { col, row };
        const key = coordKey(coord);
        if (missingSet.has(key)) continue;

        const groundTruth = filledSet.has(key)
          ? CellGroundTruth.FILLED
          : CellGroundTruth.EMPTY;
        const cell = revealCell(createCell(coord, groundTruth));
        this.cells.set(key, cell);
      }
    }
  }

  restart(): void {
    for (const [key, cell] of this.cells) {
      this.cells.set(key, revealCell(cell));
    }
    this.remainingCount = 0;
    this.mistakeCount = 0;
  }

  coverAll(): void {
    let filledCount = 0;
    for (const [key, cell] of this.cells) {
      this.cells.set(key, { ...cell, visualState: CellVisualState.COVERED });
      if (cell.groundTruth === CellGroundTruth.FILLED) filledCount++;
    }
    this.remainingCount = filledCount;
    this.mistakeCount = 0;
  }

  openCell(coord: HexCoord): void {
    const key = coordKey(coord);
    const cell = this.cells.get(key);
    if (!cell) return;

    const result = openCellFn(cell);
    if (result.isMistake) {
      this.mistakeCount++;
      return; // mistake: cell stays covered
    }
    if (result.cell === cell) return; // no-op

    this.cells.set(key, result.cell);
  }

  markCell(coord: HexCoord): void {
    const key = coordKey(coord);
    const cell = this.cells.get(key);
    if (!cell) return;

    const result = markCellFn(cell);
    if (result.isMistake) {
      this.mistakeCount++;
      return; // mistake: cell stays covered
    }
    if (result.cell === cell) return; // no-op

    this.cells.set(key, result.cell);
    if (cell.groundTruth === CellGroundTruth.FILLED) this.remainingCount--;
  }

  recoverCell(coord: HexCoord): void {
    const key = coordKey(coord);
    const cell = this.cells.get(key);
    if (!cell) return;

    const recovered = recoverCellFn(cell);
    if (recovered === cell) return; // no-op

    this.cells.set(key, recovered);
    // If re-covering a FILLED cell that was MARKED_FILLED, it's no longer found
    if (cell.groundTruth === CellGroundTruth.FILLED &&
        cell.visualState === CellVisualState.MARKED_FILLED) {
      this.remainingCount++;
    }
  }

  toggleGroundTruth(coord: HexCoord): void {
    const key = coordKey(coord);
    const cell = this.cells.get(key);
    if (!cell) return;

    let toggled = toggleGroundTruthFn(cell);

    // If not covered, update visual state to match new ground truth
    if (toggled.visualState !== CellVisualState.COVERED) {
      toggled = revealCell(toggled);
    }

    this.cells.set(key, toggled);

    // Update remaining count: remaining = FILLED cells not yet MARKED_FILLED
    const wasRemaining = cell.groundTruth === CellGroundTruth.FILLED &&
                         cell.visualState !== CellVisualState.MARKED_FILLED;
    const nowRemaining = toggled.groundTruth === CellGroundTruth.FILLED &&
                         toggled.visualState !== CellVisualState.MARKED_FILLED;
    if (wasRemaining && !nowRemaining) this.remainingCount--;
    if (!wasRemaining && nowRemaining) this.remainingCount++;

    // Targeted clue recomputation for affected cells
    this.recomputeCluesAround(coord);
  }

  toggleMissing(coord: HexCoord): void {
    const key = coordKey(coord);
    const cell = this.cells.get(key);

    if (cell) {
      // Cell exists — remove it (make missing)
      if (cell.groundTruth === CellGroundTruth.FILLED &&
          cell.visualState !== CellVisualState.MARKED_FILLED) {
        this.remainingCount--;
      }
      this.cells.delete(key);
      this.recomputeCluesAround(coord);
    } else {
      // Cell is missing — add it back as EMPTY, revealed
      const newCell = revealCell(createCell(coord, CellGroundTruth.EMPTY));
      this.cells.set(key, newCell);
      this.recomputeCluesAround(coord);
    }
  }

  private recomputeCluesAround(coord: HexCoord): void {
    // Recompute the changed cell's own clues
    this.recomputeCellClue(coord);

    // Recompute all neighbor cells' clues
    for (const n of neighbors(coord)) {
      this.recomputeCellClue(n);
    }

    // Recompute flower clues for all cells within 2-hex radius
    for (const r2 of radius2Positions(coord)) {
      const r2Key = coordKey(r2);
      const r2Cell = this.cells.get(r2Key);
      if (r2Cell && r2Cell.groundTruth === CellGroundTruth.FILLED) {
        const flowerValue = computeFlowerClue(r2, this.cells);
        this.cells.set(r2Key, { ...r2Cell, flowerClueValue: flowerValue });
      }
    }

    // Recompute all line clues
    this.lineClues = computeAllLineClues(this.cells);
  }

  private recomputeCellClue(coord: HexCoord): void {
    const key = coordKey(coord);
    const cell = this.cells.get(key);
    if (!cell) return;

    if (cell.groundTruth === CellGroundTruth.EMPTY) {
      const neighborValue = computeNeighborClue(coord, this.cells);
      const neighborNotation = computeContiguity(coord, this.cells);
      this.cells.set(key, {
        ...cell,
        neighborClueValue: neighborValue,
        neighborClueNotation: neighborNotation,
        flowerClueValue: null,
      });
    } else {
      const flowerValue = computeFlowerClue(coord, this.cells);
      this.cells.set(key, {
        ...cell,
        flowerClueValue: flowerValue,
        neighborClueValue: null,
        neighborClueNotation: null,
      });
    }
  }

  computeAllClues(): void {
    for (const [key, cell] of this.cells) {
      if (cell.groundTruth === CellGroundTruth.EMPTY) {
        const neighborValue = computeNeighborClue(cell.coord, this.cells);
        const neighborNotation = computeContiguity(cell.coord, this.cells);
        this.cells.set(key, {
          ...cell,
          neighborClueValue: neighborValue,
          neighborClueNotation: neighborNotation,
        });
      } else {
        const flowerValue = computeFlowerClue(cell.coord, this.cells);
        this.cells.set(key, {
          ...cell,
          flowerClueValue: flowerValue,
        });
      }
    }

    this.lineClues = computeAllLineClues(this.cells);
  }
}
