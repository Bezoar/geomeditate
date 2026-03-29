import type { HexGrid } from '../model/hex-grid';
import { predecessor } from '../clues/line';
import type { LineClue } from '../clues/line';
import { CellGroundTruth, CellVisualState, ClueNotation } from '../model/hex-cell';
import { coordKey, toPixel, stepInDirection, neighbors, radius2Positions } from '../model/hex-coord';
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

function computePartialContiguity(filledFlags: boolean[], count: number): ClueNotation {
  if (count <= 1) return ClueNotation.PLAIN;
  let runs = 0;
  let inRun = false;
  for (const filled of filledFlags) {
    if (filled && !inRun) { runs++; inRun = true; }
    else if (!filled) { inRun = false; }
  }
  return runs === 1 ? ClueNotation.CONTIGUOUS : ClueNotation.DISCONTIGUOUS;
}

const RADIUS = 24;
const SVG_NS = 'http://www.w3.org/2000/svg';
const DIMMED_OPACITY = 0.15;

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
  text.setAttribute('pointer-events', 'none');
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
    // Single cell: compute direction from stepping to the next cell along the axis
    const nextCoord = stepInDirection(clue.cells[0], clue.axis);
    const next = toPixel(nextCoord, RADIUS);
    const ddx = next.x - first.x;
    const ddy = next.y - first.y;
    const dlen = Math.sqrt(ddx * ddx + ddy * ddy);
    const dux = ddx / dlen;
    const duy = ddy / dlen;
    x1 = first.x - dux * apothem;
    y1 = first.y - duy * apothem;
    x2 = first.x + dux * apothem;
    y2 = first.y + duy * apothem;
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
  line.setAttribute('stroke-opacity', '0.3');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-linecap', 'round');
  svgContainer.appendChild(line);
}

export interface LineClueInteraction {
  (clueKey: string, newState: LineClueState): void;
}

export interface ClueRenderOptions {
  contiguityEnabled: boolean;
  lineContiguityEnabled: boolean;
  showHitAreaOutlines: boolean;
  selectionEnabled: boolean;
}

function renderFlowerGuide(
  center: HexCoord,
  svgContainer: SVGElement,
): void {
  const areaPositions = [center, ...radius2Positions(center)];
  const areaKeys = new Set(areaPositions.map(coordKey));

  // Trace boundary as a continuous polygon (filled + stroked)
  const vtxKey = (x: number, y: number) =>
    `${Math.round(x * 100)},${Math.round(y * 100)}`;
  const adj = new Map<string, { x: number; y: number }>();

  for (const pos of areaPositions) {
    const { x, y } = toPixel(pos, RADIUS);
    const nbs = neighbors(pos);
    for (let d = 0; d < 6; d++) {
      if (!areaKeys.has(coordKey(nbs[d]))) {
        const a1 = (Math.PI / 180) * (60 * ((d + 5) % 6));
        const a2 = (Math.PI / 180) * (60 * d);
        const x1 = x + RADIUS * Math.cos(a1);
        const y1 = y + RADIUS * Math.sin(a1);
        const x2 = x + RADIUS * Math.cos(a2);
        const y2 = y + RADIUS * Math.sin(a2);
        adj.set(vtxKey(x1, y1), { x: x2, y: y2 });
      }
    }
  }

  if (adj.size > 0) {
    const startKey = adj.keys().next().value!;
    const pts: Array<{ x: number; y: number }> = [];
    let curKey = startKey;
    do {
      const pt = adj.get(curKey)!;
      pts.push(pt);
      curKey = vtxKey(pt.x, pt.y);
    } while (curKey !== startKey);

    const STROKE_W = 4;

    // Proper polygon inset: offset each edge inward by half stroke width,
    // then intersect consecutive offset edges to find new vertices.
    // Boundary is CW in screen coords (y-down), so inward normal is (-dy, dx).
    const n = pts.length;
    const insetPts: Array<{ x: number; y: number }> = [];
    const amt = STROKE_W / 2;
    for (let i = 0; i < n; i++) {
      const a = pts[(i - 1 + n) % n];
      const b = pts[i];
      const c = pts[(i + 1) % n];
      const dx1 = b.x - a.x, dy1 = b.y - a.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const dx2 = c.x - b.x, dy2 = c.y - b.y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      const nx1 = -dy1 / len1, ny1 = dx1 / len1;
      const nx2 = -dy2 / len2, ny2 = dx2 / len2;
      const p1x = a.x + nx1 * amt, p1y = a.y + ny1 * amt;
      const p2x = b.x + nx2 * amt, p2y = b.y + ny2 * amt;
      const denom = dx1 * dy2 - dy1 * dx2;
      if (Math.abs(denom) < 1e-10) {
        insetPts.push({ x: b.x + nx1 * amt, y: b.y + ny1 * amt });
      } else {
        const t = ((p2x - p1x) * dy2 - (p2y - p1y) * dx2) / denom;
        insetPts.push({ x: p1x + t * dx1, y: p1y + t * dy1 });
      }
    }

    const fillPoly = document.createElementNS(SVG_NS, 'polygon');
    fillPoly.setAttribute('points', insetPts.map(p => `${p.x},${p.y}`).join(' '));
    fillPoly.setAttribute('fill', '#ffffff');
    fillPoly.setAttribute('fill-opacity', '0.2');
    fillPoly.setAttribute('stroke', 'none');
    fillPoly.setAttribute('pointer-events', 'none');
    svgContainer.appendChild(fillPoly);

    // Stroke-only outline at the boundary edge
    const outline = document.createElementNS(SVG_NS, 'polygon');
    outline.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', '#ffffff');
    outline.setAttribute('stroke-opacity', '0.5');
    outline.setAttribute('stroke-width', String(STROKE_W));
    outline.setAttribute('stroke-linejoin', 'round');
    outline.setAttribute('pointer-events', 'none');
    svgContainer.appendChild(outline);
  }
}

