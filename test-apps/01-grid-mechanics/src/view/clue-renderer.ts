import type { HexGrid } from '../model/hex-grid';
import { CellVisualState } from '../model/hex-cell';
import { toPixel } from '../model/hex-coord';
import type { LineAxis } from '../model/hex-coord';
import { formatNeighborClue } from '../clues/neighbor';

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
      // Upper-right edge slopes at 60°, offset along edge normal to match vertical gap
      return { dx: colStep * 0.65, dy: -rowStep * 0.325, rotation: 60 };
    case 'descending':
      // Upper-left edge slopes at -60°, offset along edge normal to match vertical gap
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

export function renderClues(grid: HexGrid, svgContainer: SVGElement): void {
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

  // Render line clues — only where the label lands on an unoccupied hex position
  for (const clue of grid.lineClues) {
    // For ascending lines, anchor at the top (last cell); others at start
    const anchorCoord =
      clue.axis === 'ascending'
        ? clue.cells[clue.cells.length - 1]
        : clue.startCoord;

    const { x, y } = toPixel(anchorCoord, RADIUS);
    const { dx, dy, rotation } = lineClueOffset(clue.axis);

    // Skip if the label pixel position overlaps an occupied cell
    if (overlapsCell(x + dx, y + dy, grid)) continue;
    svgContainer.appendChild(
      createTextElement(x + dx, y + dy, String(clue.value), '#95a5a6', 10, rotation),
    );
  }
}
