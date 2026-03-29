import type { HexCoord } from './hex-coord';

export enum CellGroundTruth {
  FILLED = 'FILLED',
  EMPTY = 'EMPTY',
}

export enum CellVisualState {
  COVERED = 'COVERED',
  OPEN_EMPTY = 'OPEN_EMPTY',
  MARKED_FILLED = 'MARKED_FILLED',
}

export enum ClueNotation {
  PLAIN = 'PLAIN',
  CONTIGUOUS = 'CONTIGUOUS',
  DISCONTIGUOUS = 'DISCONTIGUOUS',
  NO_CLUE = 'NO_CLUE',
}

export interface HexCell {
  coord: HexCoord;
  groundTruth: CellGroundTruth;
  visualState: CellVisualState;
  neighborClueValue: number | null;
  neighborClueNotation: ClueNotation | null;
  flowerClueValue: number | null;
}

export interface CellActionResult {
  cell: HexCell;
  isMistake: boolean;
}

export function createCell(coord: HexCoord, groundTruth: CellGroundTruth): HexCell {
  return {
    coord,
    groundTruth,
    visualState: CellVisualState.COVERED,
    neighborClueValue: null,
    neighborClueNotation: null,
    flowerClueValue: null,
  };
}

/** Reveal a cell according to its ground truth (for initial revealed state). */
export function revealCell(cell: HexCell): HexCell {
  const visualState =
    cell.groundTruth === CellGroundTruth.EMPTY
      ? CellVisualState.OPEN_EMPTY
      : CellVisualState.MARKED_FILLED;
  return { ...cell, visualState };
}

/**
 * Click (no modifiers): open a covered cell.
 * - Empty → OPEN_EMPTY (no mistake)
 * - Filled → MARKED_FILLED (mistake: player thought it was empty)
 * - Non-covered → no-op
 */
export function openCell(cell: HexCell): CellActionResult {
  if (cell.visualState !== CellVisualState.COVERED) {
    return { cell, isMistake: false };
  }
  if (cell.groundTruth === CellGroundTruth.EMPTY) {
    return {
      cell: { ...cell, visualState: CellVisualState.OPEN_EMPTY },
      isMistake: false,
    };
  }
  return {
    cell: { ...cell, visualState: CellVisualState.MARKED_FILLED },
    isMistake: true,
  };
}

/**
 * Shift+click: mark a covered cell as filled.
 * - Filled ground truth → MARKED_FILLED (no mistake)
 * - Empty ground truth → MARKED_FILLED (mistake: player thought it was filled)
 * - Non-covered → no-op
 */
export function markCell(cell: HexCell): CellActionResult {
  if (cell.visualState !== CellVisualState.COVERED) {
    return { cell, isMistake: false };
  }
  const isMistake = cell.groundTruth === CellGroundTruth.EMPTY;
  return {
    cell: { ...cell, visualState: CellVisualState.MARKED_FILLED },
    isMistake,
  };
}

/**
 * Shift+Option+click: return an open or marked cell to covered state.
 * Already-covered cells are a no-op.
 */
export function recoverCell(cell: HexCell): HexCell {
  if (cell.visualState === CellVisualState.COVERED) {
    return cell;
  }
  return { ...cell, visualState: CellVisualState.COVERED };
}

/**
 * Option+click: toggle ground truth between FILLED and EMPTY.
 * Visual state is preserved — caller must recompute clues and update display.
 */
export function toggleGroundTruth(cell: HexCell): HexCell {
  const newTruth =
    cell.groundTruth === CellGroundTruth.FILLED
      ? CellGroundTruth.EMPTY
      : CellGroundTruth.FILLED;
  return { ...cell, groundTruth: newTruth };
}