export function renderClues(
  grid: HexGrid,
  svgContainer: SVGElement,
  options: ClueRenderOptions,
  lineClueStates: Map<string, LineClueState>,
  hiddenFlowerClues: Set<string>,
  dimmedFlowerClues: Set<string>,
  flowerGuideClues: Set<string>,
  onLineClueInteraction?: LineClueInteraction,
): void {
  const { contiguityEnabled, lineContiguityEnabled, showHitAreaOutlines, selectionEnabled } = options;

  // Render flower guide overlays (behind clue text)
  for (const ck of flowerGuideClues) {
    const cell = grid.cells.get(ck);
    if (cell && cell.visualState === CellVisualState.MARKED_FILLED) {
      renderFlowerGuide(cell.coord, svgContainer);
    }
  }

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
      const ck = coordKey(cell.coord);
      if (!hiddenFlowerClues.has(ck)) {
        const opacity = dimmedFlowerClues.has(ck) ? DIMMED_OPACITY : undefined;
        svgContainer.appendChild(
          createTextElement(x, y, String(cell.flowerClueValue), '#ffffff', 10, undefined, opacity),
        );
      }
    }
  }

  // Render line clues with display state
  const renderedLabelPositions: Array<{ x: number; y: number }> = [];
  const LABEL_MIN_DIST = RADIUS * 0.6;

  for (const clue of grid.lineClues) {
    const state = getState(lineClueStates, clue);
    const key = lineClueKey(clue);
    const { dx, dy, rotation } = lineClueOffset(clue.axis);

    // Render guide line (behind text) if visible-with-line
    if (state.visibility === 'visible-with-line') {
      renderGuideLine(clue, svgContainer);
    }

    const lineLabel = formatNeighborClue(clue.value, clue.notation, lineContiguityEnabled);

    // --- Edge label (original positioning: anchor + offset) ---
    const anchorCoord =
      clue.axis === 'ascending'
        ? clue.cells[clue.cells.length - 1]
        : clue.startCoord;
    const anchor = toPixel(anchorCoord, RADIUS);
    const edgeLx = anchor.x + dx;
    const edgeLy = anchor.y + dy;

    const edgeCoord =
      clue.axis === 'ascending'
        ? stepInDirection(clue.cells[clue.cells.length - 1], 'ascending')
        : predecessor(clue.startCoord, clue.axis);
    const edgeHit = toPixel(edgeCoord, RADIUS);

    if (!overlapsCell(edgeLx, edgeLy, grid)) {
      const tooClose = renderedLabelPositions.some(p => {
        const px = edgeLx - p.x;
        const py = edgeLy - p.y;
        return px * px + py * py < LABEL_MIN_DIST * LABEL_MIN_DIST;
      });
      if (!tooClose) {
        renderedLabelPositions.push({ x: edgeLx, y: edgeLy });
        renderLineLabel(edgeLx, edgeLy, edgeHit.x, edgeHit.y, lineLabel, rotation, state, clue.axis, key, svgContainer, options, onLineClueInteraction);
      }
    }

    // --- Interior labels: missing cells adjacent to an active cell ---
    // All labels face "downward": they describe cells going down/down-right/down-left.
    // For vertical/descending: the next cell FORWARD is active; count forward to end.
    // For ascending: the cell BELOW-LEFT (predecessor) is active; count backward to start.
    for (const mp of clue.labelPositions) {
      let adjacentKey: string;
      let intLx: number, intLy: number;
      let partialCells: HexCoord[];

      if (clue.axis === 'ascending') {
        // Ascending interior: label above cells going down-left
        const pred = predecessor(mp, 'ascending');
        adjacentKey = coordKey(pred);
        if (!grid.cells.has(adjacentKey)) continue;

        // Offset upper-right from predecessor (standard ascending offset, toward missing cell)
        const predPixel = toPixel(pred, RADIUS);
        intLx = predPixel.x + dx;
        intLy = predPixel.y + dy;

        // Count from start of diagonal up to and including predecessor
        const predIdx = clue.cells.findIndex(c => coordKey(c) === adjacentKey);
        partialCells = clue.cells.slice(0, predIdx + 1);
      } else {
        // Vertical/descending interior: label above cells going down/down-right
        const nextForward = stepInDirection(mp, clue.axis);
        adjacentKey = coordKey(nextForward);
        if (!grid.cells.has(adjacentKey)) continue;

        // Standard offset from next cell (toward missing cell)
        const nextAnchor = toPixel(nextForward, RADIUS);
        intLx = nextAnchor.x + dx;
        intLy = nextAnchor.y + dy;

        // Count from next cell forward to end of diagonal
        const nextIdx = clue.cells.findIndex(c => coordKey(c) === adjacentKey);
        partialCells = clue.cells.slice(nextIdx);
      }

      const mc = toPixel(mp, RADIUS);

      if (overlapsCell(intLx, intLy, grid)) continue;

      const tooClose = renderedLabelPositions.some(p => {
        const px = intLx - p.x;
        const py = intLy - p.y;
        return px * px + py * py < LABEL_MIN_DIST * LABEL_MIN_DIST;
      });
      if (tooClose) continue;

      const partialFilled = partialCells.map(c => {
        const cell = grid.cells.get(coordKey(c));
        return cell !== undefined && cell.groundTruth === CellGroundTruth.FILLED;
      });
      const partialValue = partialFilled.filter(Boolean).length;
      const partialNotation = computePartialContiguity(partialFilled, partialValue);
      const partialLabel = formatNeighborClue(partialValue, partialNotation, lineContiguityEnabled);

      renderedLabelPositions.push({ x: intLx, y: intLy });
      renderLineLabel(intLx, intLy, mc.x, mc.y, partialLabel, rotation, state, clue.axis, key, svgContainer, options, onLineClueInteraction);
    }
  }
}

