import type { HexGrid } from '../model/hex-grid';
import type { LineClue } from '../clues/line';
import { CellVisualState } from '../model/hex-cell';
import { toPixel, stepInDirection } from '../model/hex-coord';
import type { HexCoord, LineAxis } from '../model/hex-coord';
import { formatNeighborClue } from '../clues/neighbor';
import {
  type LineClueState,
  getState,
  lineClueKey,
  toggleGuideLine,
  toggleDimmed,
  toggleInvisible,
} from './line-clue-state';

const RADIUS = 24;
const SVG_NS = 'http://www.w3.org/2000/svg';
const DIMMED_OPACITY = 0.3;

function createTextElement(
  x: number,
  y: number,
  content: string,
  fill: string,
  fontSize: number,
  rotation?: number,
  opacity?: number,
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
  if (opacity !== undefined) {
    text.setAttribute('opacity', String(opacity));
  }
  text.textContent = content;
  return text;
}

function lineClueOffset(axis: LineAxis): { dx: number; dy: number; rotation: number } {
  const rowStep = RADIUS * Math.sqrt(3);
  const colStep = RADIUS * 1.5;

  switch (axis) {
    case 'vertical':
      return { dx: 0, dy: -rowStep * 0.65, rotation: 0 };
    case 'ascending':
      return { dx: colStep * 0.65, dy: -rowStep * 0.325, rotation: 60 };
    case 'descending':
      return { dx: -colStep * 0.65, dy: -rowStep * 0.325, rotation: -60 };
  }
}

/** Check if a pixel position overlaps any cell in the grid. */
function overlapsCell(lx: number, ly: number, grid: HexGrid): boolean {
  for (const cell of grid.cells.values()) {
    const { x, y } = toPixel(cell.coord, RADIUS);
    const dx = lx - x;
    const dy = ly - y;
    if (dx * dx + dy * dy < RADIUS * RADIUS) return true;
  }
  return false;
}

/**
 * Compute the pixel center of the missing hex cell where a line clue label sits.
 * This is one step outside the grid from the anchor cell.
 */
function missingCellCenter(anchorCoord: HexCoord, axis: LineAxis): { x: number; y: number } {
  // The missing cell is one step in the reverse direction from the anchor
  // For vertical: (col, row - 1)
  // For descending: predecessor of anchor
  // For ascending: one step further ascending from the anchor (which is the last cell)
  let missingCoord: HexCoord;
  switch (axis) {
    case 'vertical':
      missingCoord = { col: anchorCoord.col, row: anchorCoord.row - 1 };
      break;
    case 'descending': {
      // Predecessor: one step back from the start
      const predIsEven = anchorCoord.col % 2 !== 0;
      missingCoord = predIsEven
        ? { col: anchorCoord.col - 1, row: anchorCoord.row }
        : { col: anchorCoord.col - 1, row: anchorCoord.row - 1 };
      break;
    }
    case 'ascending':
      // One step further ascending from the last cell
      missingCoord = stepInDirection(anchorCoord, 'ascending');
      break;
  }
  return toPixel(missingCoord, RADIUS);
}

/**
 * Build the triangle hit area polygon points for a line clue.
 * The triangle is in the MISSING cell where the label sits,
 * with the wedge pointing toward the grid.
 * (cx, cy) is the center of the missing hex cell.
 */
function clueHitTriangle(cx: number, cy: number, axis: LineAxis): string {
  const h = RADIUS * Math.sqrt(3) / 2;
  const v = [
    [RADIUS, 0],           // v0
    [RADIUS / 2, h],       // v1
    [-RADIUS / 2, h],      // v2
    [-RADIUS, 0],          // v3
    [-RADIUS / 2, -h],     // v4
    [RADIUS / 2, -h],      // v5
  ];

  // Triangle wedge pointing TOWARD the grid (opposite of the clue direction)
  let i1: number, i2: number;
  switch (axis) {
    case 'vertical':
      // Label is above grid → wedge points down: center → v1 → v2
      i1 = 1; i2 = 2;
      break;
    case 'descending':
      // Label is upper-left → wedge points lower-right: center → v0 → v1
      i1 = 0; i2 = 1;
      break;
    case 'ascending':
      // Label is upper-right → wedge points lower-left: center → v2 → v3
      i1 = 2; i2 = 3;
      break;
  }

  return [
    `${cx},${cy}`,
    `${cx + v[i1][0]},${cy + v[i1][1]}`,
    `${cx + v[i2][0]},${cy + v[i2][1]}`,
  ].join(' ');
}

