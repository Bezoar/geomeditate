import type { HexGrid } from '../../model/hex-grid';
import type { VisibleClueSet } from '../visible-clues';
import type { ForcedCell } from '../types';
import { CellVisualState } from '../../model/hex-cell';
import { neighbors, coordKey, parseCoordKey, radius2Positions } from '../../model/hex-coord';

export function propagationStrategy(grid: HexGrid, vcs: VisibleClueSet): ForcedCell[] {
  const constrainedCells = new Set<string>();

  for (const [key] of vcs.neighborClues) {
    const coord = parseCoordKey(key);
    for (const n of neighbors(coord)) {
      const nk = coordKey(n);
      const cell = grid.cells.get(nk);
      if (cell && cell.visualState === CellVisualState.COVERED) {
        constrainedCells.add(nk);
      }
    }
  }

  for (const [key] of vcs.flowerClues) {
    const coord = parseCoordKey(key);
    for (const pos of radius2Positions(coord)) {
      const pk = coordKey(pos);
      const cell = grid.cells.get(pk);
      if (cell && cell.visualState === CellVisualState.COVERED) {
        constrainedCells.add(pk);
      }
    }
  }

  for (const [, { segment }] of vcs.lineSegments) {
    for (const c of segment.cells) {
      const ck = coordKey(c);
      const cell = grid.cells.get(ck);
      if (cell && cell.visualState === CellVisualState.COVERED) {
        constrainedCells.add(ck);
      }
    }
  }

  for (const ck of constrainedCells) {
    const cell = grid.cells.get(ck);
    if (!cell || cell.visualState !== CellVisualState.COVERED) continue;

    for (const hypothesis of ['filled', 'empty'] as const) {
      if (leadsToContradiction(grid, vcs, ck, hypothesis)) {
        const identity = hypothesis === 'filled' ? 'empty' : 'filled';
        return [{
          coord: ck,
          identity,
          clueId: 'propagation',
          deductionType: 'constraint-propagation',
        }];
      }
    }
  }

  return [];
}

function leadsToContradiction(
  grid: HexGrid,
  vcs: VisibleClueSet,
  cellKey: string,
  hypothesis: 'filled' | 'empty',
): boolean {
  const cell = grid.cells.get(cellKey);
  if (!cell) return false;

  const newVisual = hypothesis === 'filled'
    ? CellVisualState.MARKED_FILLED
    : CellVisualState.OPEN_EMPTY;
  const originalVisual = cell.visualState;
  grid.cells.set(cellKey, { ...cell, visualState: newVisual });

  let contradiction = false;

  for (const [key, clue] of vcs.neighborClues) {
    const coord = parseCoordKey(key);
    const nbrs = neighbors(coord);
    let covered = 0;
    let marked = 0;
    for (const n of nbrs) {
      const nk = coordKey(n);
      const nCell = grid.cells.get(nk);
      if (!nCell) continue;
      if (nCell.visualState === CellVisualState.COVERED) covered++;
      else if (nCell.visualState === CellVisualState.MARKED_FILLED) marked++;
    }
    const remaining = clue.value - marked;
    if (remaining < 0 || remaining > covered) {
      contradiction = true;
      break;
    }
  }

  if (!contradiction) {
    for (const [key, clue] of vcs.flowerClues) {
      const coord = parseCoordKey(key);
      const zone = radius2Positions(coord);
      let covered = 0;
      let marked = 0;
      for (const pos of zone) {
        const pk = coordKey(pos);
        const pCell = grid.cells.get(pk);
        if (!pCell) continue;
        if (pCell.visualState === CellVisualState.COVERED) covered++;
        else if (pCell.visualState === CellVisualState.MARKED_FILLED) marked++;
      }
      const remaining = clue.value - marked;
      if (remaining < 0 || remaining > covered) {
        contradiction = true;
        break;
      }
    }
  }

  if (!contradiction) {
    for (const [, { segment }] of vcs.lineSegments) {
      let covered = 0;
      let marked = 0;
      for (const c of segment.cells) {
        const ck = coordKey(c);
        const sc = grid.cells.get(ck);
        if (!sc) continue;
        if (sc.visualState === CellVisualState.COVERED) covered++;
        else if (sc.visualState === CellVisualState.MARKED_FILLED) marked++;
      }
      const remaining = segment.value - marked;
      if (remaining < 0 || remaining > covered) {
        contradiction = true;
        break;
      }
    }
  }

  grid.cells.set(cellKey, { ...cell, visualState: originalVisual });
  return contradiction;
}