function renderLineLabel(
  textX: number, textY: number,
  hitX: number, hitY: number,
  label: string, rotation: number,
  state: LineClueState, axis: LineAxis,
  key: string, svgContainer: SVGElement,
  opts: ClueRenderOptions,
  onLineClueInteraction?: LineClueInteraction,
): void {
  if (state.visibility !== 'invisible') {
    const opacity = state.visibility === 'dimmed' ? DIMMED_OPACITY : undefined;
    svgContainer.appendChild(
      createTextElement(textX, textY, label, '#95a5a6', 10, rotation, opacity),
    );
  }

  const hitArea = document.createElementNS(SVG_NS, 'polygon');
  hitArea.setAttribute('points', clueHitTriangle(hitX, hitY, axis));
  hitArea.setAttribute('fill', 'transparent');
  if (opts.showHitAreaOutlines) {
    hitArea.setAttribute('stroke', '#ffffff');
    hitArea.setAttribute('stroke-opacity', '0.2');
    hitArea.setAttribute('stroke-width', '1');
  }
  hitArea.style.cursor = 'pointer';

  hitArea.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    if (opts.selectionEnabled) {
      // Remove previous selection
      svgContainer.querySelectorAll('.clue-selection').forEach(el => el.remove());
      const sel = document.createElementNS(SVG_NS, 'polygon');
      sel.setAttribute('points', clueHitTriangle(hitX, hitY, axis));
      sel.setAttribute('fill', 'none');
      sel.setAttribute('stroke', '#ffff00');
      sel.setAttribute('stroke-width', '3');
      sel.setAttribute('pointer-events', 'none');
      sel.classList.add('clue-selection');
      svgContainer.appendChild(sel);
      return;
    }
    if (onLineClueInteraction) {
      if (e.metaKey) {
        onLineClueInteraction(key, toggleInvisible(state));
      } else {
        onLineClueInteraction(key, toggleGuideLine(state));
      }
    }
  });

  hitArea.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onLineClueInteraction) {
      onLineClueInteraction(key, toggleDimmed(state));
    }
  });

  svgContainer.appendChild(hitArea);
}
