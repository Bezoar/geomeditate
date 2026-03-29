/**
 * Hex coordinate system for flat-top hexagons in offset-column layout.
 * Reference: docs/visual/hex-geometry.md
 */

export interface HexCoord {
  col: number;
  row: number;
}

export function coordKey(c: HexCoord): string {
  return `${c.col},${c.row}`;
}

export function parseCoordKey(key: string): HexCoord {
  const [col, row] = key.split(',').map(Number);
  return { col, row };
}

// Even-column-down offset neighbor tables (flat-top hex)
const EVEN_COL_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [+1, -1], // upper-right
  [+1,  0], // right
  [ 0, +1], // lower-right (below)
  [-1,  0], // lower-left
  [-1, -1], // left
  [ 0, -1], // upper-left
];

const ODD_COL_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [+1,  0], // upper-right
  [+1, +1], // right
  [ 0, +1], // lower-right (below)
  [-1, +1], // lower-left
  [-1,  0], // left
  [ 0, -1], // upper-left
];

export function neighbors(coord: HexCoord): HexCoord[] {
  const offsets = coord.col % 2 === 0 ? EVEN_COL_OFFSETS : ODD_COL_OFFSETS;
  return offsets.map(([dc, dr]) => ({ col: coord.col + dc, row: coord.row + dr }));
}

export type LineAxis = 'vertical' | 'ascending' | 'descending';

/**
 * Step one cell in a given axis direction.
 * - vertical: same column, row + 1
 * - ascending: upper-right neighbor (index 0 in offset table)
 * - descending: right neighbor (index 1 in offset table)
 */
export function stepInDirection(coord: HexCoord, axis: LineAxis): HexCoord {
  if (axis === 'vertical') {
    return { col: coord.col, row: coord.row + 1 };
  }
  const offsets = coord.col % 2 === 0 ? EVEN_COL_OFFSETS : ODD_COL_OFFSETS;
  if (axis === 'ascending') {
    // Upper-right direction
    const [dc, dr] = offsets[0];
    return { col: coord.col + dc, row: coord.row + dr };
  }
  // descending: right direction
  const [dc, dr] = offsets[1];
  return { col: coord.col + dc, row: coord.row + dr };
}

/**
 * Collect all cells along an axis starting from `start`, stepping forward
 * while the next cell exists in `cellKeys`.
 */
export function lineAlongAxis(
  start: HexCoord,
  axis: LineAxis,
  cellKeys: Set<string>,
): HexCoord[] {
  const result: HexCoord[] = [];
  let current = start;
  while (cellKeys.has(coordKey(current))) {
    result.push(current);
    current = stepInDirection(current, axis);
  }
  return result;
}

/**
 * All 18 cells within 2-hex radius of `center` (distance 1 and 2), excluding center.
 */
export function radius2Positions(center: HexCoord): HexCoord[] {
  const seen = new Set<string>();
  const result: HexCoord[] = [];
  const centerKey = coordKey(center);

  // Distance 1: direct neighbors
  const dist1 = neighbors(center);
  for (const n of dist1) {
    const key = coordKey(n);
    if (key !== centerKey && !seen.has(key)) {
      seen.add(key);
      result.push(n);
    }
  }

  // Distance 2: neighbors of neighbors
  for (const n1 of dist1) {
    for (const n2 of neighbors(n1)) {
      const key = coordKey(n2);
      if (key !== centerKey && !seen.has(key)) {
        seen.add(key);
        result.push(n2);
      }
    }
  }

  return result;
}

/**
 * Convert grid coordinate to pixel position for SVG rendering.
 * Flat-top hex, offset-column layout (even columns shifted down).
 */
export function toPixel(coord: HexCoord, radius: number): { x: number; y: number } {
  const colStep = radius * 1.5;
  const rowStep = radius * Math.sqrt(3);
  const halfRowOffset = rowStep / 2;

  const x = coord.col * colStep;
  const y = coord.row * rowStep + (coord.col % 2 === 1 ? halfRowOffset : 0);

  return { x, y };
}
