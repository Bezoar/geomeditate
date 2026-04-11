import { HexGrid } from './model/hex-grid';
import { TEST_GRIDS } from './grids/test-grids';
import { generateRandomGrid } from './grids/random-grid';
import { renderGrid, type CellInteraction } from './view/grid-renderer';
import { renderClues, type ClueRenderOptions } from './view/clue-renderer';
import { initControls } from './view/controls';
import { initCounters, updateCounters } from './view/counters';
import { initSettingsModal } from './view/settings-modal';
import { initReplayControls } from './view/replay-controls';
import { coordKey } from './model/hex-coord';
import type { HexCoord } from './model/hex-coord';
import { CellVisualState } from './model/hex-cell';
import type { SegmentState } from './view/segment-state';
import { ActionHistory } from './save/history';
import { serializeSaveFile, deserializeSaveFile } from './save/save-file';
import { LocalStorageBackend, downloadJsonFile } from './save/storage';
import { solve } from './solver/solver-loop';
import { decodeGridString } from './save/grid-string';
import type { SolverConfig, TraceStep } from './solver/types';

const svgEl = document.getElementById('grid-svg') as unknown as SVGElement;
const controlsEl = document.getElementById('controls')!;
const countersEl = document.getElementById('counters')!;
const replayEl = document.getElementById('replay-controls')!;
const postSolveEl = document.getElementById('post-solve')!;
const settingsOverlayEl = document.getElementById('settings-overlay')!;
const settingsModalEl = document.getElementById('settings-modal')!;

let currentGrid: HexGrid;
let segmentStates = new Map<string, SegmentState>();
let hiddenFlowerClues = new Set<string>();
let dimmedFlowerClues = new Set<string>();
let flowerGuideClues = new Set<string>();
let actionHistory = new ActionHistory();
const storage = new LocalStorageBackend();

let solveTrace: TraceStep[] = [];
let solveActivatedClues = new Set<string>();

const clueOptions: ClueRenderOptions = {
  showHitAreaOutlines: false,
  selectionEnabled: false,
};

function updateHud(): void {
  updateCounters(currentGrid.remainingCount, currentGrid.mistakeCount);
}

