import type { HexCoord, LineAxis } from '../model/hex-coord';
import { coordKey, parseCoordKey, neighbors, radius2Positions } from '../model/hex-coord';
import { CellVisualState, type HexCell } from '../model/hex-cell';
import type { LineClue } from '../clues/line';

/** Identifies a specific clue instance. */
export type ClueId = string;

export function neighborClueId(coord: HexCoord): ClueId {
  return `neighbor:${coordKey(coord)}`;
}

export function flowerClueId(coord: HexCoord): ClueId {
  return `flower:${coordKey(coord)}`;
}

export function lineClueId(axis: LineAxis, startCoord: HexCoord): ClueId {
  return `line:${axis}:${coordKey(startCoord)}`;
}

export const GLOBAL_REMAINING_ID: ClueId = 'global:remaining';

export type ParsedClueId =
  | { type: 'neighbor'; coord: HexCoord }
  | { type: 'flower'; coord: HexCoord }
  | { type: 'line'; axis: LineAxis; coord: HexCoord }
  | { type: 'global' };

export function parseClueId(id: ClueId): ParsedClueId {
  if (id === GLOBAL_REMAINING_ID) return { type: 'global' };
  if (id.startsWith('neighbor:')) {
    return { type: 'neighbor', coord: parseCoordKey(id.slice('neighbor:'.length)) };
  }
  if (id.startsWith('flower:')) {
    return { type: 'flower', coord: parseCoordKey(id.slice('flower:'.length)) };
  }
  if (id.startsWith('line:')) {
    const rest = id.slice('line:'.length);
    const colonIdx = rest.indexOf(':');
    const axis = rest.slice(0, colonIdx) as LineAxis;
    const coord = parseCoordKey(rest.slice(colonIdx + 1));
    return { type: 'line', axis, coord };
  }
  throw new Error(`Unknown clue ID format: ${id}`);
}

/** Why a deduction was made. */
export interface DeductionReason {
  /** Which clue(s) produced this deduction. */
  clueIds: ClueId[];
  /** Human-readable explanation. */
  explanation: string;
}

/** A single logical deduction: this cell must be filled or empty. */
export interface Deduction {
  coord: HexCoord;
  result: 'filled' | 'empty';
  reason: DeductionReason;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given a list of candidate positions and the cell map, count MARKED_FILLED
 * and COVERED cells that are present in the map.
 */
function countStates(positions: HexCoord[], cellMap: Map<string, HexCell>): {
  markedFilled: number;
  covered: HexCoord[];
} {
  let markedFilled = 0;
  const covered: HexCoord[] = [];
  for (const pos of positions) {
    const cell = cellMap.get(coordKey(pos));
    if (cell === undefined) continue;
    if (cell.visualState === CellVisualState.MARKED_FILLED) {
      markedFilled++;
    } else if (cell.visualState === CellVisualState.COVERED) {
      covered.push(pos);
    }
  }
  return { markedFilled, covered };
}

/**
 * Apply the all-filled / all-empty deduction logic:
 * - If clueValue == markedFilled → all covered are empty
 * - If (clueValue - markedFilled) == covered.length → all covered are filled
 * - Otherwise → []
 */
function applyDeduction(
  clueValue: number,
  markedFilled: number,
  covered: HexCoord[],
  clueId: ClueId,
  explanation: (result: 'filled' | 'empty') => string,
): Deduction[] {
  if (covered.length === 0) return [];
  const reason = (result: 'filled' | 'empty'): DeductionReason => ({
    clueIds: [clueId],
    explanation: explanation(result),
  });
  if (clueValue === markedFilled) {
    return covered.map((coord) => ({ coord, result: 'empty', reason: reason('empty') }));
  }
  if (clueValue - markedFilled === covered.length) {
    return covered.map((coord) => ({ coord, result: 'filled', reason: reason('filled') }));
  }
  return [];
}

// ─── Deduction functions ──────────────────────────────────────────────────────

/**
 * Examine a neighbor clue on an OPEN_EMPTY cell and return deductions.
 *
 * The clue is only visible when the cell's visual state is OPEN_EMPTY.
 * Returns [] if the cell is COVERED or any other non-open state.
 */
export function deduceFromNeighborClue(
  coord: HexCoord,
  clueValue: number,
  cellMap: Map<string, HexCell>,
): Deduction[] {
  const cell = cellMap.get(coordKey(coord));
  if (cell === undefined || cell.visualState !== CellVisualState.OPEN_EMPTY) return [];

  const { markedFilled, covered } = countStates(neighbors(coord), cellMap);
  const id = neighborClueId(coord);
  const ck = coordKey(coord);
  return applyDeduction(clueValue, markedFilled, covered, id, (result) =>
    result === 'empty'
      ? `(${ck}) shows ${clueValue} filled neighbors, ${markedFilled} already found → rest are empty`
      : `(${ck}) shows ${clueValue} filled neighbors, ${markedFilled} found, ${covered.length} covered → all must be filled`,
  );
}

/**
 * Examine a flower clue on a MARKED_FILLED cell and return deductions.
 *
 * The clue is only visible when the cell's visual state is MARKED_FILLED.
 * Returns [] otherwise.
 */
export function deduceFromFlowerClue(
  coord: HexCoord,
  clueValue: number,
  cellMap: Map<string, HexCell>,
): Deduction[] {
  const cell = cellMap.get(coordKey(coord));
  if (cell === undefined || cell.visualState !== CellVisualState.MARKED_FILLED) return [];

  const { markedFilled, covered } = countStates(radius2Positions(coord), cellMap);
  const id = flowerClueId(coord);
  const ck = coordKey(coord);
  return applyDeduction(clueValue, markedFilled, covered, id, (result) =>
    result === 'empty'
      ? `Flower at (${ck}) shows ${clueValue} filled in radius 2, ${markedFilled} already found → rest are empty`
      : `Flower at (${ck}) shows ${clueValue} filled in radius 2, ${markedFilled} found, ${covered.length} covered → all must be filled`,
  );
}

/**
 * Examine a line clue and return deductions.
 *
 * The line clue is always visible (the puzzle board shows it regardless of cell states).
 */
export function deduceFromLineClue(lineClue: LineClue, cellMap: Map<string, HexCell>): Deduction[] {
  const { markedFilled, covered } = countStates(lineClue.cells, cellMap);
  const id = lineClueId(lineClue.axis, lineClue.startCoord);
  return applyDeduction(lineClue.value, markedFilled, covered, id, (result) =>
    result === 'empty'
      ? `${lineClue.axis} line shows ${lineClue.value} filled, ${markedFilled} already found → rest are empty`
      : `${lineClue.axis} line shows ${lineClue.value} filled, ${markedFilled} found, ${covered.length} covered → all must be filled`,
  );
}

/**
 * Use the global remaining-filled count to deduce cell states.
 *
 * - If remaining == 0 → all covered cells are empty
 * - If remaining == total covered → all covered cells are filled
 * - Otherwise → []
 */
export function deduceFromGlobalRemaining(
  remainingCount: number,
  cellMap: Map<string, HexCell>,
): Deduction[] {
  const covered: HexCoord[] = [];
  for (const cell of cellMap.values()) {
    if (cell.visualState === CellVisualState.COVERED) {
      covered.push(cell.coord);
    }
  }
  return applyDeduction(remainingCount, 0, covered, GLOBAL_REMAINING_ID, (result) =>
    result === 'empty'
      ? `${remainingCount} filled remaining, 0 needed → all covered are empty`
      : `${remainingCount} filled remaining = ${covered.length} covered → all must be filled`,
  );
}
