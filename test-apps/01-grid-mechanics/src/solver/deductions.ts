import type { HexCoord, LineAxis } from '../model/hex-coord';
import { coordKey, parseCoordKey } from '../model/hex-coord';

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
