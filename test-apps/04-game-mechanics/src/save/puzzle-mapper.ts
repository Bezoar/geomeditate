import type { PuzzleDef, CluesDef, NeighborClueDef, LineClueDef } from './types';
import type { HexGrid } from '../model/hex-grid';
import type { LineClue } from '../clues/line';
import { CellGroundTruth, type HexCell } from '../model/hex-cell';
import { coordKey, parseCoordKey } from '../model/hex-coord';
import { encodeGridString, decodeGridString } from './grid-string';
import { HexGrid as HexGridClass } from '../model/hex-grid';

function groundTruthChar(cell: HexCell): string {
  return cell.groundTruth === CellGroundTruth.FILLED ? 'F' : 'E';
}

function lineClueKey(clue: LineClue): string {
  return `${clue.axis.charAt(0)}:${coordKey(clue.startCoord)}`;
}

export function serializePuzzle(
  grid: HexGrid,
  name: string,
  description: string,
): PuzzleDef {
  // Encode ground truth
  const gtCells = new Map<string, string>();
  for (const [key, cell] of grid.cells) {
    gtCells.set(key, groundTruthChar(cell));
  }
  const groundTruth = encodeGridString(grid.width, grid.height, gtCells, '.');

  // Collect non-default clue state (sparse)
  const neighborOverrides: Record<string, NeighborClueDef> = {};
  for (const cell of grid.cells.values()) {
    if (cell.neighborClueValue !== null && !cell.contiguityEnabled) {
      neighborOverrides[coordKey(cell.coord)] = { contiguity: false };
    }
  }

  const lineOverrides: Record<string, LineClueDef> = {};
  for (const clue of grid.lineClues) {
    if (!clue.contiguityEnabled) {
      lineOverrides[lineClueKey(clue)] = { contiguity: false };
    }
  }

  const hasOverrides = Object.keys(neighborOverrides).length > 0 ||
                       Object.keys(lineOverrides).length > 0;

  const clues: CluesDef | null = hasOverrides
    ? {
        neighbors: Object.keys(neighborOverrides).length > 0 ? neighborOverrides : undefined,
        lines: Object.keys(lineOverrides).length > 0 ? lineOverrides : undefined,
      }
    : null;

  return {
    name,
    description: description || undefined,
    grid: {
      width: grid.width,
      height: grid.height,
      groundTruth,
    },
    clues,
  };
}

export function deserializePuzzle(puzzle: PuzzleDef): HexGrid {
  const decoded = decodeGridString(puzzle.grid.groundTruth);

  const filledCoords: Array<{ col: number; row: number }> = [];
  const missingCoords: Array<{ col: number; row: number }> = [];

  for (const [key, char] of decoded) {
    const coord = parseCoordKey(key);
    if (char === '.') {
      missingCoords.push(coord);
    } else if (char === 'F') {
      filledCoords.push(coord);
    }
    // 'E' cells are created by default (not filled, not missing)
  }

  const grid = new HexGridClass({
    name: puzzle.name,
    description: puzzle.description ?? '',
    width: puzzle.grid.width,
    height: puzzle.grid.height,
    filledCoords,
    missingCoords,
  });
  grid.computeAllClues();

  // Apply clue overrides
  if (puzzle.clues?.neighbors) {
    for (const [key, def] of Object.entries(puzzle.clues.neighbors)) {
      const cell = grid.cells.get(key);
      if (cell && def.contiguity === false) {
        grid.cells.set(key, { ...cell, contiguityEnabled: false });
      }
    }
  }

  if (puzzle.clues?.lines) {
    for (const [key, def] of Object.entries(puzzle.clues.lines)) {
      if (def.contiguity === false) {
        const idx = grid.lineClues.findIndex((lc: LineClue) => lineClueKey(lc) === key);
        if (idx !== -1) {
          grid.lineClues[idx] = { ...grid.lineClues[idx], contiguityEnabled: false };
        }
      }
    }
  }

  return grid;
}