function render(): void {
  renderGrid(currentGrid, svgEl, handleCellClick, clueOptions.selectionEnabled);
  renderClues(currentGrid, svgEl, clueOptions, segmentStates, hiddenFlowerClues, dimmedFlowerClues, flowerGuideClues, handleSegmentInteraction);
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

function handleSegmentInteraction(segId: string, newState: SegmentState): void {
  segmentStates.set(segId, newState);
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
  segmentStates = new Map();
  hiddenFlowerClues = new Set();
  dimmedFlowerClues = new Set();
  flowerGuideClues = new Set();
  actionHistory = new ActionHistory();
  replayControls.hide();
  postSolveEl.style.display = 'none';
  render();
}

function loadRandomGrid(width: number, height: number, density: number): void {
  const config = generateRandomGrid(width, height, density);
  currentGrid = new HexGrid(config);
  currentGrid.computeAllClues();
  segmentStates = new Map();
  hiddenFlowerClues = new Set();
  dimmedFlowerClues = new Set();
  flowerGuideClues = new Set();
  actionHistory = new ActionHistory();
  replayControls.hide();
  postSolveEl.style.display = 'none';
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
  for (const [id, seg] of currentGrid.segments) {
    currentGrid.segments.set(id, { ...seg, contiguityEnabled: enabled });
  }
  render();
}

function handleSave(): void {
  const json = serializeSaveFile({
    grid: currentGrid,
    name: currentGrid.width + 'x' + currentGrid.height,
    description: '',
    segmentStates,
    hiddenFlowerClues,
    dimmedFlowerClues,
    flowerGuideClues,
    history: actionHistory,
  });
  const now = new Date();
  const ts = now.toISOString().slice(0, 19).replace(/:/g, '-');
  downloadJsonFile(json, `puzzle-${ts}.json`);
  storage.save('autosave', json);
}

function loadFromJson(json: string): void {
  const result = deserializeSaveFile(json);
  currentGrid = result.grid;
  segmentStates = result.segmentStates;
  hiddenFlowerClues = result.hiddenFlowerClues;
  dimmedFlowerClues = result.dimmedFlowerClues;
  flowerGuideClues = result.flowerGuideClues;
  actionHistory = result.history;
  render();
}

function handleLoad(json: string): void {
  loadFromJson(json);
}

async function handleClear(): Promise<void> {
  await storage.clearAll();
}

function handleSolve(config: SolverConfig): void {
  // Cover all cells before solving
  currentGrid.coverAll();

  // Hide all segments and flower clues
  for (const seg of currentGrid.segments.keys()) {
    segmentStates.set(seg, {
      visibility: 'invisible',
      savedVisibility: 'visible',
      activated: false,
    });
  }
  for (const [key, cell] of currentGrid.cells) {
    if (cell.flowerClueValue !== null) {
      hiddenFlowerClues.add(key);
    }
  }

  const result = solve(
    currentGrid,
    segmentStates,
    hiddenFlowerClues,
    dimmedFlowerClues,
    config,
  );
  solveTrace = result.trace;
  solveActivatedClues = result.activatedClues;

  replayControls.setTrace(solveTrace);
  postSolveEl.style.display = 'block';
  render();
}

function applyBoardState(step: TraceStep): void {
  // Restore cell visual states from step.boardState.cells
  const cellMap = decodeGridString(step.boardState.cells);
  for (const [key, char] of cellMap) {
    const cell = currentGrid.cells.get(key);
    if (!cell) continue;
    let newState: CellVisualState;
    switch (char) {
      case 'C': newState = CellVisualState.COVERED; break;
      case 'O': newState = CellVisualState.OPEN_EMPTY; break;
      case 'M': newState = CellVisualState.MARKED_FILLED; break;
      default: continue;
    }
    if (cell.visualState !== newState) {
      currentGrid.cells.set(key, { ...cell, visualState: newState });
    }
  }

  // Recompute remaining count
  let remaining = 0;
  for (const cell of currentGrid.cells.values()) {
    if (cell.groundTruth === 'FILLED' && cell.visualState !== CellVisualState.MARKED_FILLED) {
      remaining++;
    }
  }
  currentGrid.remainingCount = remaining;

  // Restore segment visibility
  for (const [segId, vis] of Object.entries(step.boardState.segmentVisibility)) {
    const existing = segmentStates.get(segId);
    if (existing) {
      segmentStates.set(segId, { ...existing, visibility: vis as SegmentState['visibility'] });
    } else {
      segmentStates.set(segId, {
        visibility: vis as SegmentState['visibility'],
        savedVisibility: 'visible',
        activated: vis !== 'invisible',
      });
    }
  }

  // Restore hidden flower clues
  hiddenFlowerClues = new Set(step.boardState.hiddenFlowerClues);

  render();
}

function handleHumanPlay(): void {
  // Cover all cells
  currentGrid.coverAll();

  // Hide all segments and flower clues first
  for (const seg of currentGrid.segments.keys()) {
    segmentStates.set(seg, {
      visibility: 'invisible',
      savedVisibility: 'visible',
      activated: false,
    });
  }
  hiddenFlowerClues = new Set<string>();
  for (const [key, cell] of currentGrid.cells) {
    if (cell.flowerClueValue !== null) {
      hiddenFlowerClues.add(key);
    }
  }

  // Open cells whose neighbor clues were activated (keys starting with "cell:")
  for (const clueId of solveActivatedClues) {
    if (clueId.startsWith('cell:')) {
      const coordStr = clueId.slice(5);
      const cell = currentGrid.cells.get(coordStr);
      if (cell && cell.visualState === CellVisualState.COVERED) {
        currentGrid.openCell({ col: parseInt(coordStr.split(',')[0]), row: parseInt(coordStr.split(',')[1]) });
      }
    }
  }

  // Show activated line segments and flower clues
  for (const clueId of solveActivatedClues) {
    if (clueId.startsWith('line:')) {
      const segId = clueId.slice(5);
      const existing = segmentStates.get(segId);
      if (existing) {
        segmentStates.set(segId, { ...existing, visibility: 'visible', activated: true });
      }
    } else if (clueId.startsWith('flower:')) {
      const flowerKey = clueId.slice(7);
      hiddenFlowerClues.delete(flowerKey);
    }
  }

  // Hide replay + post-solve buttons
  replayControls.hide();
  postSolveEl.style.display = 'none';
  actionHistory = new ActionHistory();
  render();
}

// Initialize counters
initCounters(countersEl);

// Initialize settings modal
const settingsModal = initSettingsModal(settingsModalEl, settingsOverlayEl, {
  onSolve: handleSolve,
  onCancel: () => {},
});

// Initialize replay controls
const replayControls = initReplayControls(replayEl, {
  onStepChange: (step: TraceStep, _index: number) => {
    applyBoardState(step);
  },
});

// Initialize post-solve buttons
const savePuzzleBtn = document.createElement('button');
savePuzzleBtn.textContent = 'Save Puzzle';
savePuzzleBtn.addEventListener('click', handleSave);
postSolveEl.appendChild(savePuzzleBtn);

const humanPlayBtn = document.createElement('button');
humanPlayBtn.textContent = 'Human Play';
humanPlayBtn.addEventListener('click', handleHumanPlay);
postSolveEl.appendChild(humanPlayBtn);

const DEFAULT_GRID_INDEX = TEST_GRIDS.findIndex(g => g.name === 'Large Grid');

initControls(controlsEl, {
  gridNames: TEST_GRIDS.map(g => g.name),
  initialGridIndex: DEFAULT_GRID_INDEX >= 0 ? DEFAULT_GRID_INDEX : 0,
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

// Add Settings button after controls init
const settingsSeparator = document.createElement('span');
settingsSeparator.textContent = '|';
settingsSeparator.style.opacity = '0.3';
controlsEl.appendChild(settingsSeparator);

const settingsBtn = document.createElement('button');
settingsBtn.textContent = 'Settings';
settingsBtn.addEventListener('click', () => settingsModal.open());
controlsEl.appendChild(settingsBtn);

const solveBtn = document.createElement('button');
solveBtn.textContent = 'Solve';
solveBtn.addEventListener('click', () => handleSolve(settingsModal.getConfig()));
controlsEl.appendChild(solveBtn);

loadGrid(DEFAULT_GRID_INDEX >= 0 ? DEFAULT_GRID_INDEX : 0);
