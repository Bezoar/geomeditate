import type { HexGrid } from '../model/hex-grid';
import { CellVisualState } from '../model/hex-cell';
import { toPixel } from '../model/hex-coord';
import type { LineAxis } from '../model/hex-coord';
import { formatNeighborClue } from '../clues/neighbor';
import type { LineClue } from '../clues/line';

const RADIUS = 24;
const SVG_NS = 'http://www.w3.org/2000/svg';

function createTextElement(
  x: number,
  y: number,
  content: string,
  fill: string,
  fontSize: number,
  rotation?: number,
): SVGTextElement {
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', String(x));
  text.setAttribute('y', String(y));
  text.setAttribute('fill', fill);
  text.setAttribute('font-size', String(fontSize));
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('font-weight', 'bold');
  if (rotation) {
    text.setAttribute('transform', `rotate(${rotation}, ${x}, ${y})`);
  }
  text.textContent = content;
  return text;
}

/**
 * Compute a pixel offset that points in the reverse direction of the line axis,
 * placing the label just outside the grid before the start cell.
 */
function lineClueOffset(axis: LineAxis): { dx: number; dy: number; rotation: number } {
  const rowStep = RADIUS * Math.sqrt(3);
  const colStep = RADIUS * 1.5;

  switch (axis) {
    case 'vertical':
      return { dx: 0, dy: -rowStep * 0.65, rotation: 0 };
    case 'ascending':
      // Upper-right edge, text parallel to edge
      return { dx: colStep * 0.65, dy: -rowStep * 0.325, rotation: 60 };
    case 'descending':
      // Upper-left edge, text parallel to edge
      return { dx: -colStep * 0.65, dy: -rowStep * 0.325, rotation: -60 };
  }
}

/** Check if a pixel position overlaps any cell in the grid. */
function overlapsCell(
  lx: number,
  ly: number,
  grid: HexGrid,
): boolean {
  for (const cell of grid.cells.values()) {
    const { x, y } = toPixel(cell.coord, RADIUS);
    const dx = lx - x;
    const dy = ly - y;
    if (dx * dx + dy * dy < RADIUS * RADIUS) return true;
  }
  return false;
}

export function renderClues(grid: HexGrid, svgContainer: SVGElement, contiguityEnabled: boolean = true): void {
  // Render cell clues (neighbor and flower)
  for (const cell of grid.cells.values()) {
    const { x, y } = toPixel(cell.coord, RADIUS);

    if (
      cell.visualState === CellVisualState.OPEN_EMPTY &&
      cell.neighborClueValue !== null &&
      cell.neighborClueNotation !== null
    ) {
      const label = formatNeighborClue(
        cell.neighborClueValue,
        cell.neighborClueNotation,
        contiguityEnabled,
      );
      svgContainer.appendChild(
        createTextElement(x, y, label, '#ffffff', 10),
      );
    }

    if (
      cell.visualState === CellVisualState.MARKED_FILLED &&
      cell.flowerClueValue !== null
    ) {
      svgContainer.appendChild(
        createTextElement(x, y, String(cell.flowerClueValue), '#ffffff', 10),
      );
    }
  }

  // Render line clues — skip labels that overlap cells or other labels
  const labelPositions: Array<{ x: number; y: number }> = [];
  const LABEL_MIN_DIST = RADIUS * 0.6;

  for (const clue of grid.lineClues) {
    // For ascending lines, anchor at the top (last cell); others at start
    const anchorCoord =
      clue.axis === 'ascending'
        ? clue.cells[clue.cells.length - 1]
        : clue.startCoord;

    const { x, y } = toPixel(anchorCoord, RADIUS);
    const { dx, dy, rotation } = lineClueOffset(clue.axis);
    const lx = x + dx;
    const ly = y + dy;

    // Skip if overlapping an occupied cell
    if (overlapsCell(lx, ly, grid)) continue;

    // Skip if overlapping a previously placed label
    const tooClose = labelPositions.some(p => {
      const px = lx - p.x;
      const py = ly - p.y;
      return px * px + py * py < LABEL_MIN_DIST * LABEL_MIN_DIST;
    });
    if (tooClose) continue;

    labelPositions.push({ x: lx, y: ly });
    const lineLabel = formatNeighborClue(clue.value, clue.notation, contiguityEnabled);
    svgContainer.appendChild(
      createTextElement(lx, ly, lineLabel, '#95a5a6', 10, rotation),
    );
  }
}
