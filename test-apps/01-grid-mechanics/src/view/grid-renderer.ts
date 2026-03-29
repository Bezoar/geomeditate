import type { HexGrid } from '../model/hex-grid';
import type { HexCoord } from '../model/hex-coord';
import { CellVisualState } from '../model/hex-cell';
import { coordKey, parseCoordKey, toPixel } from '../model/hex-coord';

const HEX_RADIUS = 24;
const SVG_NS = 'http://www.w3.org/2000/svg';
const PADDING = 32;

const FILL_COLORS: Record<CellVisualState, string> = {
  [CellVisualState.COVERED]: '#e67e22',
  [CellVisualState.OPEN_EMPTY]: '#2c3e50',
  [CellVisualState.MARKED_FILLED]: '#3498db',
};

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

export type CellInteraction = 'open' | 'mark' | 'toggleTruth' | 'recover' | 'toggleMissing' | 'toggleClueVisibility' | 'toggleClueDimmed' | 'toggleFlowerGuide';

export interface CellClickHandler {
  (coord: HexCoord, interaction: CellInteraction): void;
}

export function renderGrid(
  grid: HexGrid,
  container: SVGElement,
  onClick?: CellClickHandler,
  selectionEnabled?: boolean,
): void {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const cell of grid.cells.values()) {
    const { x, y } = toPixel(cell.coord, HEX_RADIUS);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const vbX = minX - HEX_RADIUS - PADDING;
  const vbY = minY - HEX_RADIUS - PADDING;
  const vbW = maxX - minX + HEX_RADIUS * 2 + PADDING * 2;
  const vbH = maxY - minY + HEX_RADIUS * 2 + PADDING * 2;
  container.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);

  // Render invisible placeholders for missing positions (to allow restoring)
  if (onClick) {
    for (let col = 0; col < grid.width; col++) {
      for (let row = 0; row < grid.height; row++) {
        const key = coordKey({ col, row });
        if (grid.cells.has(key)) continue;

        const { x, y } = toPixel({ col, row }, HEX_RADIUS);
        const placeholder = document.createElementNS(SVG_NS, 'polygon');
        placeholder.setAttribute('points', hexPoints(x, y, HEX_RADIUS));
        placeholder.setAttribute('fill', 'transparent');
        placeholder.style.cursor = 'pointer';
        placeholder.addEventListener('click', (e: MouseEvent) => {
          if (e.altKey && e.shiftKey) {
            onClick({ col, row }, 'toggleMissing');
          }
        });
        container.appendChild(placeholder);
      }
    }
  }

  for (const cell of grid.cells.values()) {
    const key = coordKey(cell.coord);
    const { x, y } = toPixel(cell.coord, HEX_RADIUS);

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('data-coord', key);
    group.style.cursor = 'pointer';

    const polygon = document.createElementNS(SVG_NS, 'polygon');
    polygon.setAttribute('points', hexPoints(x, y, HEX_RADIUS));
    polygon.setAttribute('fill', FILL_COLORS[cell.visualState]);
    polygon.setAttribute('stroke', '#1a1a2e');
    polygon.setAttribute('stroke-width', '2');

    group.appendChild(polygon);
    container.appendChild(group);

    if (onClick) {
      group.addEventListener('click', (e: MouseEvent) => {
        if (selectionEnabled) {
          container.querySelectorAll('.clue-selection').forEach(el => el.remove());
          const sel = document.createElementNS(SVG_NS, 'polygon');
          sel.setAttribute('points', hexPoints(x, y, HEX_RADIUS));
          sel.setAttribute('fill', 'none');
          sel.setAttribute('stroke', '#ffff00');
          sel.setAttribute('stroke-width', '3');
          sel.setAttribute('pointer-events', 'none');
          sel.classList.add('clue-selection');
          container.appendChild(sel);
          return;
        }
        const coord = parseCoordKey(key);
        if (e.metaKey) {
          onClick(coord, 'toggleClueVisibility');
        } else if (e.altKey && e.shiftKey) {
          onClick(coord, 'toggleMissing');
        } else if (e.altKey) {
          onClick(coord, 'toggleTruth');
        } else if (cell.visualState === CellVisualState.MARKED_FILLED) {
          onClick(coord, 'toggleFlowerGuide');
        } else {
          onClick(coord, 'mark');
        }
      });

      group.addEventListener('contextmenu', (e: MouseEvent) => {
        e.preventDefault();
        const coord = parseCoordKey(key);
        if (e.altKey) {
          onClick(coord, 'recover');
        } else if (cell.visualState === CellVisualState.MARKED_FILLED) {
          onClick(coord, 'toggleClueDimmed');
        } else {
          onClick(coord, 'open');
        }
      });
    }
  }
}
