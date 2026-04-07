import type { HexGrid } from '../../model/hex-grid';
import type { VisibleClueSet } from '../visible-clues';
import type { ForcedCell } from '../types';
import { CellVisualState } from '../../model/hex-cell';
import { neighbors, coordKey, parseCoordKey, radius2Positions } from '../../model/hex-coord';

interface ClueConstraint {
  clueId: string;
  candidates: Set<string>;
  mustBeFilled: number;
}

function gatherConstraints(grid: HexGrid, vcs: VisibleClueSet): ClueConstraint[] {
  const constraints: ClueConstraint[] = [];

  for (const [key, clue] of vcs.neighborClues) {
    const coord = parseCoordKey(key);
    const candidates = new Set<string>();
    let marked = 0;
    for (const n of neighbors(coord)) {
      const nk = coordKey(n);
      const cell = grid.cells.get(nk);
      if (!cell) continue;
      if (cell.visualState === CellVisualState.COVERED) candidates.add(nk);
      else if (cell.visualState === CellVisualState.MARKED_FILLED) marked++;
    }
    const remaining = clue.value - marked;
    if (remaining >= 0 && candidates.size > 0) {
      constraints.push({ clueId: key, candidates, mustBeFilled: remaining });
    }
  }

  for (const [key, clue] of vcs.flowerClues) {
    const coord = parseCoordKey(key);
    const candidates = new Set<string>();
    let marked = 0;
    for (const pos of radius2Positions(coord)) {
      const pk = coordKey(pos);
      const cell = grid.cells.get(pk);
      if (!cell) continue;
      if (cell.visualState === CellVisualState.COVERED) candidates.add(pk);
      else if (cell.visualState === CellVisualState.MARKED_FILLED) marked++;
    }
    const remaining = clue.value - marked;
    if (remaining >= 0 && candidates.size > 0) {
      constraints.push({ clueId: key, candidates, mustBeFilled: remaining });
    }
  }

  for (const [segId, { segment }] of vcs.lineSegments) {
    const candidates = new Set<string>();
    let marked = 0;
    for (const c of segment.cells) {
      const ck = coordKey(c);
      const cell = grid.cells.get(ck);
      if (!cell) continue;
      if (cell.visualState === CellVisualState.COVERED) candidates.add(ck);
      else if (cell.visualState === CellVisualState.MARKED_FILLED) marked++;
    }
    const remaining = segment.value - marked;
    if (remaining >= 0 && candidates.size > 0) {
      constraints.push({ clueId: segId, candidates, mustBeFilled: remaining });
    }
  }

  return constraints;
}

export function setReasoningStrategy(grid: HexGrid, vcs: VisibleClueSet): ForcedCell[] {
  const constraints = gatherConstraints(grid, vcs);
  const forced: ForcedCell[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < constraints.length; i++) {
    for (let j = 0; j < constraints.length; j++) {
      if (i === j) continue;
      const a = constraints[i];
      const b = constraints[j];

      // Check if A's candidates are a proper subset of B's candidates
      if (a.candidates.size >= b.candidates.size) continue;

      let aSubsetOfB = true;
      for (const ck of a.candidates) {
        if (!b.candidates.has(ck)) {
          aSubsetOfB = false;
          break;
        }
      }
      if (!aSubsetOfB) continue;

      const diffFilled = b.mustBeFilled - a.mustBeFilled;
      const diffCells: string[] = [];
      for (const ck of b.candidates) {
        if (!a.candidates.has(ck)) diffCells.push(ck);
      }

      if (diffFilled < 0 || diffFilled > diffCells.length) continue;

      if (diffFilled === 0) {
        for (const ck of diffCells) {
          if (!seen.has(ck)) {
            forced.push({
              coord: ck,
              identity: 'empty',
              clueId: `${a.clueId}\u2282${b.clueId}`,
              deductionType: 'set-reasoning',
            });
            seen.add(ck);
          }
        }
      } else if (diffFilled === diffCells.length) {
        for (const ck of diffCells) {
          if (!seen.has(ck)) {
            forced.push({
              coord: ck,
              identity: 'filled',
              clueId: `${a.clueId}\u2282${b.clueId}`,
              deductionType: 'set-reasoning',
            });
            seen.add(ck);
          }
        }
      }
    }
  }

  return forced;
}
