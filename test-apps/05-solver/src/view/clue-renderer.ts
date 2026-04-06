import type { HexGrid } from '../model/hex-grid';
import type { Segment } from '../clues/line';
import { CellVisualState } from '../model/hex-cell';
import { coordKey, toPixel, stepInDirection, neighbors, radius2Positions } from '../model/hex-coord';
import type { HexCoord, LineAxis } from '../model/hex-coord';
import { formatNeighborClue } from '../clues/neighbor';
import {
  type SegmentState,
  getState,
  toggleGuideLine,
  toggleDimmed,
  toggleInvisible,
} from './segment-state';

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
    case 'left-facing':
      return { dx: colStep * 0.65, dy: -rowStep * 0.325, rotation: 60 };
    case 'right-facing':
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
    case 'right-facing':
      // Label is upper-left → wedge points lower-right: center → v0 → v1
      i1 = 0; i2 = 1;
      break;
    case 'left-facing':
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
 * Render a guide line for a single segment, covering only that segment's cells.
 * Opacity is set on the parent <g> element to prevent stacking.
 */
function renderSegmentGuideLine(
  segment: Segment,
  container: SVGElement,
): void {
  if (segment.cells.length === 0) return;

  const first = toPixel(segment.cells[0], RADIUS);
  const last = toPixel(segment.cells[segment.cells.length - 1], RADIUS);
  const apothem = RADIUS * Math.sqrt(3) / 2;

  let x1: number, y1: number, x2: number, y2: number;

  if (segment.cells.length === 1) {
    const nextCoord = stepInDirection(segment.cells[0], segment.axis);
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
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len;
    const uy = dy / len;
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
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-linecap', 'round');
  // No stroke-opacity here — opacity is set on the parent <g> element
  container.appendChild(line);
}

export interface SegmentInteraction {
  (segmentId: string, newState: SegmentState): void;
}

export interface ClueRenderOptions {
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
  segmentStates: Map<string, SegmentState>,
  hiddenFlowerClues: Set<string>,
  dimmedFlowerClues: Set<string>,
  flowerGuideClues: Set<string>,
  onSegmentInteraction?: SegmentInteraction,
): void {

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
        cell.contiguityEnabled,
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

  // Render guide lines per-segment, grouped by LineGroup to prevent opacity stacking
  const guideGroupElements = new Map<string, SVGGElement>();
  for (const seg of grid.segments.values()) {
    const state = getState(segmentStates, seg);
    if (!state.activated || state.visibility !== 'visible-with-line') continue;

    let gEl = guideGroupElements.get(seg.lineGroupId);
    if (!gEl) {
      gEl = document.createElementNS(SVG_NS, 'g') as SVGGElement;
      gEl.setAttribute('opacity', '0.3');
      svgContainer.appendChild(gEl);
      guideGroupElements.set(seg.lineGroupId, gEl);
    }
    renderSegmentGuideLine(seg, gEl);
  }

  // Render segment labels and hit areas
  const renderedLabelPositions: Array<{ x: number; y: number }> = [];
  const LABEL_MIN_DIST = RADIUS * 0.6;

  // Sort: edge clues first (higher priority for collision avoidance)
  const sortedSegments = [...grid.segments.values()].sort((a, b) =>
    (a.isEdgeClue ? 0 : 1) - (b.isEdgeClue ? 0 : 1),
  );

  for (const seg of sortedSegments) {
    const state = getState(segmentStates, seg);
    if (!state.activated) continue;

    const { dx, dy, rotation } = lineClueOffset(seg.axis);
    const label = formatNeighborClue(seg.value, seg.notation, seg.contiguityEnabled);

    // Hit area position: at the clue position (gap or edge predecessor)
    const hitPos = toPixel(seg.cluePosition, RADIUS);

    // Label position: offset from the adjacent cell toward the clue position
    let labelX: number, labelY: number;

    if (seg.isEdgeClue) {
      // Edge label: offset from anchor cell
      const anchorCoord =
        seg.axis === 'left-facing'
          ? seg.cells[seg.cells.length - 1]
          : seg.cells[0];
      const anchor = toPixel(anchorCoord, RADIUS);
      labelX = anchor.x + dx;
      labelY = anchor.y + dy;
    } else {
      // Gap label: offset from the cell nearest the gap
      if (seg.axis === 'left-facing') {
        // For left-facing, seg.cells are ordered lower-left to upper-right (prefix before gap).
        // The cell nearest the gap is the LAST cell in seg.cells.
        const nearestCell = seg.cells[seg.cells.length - 1];
        const nearestPixel = toPixel(nearestCell, RADIUS);
        labelX = nearestPixel.x + dx;
        labelY = nearestPixel.y + dy;
      } else {
        // For vertical/right-facing, offset from the first cell after the gap
        const firstAfter = toPixel(seg.cells[0], RADIUS);
        labelX = firstAfter.x + dx;
        labelY = firstAfter.y + dy;
      }
    }

    if (overlapsCell(labelX, labelY, grid)) continue;

    const tooClose = renderedLabelPositions.some(p => {
      const px = labelX - p.x;
      const py = labelY - p.y;
      return px * px + py * py < LABEL_MIN_DIST * LABEL_MIN_DIST;
    });
    if (tooClose) continue;

    renderedLabelPositions.push({ x: labelX, y: labelY });
    renderSegmentLabel(
      labelX, labelY, hitPos.x, hitPos.y, label, rotation,
      state, seg.axis, seg.id, svgContainer, options, onSegmentInteraction,
    );
  }
}

function renderSegmentLabel(
  textX: number, textY: number,
  hitX: number, hitY: number,
  label: string, rotation: number,
  state: SegmentState, axis: LineAxis,
  segId: string, svgContainer: SVGElement,
  opts: ClueRenderOptions,
  onSegmentInteraction?: SegmentInteraction,
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
    if (onSegmentInteraction) {
      if (e.metaKey) {
        onSegmentInteraction(segId, toggleInvisible(state));
      } else {
        onSegmentInteraction(segId, toggleGuideLine(state));
      }
    }
  });

  hitArea.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSegmentInteraction) {
      onSegmentInteraction(segId, toggleDimmed(state));
    }
  });

  svgContainer.appendChild(hitArea);
}
