import { HexGrid } from './model/hex-grid';
import { TEST_GRIDS } from './grids/test-grids';
import { generateRandomGrid } from './grids/random-grid';
import { renderGrid, type CellInteraction } from './view/grid-renderer';
import { renderClues, type ClueRenderOptions } from './view/clue-renderer';
import { initControls } from './view/controls';
import { coordKey } from './model/hex-coord';
import type { HexCoord } from './model/hex-coord';
import { CellVisualState } from './model/hex-cell';
import type { LineClueState } from './view/line-clue-state';
import { ActionHistory } from './save/history';
import { serializeSaveFile, deserializeSaveFile } from './save/save-file';
import { LocalStorageBackend, downloadJsonFile, uploadJsonFile } from './save/storage';

const svgEl = document.getElementById('grid-svg') as unknown as SVGElement;
const controlsEl = document.getElementById('controls')!;

let currentGrid: HexGrid;
let lineClueStates = new Map<string, LineClueState>();
let hiddenFlowerClues = new Set<string>();
let dimmedFlowerClues = new Set<string>();
let flowerGuideClues = new Set<string>();
let actionHistory = new ActionHistory();
const storage = new LocalStorageBackend();

const clueOptions: ClueRenderOptions = {
  showHitAreaOutlines: false,
  selectionEnabled: false,
};

function updateHud(): void {
  document.getElementById('remaining')!.textContent = String(currentGrid.remainingCount);
  document.getElementById('mistakes')!.textContent = String(currentGrid.mistakeCount);
}

function render(): void {
  renderGrid(currentGrid, svgEl, handleCellClick, clueOptions.selectionEnabled);
  renderClues(currentGrid, svgEl, clueOptions, lineClueStates, hiddenFlowerClues, dimmedFlowerClues, flowerGuideClues, handleLineClueInteraction);
  updateHud();
}

function handleCellClick(coord: HexCoord, interaction: CellInteraction): void {
  const ck = coordKey(coord);
  switch (interaction) {
    case 'open': {
      const cell = currentGrid.cells.get(ck);
      if (cell && cell.visualState === CellVisualState.COVERED) {
        const prevMistakes = currentGrid.mistakeCount;
        currentGrid.openCell(coord);
        const wasMistake = currentGrid.mistakeCount > prevMistakes;
        actionHistory.push({ type: 'open', coord: ck, wasMistake });
      }
      break;
    }
    case 'mark': {
      const cell = currentGrid.cells.get(ck);
      if (cell && cell.visualState === CellVisualState.COVERED) {
        const prevMistakes = currentGrid.mistakeCount;
        currentGrid.markCell(coord);
        const wasMistake = currentGrid.mistakeCount > prevMistakes;
        actionHistory.push({ type: 'mark', coord: ck, wasMistake });
      }
      break;
    }
    case 'toggleTruth':
      actionHistory.push({ type: 'dev:toggleTruth', coord: ck });
      currentGrid.toggleGroundTruth(coord);
      break;
    case 'recover':
      actionHistory.push({ type: 'dev:recover', coord: ck });
      currentGrid.recoverCell(coord);
      break;
    case 'toggleMissing':
      actionHistory.push({ type: 'dev:toggleMissing', coord: ck });
      currentGrid.toggleMissing(coord);
      break;
    case 'toggleClueVisibility':
      handleFlowerClueToggle(ck);
      return;
    case 'toggleClueDimmed':
      handleFlowerClueDimToggle(ck);
      return;
    case 'toggleFlowerGuide':
      handleFlowerGuideToggle(ck);
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

function handleFlowerGuideToggle(ck: string): void {
  if (flowerGuideClues.has(ck)) {
    flowerGuideClues.delete(ck);
  } else {
    flowerGuideClues.add(ck);
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
  flowerGuideClues = new Set();
  actionHistory = new ActionHistory();
  render();
}

function loadRandomGrid(width: number, height: number, density: number): void {
  const config = generateRandomGrid(width, height, density);
  currentGrid = new HexGrid(config);
  currentGrid.computeAllClues();
  lineClueStates = new Map();
  hiddenFlowerClues = new Set();
  dimmedFlowerClues = new Set();
  flowerGuideClues = new Set();
  actionHistory = new ActionHistory();
  render();
}

function bulkSetNeighborContiguity(enabled: boolean): void {
  for (const [key, cell] of currentGrid.cells) {
    if (cell.neighborClueNotation !== null) {
      currentGrid.cells.set(key, { ...cell, contiguityEnabled: enabled });
    }
  }
  render();
}

function bulkSetLineContiguity(enabled: boolean): void {
  for (let i = 0; i < currentGrid.lineClues.length; i++) {
    currentGrid.lineClues[i] = { ...currentGrid.lineClues[i], contiguityEnabled: enabled };
  }
  render();
}

async function handleSave(): Promise<void> {
  const json = serializeSaveFile({
    grid: currentGrid,
    name: currentGrid.width + 'x' + currentGrid.height,
    description: '',
    lineClueStates,
    hiddenFlowerClues,
    dimmedFlowerClues,
    flowerGuideClues,
    history: actionHistory,
  });
  await storage.save('autosave', json);
  downloadJsonFile(json, `puzzle-${Date.now()}.json`);
}

async function handleLoad(): Promise<void> {
  const fileData = await uploadJsonFile();
  const json = fileData ?? await storage.load('autosave');
  if (!json) return;

  const result = deserializeSaveFile(json);
  currentGrid = result.grid;
  lineClueStates = result.lineClueStates;
  hiddenFlowerClues = result.hiddenFlowerClues;
  dimmedFlowerClues = result.dimmedFlowerClues;
  flowerGuideClues = result.flowerGuideClues;
  actionHistory = result.history;
  render();
}

async function handleClear(): Promise<void> {
  await storage.clearAll();
}

initControls(controlsEl, {
  gridNames: TEST_GRIDS.map(g => g.name),
  onGridSelect: loadGrid,
  onBulkNeighborContiguityToggle: bulkSetNeighborContiguity,
  onBulkLineContiguityToggle: bulkSetLineContiguity,
  onHitAreaOutlinesToggle: (v) => { clueOptions.showHitAreaOutlines = v; render(); },
  onSelectionToggle: (v) => {
    clueOptions.selectionEnabled = v;
    if (!v) svgEl.querySelectorAll('.clue-selection').forEach(el => el.remove());
  },
  onRestart: () => { currentGrid.restart(); actionHistory.clear(); render(); },
  onCoverAll: () => { currentGrid.coverAll(); actionHistory.clear(); render(); },
  onRandomGenerate: loadRandomGrid,
  onSave: handleSave,
  onLoad: handleLoad,
  onClear: handleClear,
});

loadGrid(0);
