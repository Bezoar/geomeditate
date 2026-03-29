import { HexGrid } from './model/hex-grid';
import { TEST_GRIDS } from './grids/test-grids';
import { generateRandomGrid } from './grids/random-grid';
import { renderGrid, type CellInteraction } from './view/grid-renderer';
import { renderClues, type ClueRenderOptions } from './view/clue-renderer';
import { initControls } from './view/controls';
import { coordKey } from './model/hex-coord';
import type { HexCoord } from './model/hex-coord';
import type { LineClueState } from './view/line-clue-state';

const svgEl = document.getElementById('grid-svg') as unknown as SVGElement;
const controlsEl = document.getElementById('controls')!;

let currentGrid: HexGrid;
let lineClueStates = new Map<string, LineClueState>();
let hiddenFlowerClues = new Set<string>();
let dimmedFlowerClues = new Set<string>();

const clueOptions: ClueRenderOptions = {
  contiguityEnabled: true,
  lineContiguityEnabled: true,
  showHitAreaOutlines: false,
  selectionEnabled: false,
};

function updateHud(): void {
  document.getElementById('remaining')!.textContent = String(currentGrid.remainingCount);
  document.getElementById('mistakes')!.textContent = String(currentGrid.mistakeCount);
}

function render(): void {
  renderGrid(currentGrid, svgEl, handleCellClick, clueOptions.selectionEnabled);
  renderClues(currentGrid, svgEl, clueOptions, lineClueStates, hiddenFlowerClues, dimmedFlowerClues, handleLineClueInteraction);
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
    case 'toggleClueVisibility':
      handleFlowerClueToggle(coordKey(coord));
      return;
    case 'toggleClueDimmed':
      handleFlowerClueDimToggle(coordKey(coord));
      return;
  }
  render();
}

function handleLineClueInteraction(key: string, newState: LineClueState): void {
  lineClueStates.set(key, newState);
  render();
}

function handleFlowerClueToggle(ck: string): void {
  if (hiddenFlowerClues.has(ck)) {
    hiddenFlowerClues.delete(ck);
  } else {
    hiddenFlowerClues.add(ck);
  }
  render();
}

function handleFlowerClueDimToggle(ck: string): void {
  if (dimmedFlowerClues.has(ck)) {
    dimmedFlowerClues.delete(ck);
  } else {
    dimmedFlowerClues.add(ck);
  }
  render();
}

function loadGrid(index: number): void {
  const config = TEST_GRIDS[index];
  currentGrid = new HexGrid(config);
  currentGrid.computeAllClues();
  lineClueStates = new Map();
  hiddenFlowerClues = new Set();
  dimmedFlowerClues = new Set();
  render();
}

function loadRandomGrid(width: number, height: number, density: number): void {
  const config = generateRandomGrid(width, height, density);
  currentGrid = new HexGrid(config);
  currentGrid.computeAllClues();
  lineClueStates = new Map();
  hiddenFlowerClues = new Set();
  dimmedFlowerClues = new Set();
  render();
}

initControls(controlsEl, {
  gridNames: TEST_GRIDS.map(g => g.name),
  onGridSelect: loadGrid,
  onContiguityToggle: (v) => { clueOptions.contiguityEnabled = v; render(); },
  onLineContiguityToggle: (v) => { clueOptions.lineContiguityEnabled = v; render(); },
  onHitAreaOutlinesToggle: (v) => { clueOptions.showHitAreaOutlines = v; render(); },
  onSelectionToggle: (v) => {
    clueOptions.selectionEnabled = v;
    if (!v) svgEl.querySelectorAll('.clue-selection').forEach(el => el.remove());
  },
  onRestart: () => { currentGrid.restart(); render(); },
  onCoverAll: () => { currentGrid.coverAll(); render(); },
  onRandomGenerate: loadRandomGrid,
});

loadGrid(0);
