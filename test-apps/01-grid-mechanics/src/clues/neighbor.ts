import type { HexCoord } from '../model/hex-coord';
import { coordKey, neighbors } from '../model/hex-coord';
import { CellGroundTruth, ClueNotation, type HexCell } from '../model/hex-cell';

export function computeNeighborClue(coord: HexCoord, cellMap: Map<string, HexCell>): number {
  let count = 0;
  for (const n of neighbors(coord)) {
    const cell = cellMap.get(coordKey(n));
    if (cell && cell.groundTruth === CellGroundTruth.FILLED) {
      count++;
    }
  }
  return count;
}

export function computeContiguity(coord: HexCoord, cellMap: Map<string, HexCell>): ClueNotation {
  const filledNeighbors: HexCoord[] = [];
  for (const n of neighbors(coord)) {
    const cell = cellMap.get(coordKey(n));
    if (cell && cell.groundTruth === CellGroundTruth.FILLED) {
      filledNeighbors.push(n);
    }
  }

  if (filledNeighbors.length <= 1) {
    return ClueNotation.PLAIN;
  }

  // BFS among filled neighbors; two are connected if they are hex-neighbors of each other
  const filledKeys = new Set(filledNeighbors.map(coordKey));
  const visited = new Set<string>();
  const queue: HexCoord[] = [filledNeighbors[0]];
  visited.add(coordKey(filledNeighbors[0]));

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const adj of neighbors(current)) {
      const key = coordKey(adj);
      if (filledKeys.has(key) && !visited.has(key)) {
        visited.add(key);
        queue.push(adj);
      }
    }
  }

  return visited.size === filledNeighbors.length
    ? ClueNotation.CONTIGUOUS
    : ClueNotation.DISCONTIGUOUS;
}

export function formatNeighborClue(value: number, notation: ClueNotation, contiguityEnabled: boolean = true): string {
  if (notation === ClueNotation.NO_CLUE) {
    return '?';
  }
  if (!contiguityEnabled || notation === ClueNotation.PLAIN) {
    return String(value);
  }
  switch (notation) {
    case ClueNotation.CONTIGUOUS:
      return `{${value}}`;
    case ClueNotation.DISCONTIGUOUS:
      return `-${value}-`;
  }
}