/**
 * Render a guide line extending from the edge of the first cell
 * to the edge of the last cell along the line clue's axis.
 */
function renderGuideLine(
  clue: LineClue,
  svgContainer: SVGElement,
): void {
  if (clue.cells.length === 0) return;

  const first = toPixel(clue.cells[0], RADIUS);
  const last = toPixel(clue.cells[clue.cells.length - 1], RADIUS);

  // Apothem: distance from center to edge midpoint
  const apothem = RADIUS * Math.sqrt(3) / 2;

  let x1: number, y1: number, x2: number, y2: number;

  if (clue.cells.length === 1) {
    // Single cell: short line segment through center along axis direction
    if (clue.axis === 'vertical') {
      x1 = first.x; y1 = first.y - apothem;
      x2 = first.x; y2 = first.y + apothem;
    } else {
      // Diagonal: use axis direction vector
      const angle = clue.axis === 'ascending' ? -Math.PI / 3 : Math.PI / 3;
      x1 = first.x - Math.cos(angle) * apothem;
      y1 = first.y - Math.sin(angle) * apothem;
      x2 = first.x + Math.cos(angle) * apothem;
      y2 = first.y + Math.sin(angle) * apothem;
    }
  } else {
    // Direction vector from first to last cell
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len;
    const uy = dy / len;

    // Extend from first cell edge to last cell edge
    x1 = first.x - ux * apothem;
    y1 = first.y - uy * apothem;
    x2 = last.x + ux * apothem;
    y2 = last.y + uy * apothem;
  }

  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', String(x1));
  line.setAttribute('y1', String(y1));
  line.setAttribute('x2', String(x2));
  line.setAttribute('y2', String(y2));
  line.setAttribute('stroke', '#ffffff');
  line.setAttribute('stroke-opacity', '0.2');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-linecap', 'round');
  svgContainer.appendChild(line);
}

export interface LineClueInteraction {
  (clueKey: string, newState: LineClueState): void;
}

export function renderClues(
  grid: HexGrid,
  svgContainer: SVGElement,
  contiguityEnabled: boolean,
  lineClueStates: Map<string, LineClueState>,
  onLineClueInteraction?: LineClueInteraction,
): void {
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

  // Render line clues with display state
  const labelPositions: Array<{ x: number; y: number }> = [];
  const LABEL_MIN_DIST = RADIUS * 0.6;

  for (const clue of grid.lineClues) {
    const state = getState(lineClueStates, clue);
    const key = lineClueKey(clue);

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
    const overlaps = overlapsCell(lx, ly, grid);

    // Skip if overlapping a previously placed label
    const tooClose = !overlaps && labelPositions.some(p => {
      const px = lx - p.x;
      const py = ly - p.y;
      return px * px + py * py < LABEL_MIN_DIST * LABEL_MIN_DIST;
    });

    const canRenderLabel = !overlaps && !tooClose;
    if (canRenderLabel) {
      labelPositions.push({ x: lx, y: ly });
    }

    // Render guide line (behind text) if visible-with-line
    if (state.visibility === 'visible-with-line') {
      renderGuideLine(clue, svgContainer);
    }

    // Render label text based on visibility
    if (canRenderLabel && state.visibility !== 'invisible') {
      const opacity = state.visibility === 'dimmed' ? DIMMED_OPACITY : undefined;
      const lineLabel = formatNeighborClue(clue.value, clue.notation, contiguityEnabled);
      svgContainer.appendChild(
        createTextElement(lx, ly, lineLabel, '#95a5a6', 10, rotation, opacity),
      );
    }

    // Render hit area triangle in the missing cell where the label sits
    if (onLineClueInteraction && canRenderLabel) {
      const mc = missingCellCenter(anchorCoord, clue.axis);
      const hitArea = document.createElementNS(SVG_NS, 'polygon');
      hitArea.setAttribute('points', clueHitTriangle(mc.x, mc.y, clue.axis));
      hitArea.setAttribute('fill', 'transparent');
      hitArea.setAttribute('stroke', '#ffffff');
      hitArea.setAttribute('stroke-opacity', '0.2');
      hitArea.setAttribute('stroke-width', '1');
      hitArea.style.cursor = 'pointer';

      hitArea.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        if (e.altKey) {
          onLineClueInteraction(key, toggleInvisible(state));
        } else {
          onLineClueInteraction(key, toggleGuideLine(state));
        }
      });

      hitArea.addEventListener('contextmenu', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onLineClueInteraction(key, toggleDimmed(state));
      });

      svgContainer.appendChild(hitArea);
    }
  }
}
