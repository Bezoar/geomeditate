import { HexGrid } from './model/hex-grid';
import { TEST_GRIDS } from './grids/test-grids';
import { generateRandomGrid } from './grids/random-grid';
import { renderGrid, type CellInteraction } from './view/grid-renderer';
import { renderClues } from './view/clue-renderer';
import { initControls } from './view/controls';
import type { HexCoord } from './model/hex-coord';
import type { LineClueState } from './view/line-clue-state';

const svgEl = document.getElementById('grid-svg') as unknown as SVGElement;
const controlsEl = document.getElementById('controls')!;

let currentGrid: HexGrid;
let contiguityEnabled = true;
let lineClueStates = new Map<string, LineClueState>();

function updateHud(): void {
  document.getElementById('remaining')!.textContent = String(currentGrid.remainingCount);
  document.getElementById('mistakes')!.textContent = String(currentGrid.mistakeCount);
}

function render(): void {
  renderGrid(currentGrid, svgEl, handleCellClick);
  renderClues(currentGrid, svgEl, contiguityEnabled, lineClueStates, handleLineClueInteraction);
  updateHud();
}

function handleCellClick(coord: HexCoord, interaction: CellInteraction): void {
  switch (interaction) {
    case 'open':
      currentGrid.openCell(coord);
      break;
    case 'mark':
      currentGrid.markCell(coord);
      break;
    case 'toggleTruth':
      currentGrid.toggleGroundTruth(coord);
      break;
    case 'recover':
      currentGrid.recoverCell(coord);
      break;
    case 'toggleMissing':
      currentGrid.toggleMissing(coord);
      break;
  }
  render();
}

function handleLineClueInteraction(key: string, newState: LineClueState): void {
  lineClueStates.set(key, newState);
  render();
}

function loadGrid(index: number): void {
  const config = TEST_GRIDS[index];
  currentGrid = new HexGrid(config);
  currentGrid.computeAllClues();
  lineClueStates = new Map();
  render();
}

function loadRandomGrid(width: number, height: number, density: number): void {
  const config = generateRandomGrid(width, height, density);
  currentGrid = new HexGrid(config);
  currentGrid.computeAllClues();
  lineClueStates = new Map();
  render();
}

initControls(controlsEl, {
  gridNames: TEST_GRIDS.map(g => g.name),
  onGridSelect: loadGrid,
  onContiguityToggle: (enabled) => { contiguityEnabled = enabled; render(); },
  onRestart: () => { currentGrid.restart(); render(); },
  onCoverAll: () => { currentGrid.coverAll(); render(); },
  onRandomGenerate: loadRandomGrid,
});

loadGrid(0);
