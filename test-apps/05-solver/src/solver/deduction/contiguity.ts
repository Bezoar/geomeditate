import type { HexGrid } from '../../model/hex-grid';
import type { VisibleClueSet } from '../visible-clues';
import type { ForcedCell } from '../types';
import { CellVisualState, ClueNotation } from '../../model/hex-cell';
import { neighbors, coordKey, parseCoordKey } from '../../model/hex-coord';
import type { HexCoord } from '../../model/hex-coord';

function findForcedByContiguity(
  centerCoord: HexCoord,
  allNeighborCoords: HexCoord[],
  alreadyMarked: Set<string>,
  candidates: string[],
  remaining: number,
  mustBeContiguous: boolean,
): Map<string, 'filled' | 'empty'> {
  const combos = combinations(candidates, remaining);
  const validCombos: string[][] = [];
  for (const combo of combos) {
    const allFilled = new Set([...alreadyMarked, ...combo]);
    if (checkContiguity(centerCoord, allNeighborCoords, allFilled) === mustBeContiguous) {
      validCombos.push(combo);
    }
  }

  if (validCombos.length === 0) return new Map();

  const result = new Map<string, 'filled' | 'empty'>();
  for (const ck of candidates) {
    const inAll = validCombos.every(combo => combo.includes(ck));
    const inNone = validCombos.every(combo => !combo.includes(ck));
    if (inAll) result.set(ck, 'filled');
    else if (inNone) result.set(ck, 'empty');
  }

  return result;
}

function checkContiguity(
  _center: HexCoord,
  allNeighborCoords: HexCoord[],
  filledKeys: Set<string>,
): boolean {
  const filledNeighbors = allNeighborCoords.filter(n => filledKeys.has(coordKey(n)));
  if (filledNeighbors.length <= 1) return true;

  const filledSet = new Set(filledNeighbors.map(coordKey));
  const visited = new Set<string>();
  const queue: HexCoord[] = [filledNeighbors[0]];
  visited.add(coordKey(filledNeighbors[0]));

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const adj of neighbors(current)) {
      const key = coordKey(adj);
      if (filledSet.has(key) && !visited.has(key)) {
        visited.add(key);
        queue.push(adj);
      }
    }
  }

  return visited.size === filledNeighbors.length;
}

function combinations(items: string[], k: number): string[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const result: string[][] = [];
  for (let i = 0; i <= items.length - k; i++) {
    const rest = combinations(items.slice(i + 1), k - 1);
    for (const combo of rest) {
      result.push([items[i], ...combo]);
    }
  }
  return result;
}

export function contiguityStrategy(grid: HexGrid, vcs: VisibleClueSet): ForcedCell[] {
  const forced: ForcedCell[] = [];

  for (const [key, clue] of vcs.neighborClues) {
    if (!clue.contiguityEnabled) continue;
    const notation = clue.notation as string;
    if (notation !== ClueNotation.CONTIGUOUS && notation !== ClueNotation.DISCONTIGUOUS) continue;

    const coord = parseCoordKey(key);
    const nbrs = neighbors(coord);

    const markedKeys = new Set<string>();
    const candidateKeys: string[] = [];

    for (const n of nbrs) {
      const nk = coordKey(n);
      const nCell = grid.cells.get(nk);
      if (!nCell) continue;

      if (nCell.visualState === CellVisualState.MARKED_FILLED) {
        markedKeys.add(nk);
      } else if (nCell.visualState === CellVisualState.COVERED) {
        candidateKeys.push(nk);
      }
    }

    const remaining = clue.value - markedKeys.size;
    if (remaining <= 0 || candidateKeys.length === 0) continue;
    if (candidateKeys.length > 6) continue;

    const mustBeContiguous = notation === ClueNotation.CONTIGUOUS;
    const result = findForcedByContiguity(
      coord, nbrs, markedKeys, candidateKeys, remaining, mustBeContiguous,
    );

    for (const [ck, identity] of result) {
      forced.push({ coord: ck, identity, clueId: key, deductionType: 'contiguity' });
    }
  }

  return forced;
}
