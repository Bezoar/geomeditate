import { HexGrid } from './model/hex-grid';
import { TEST_GRIDS } from './grids/test-grids';
import { generateRandomGrid } from './grids/random-grid';
import { renderGrid, type CellInteraction } from './view/grid-renderer';
import { renderClues, type ClueRenderOptions } from './view/clue-renderer';
import { initControls } from './view/controls';
import { coordKey } from './model/hex-coord';
import type { HexCoord } from './model/hex-coord';
import { CellGroundTruth, CellVisualState } from './model/hex-cell';
import type { LineClueState } from './view/line-clue-state';
import { ActionHistory } from './save/history';
import { serializeSaveFile, deserializeSaveFile } from './save/save-file';
import { LocalStorageBackend, downloadJsonFile } from './save/storage';
import { generatePuzzle } from './solver/pipeline';

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

function handleSave(): void {
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
  const now = new Date();
  const ts = now.toISOString().slice(0, 19).replace(/:/g, '-');
  downloadJsonFile(json, `puzzle-${ts}.json`);
  storage.save('autosave', json);
}

function loadFromJson(json: string): void {
  const result = deserializeSaveFile(json);
  currentGrid = result.grid;
  lineClueStates = result.lineClueStates;
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

/** Individual cell reveal for step-by-step replay. */
interface CellReveal {
  key: string;
  visualState: CellVisualState;
  reason: string;
}

interface FlattenedReplay {
  preReveals: CellReveal[];
  deductions: CellReveal[];
}

/** Separate pre-reveals from actual deductions. */
function flattenReplay(replay: import('./solver/verifier').SolveReplay): FlattenedReplay {
  const preReveals: CellReveal[] = [];
  const deductions: CellReveal[] = [];
  for (const step of replay.steps) {
    for (const d of step.deductions) {
      const key = coordKey(d.coord);
      const reveal: CellReveal = {
        key,
        visualState: d.result === 'filled' ? CellVisualState.MARKED_FILLED : CellVisualState.OPEN_EMPTY,
        reason: d.reason.explanation,
      };
      if (d.reason.explanation === 'Pre-revealed by clue selection') {
        preReveals.push(reveal);
      } else {
        deductions.push(reveal);
      }
    }
  }
  return { preReveals, deductions };
}

/** Apply pre-reveals + deductions up to index N to the live grid. */
function applyReplayState(preReveals: CellReveal[], deductions: CellReveal[], n: number): void {
  // Reset all to covered first
  for (const [key, cell] of currentGrid.cells) {
    if (cell.visualState !== CellVisualState.COVERED) {
      currentGrid.cells.set(key, { ...cell, visualState: CellVisualState.COVERED });
    }
  }
  // Always apply all pre-reveals
  for (const r of preReveals) {
    const cell = currentGrid.cells.get(r.key);
    if (cell) {
      currentGrid.cells.set(r.key, { ...cell, visualState: r.visualState });
    }
  }
  // Apply deductions 0..n
  for (let i = 0; i <= n; i++) {
    const r = deductions[i];
    const cell = currentGrid.cells.get(r.key);
    if (cell) {
      currentGrid.cells.set(r.key, { ...cell, visualState: r.visualState });
    }
  }
  // Recount remaining
  let remaining = 0;
  for (const cell of currentGrid.cells.values()) {
    if (cell.groundTruth === CellGroundTruth.FILLED && cell.visualState !== CellVisualState.MARKED_FILLED) {
      remaining++;
    }
  }
  currentGrid.remainingCount = remaining;
}

let replayPreReveals: CellReveal[] = [];
let flatReveals: CellReveal[] = [];
let replayIndex = -1;
let playTimerId: ReturnType<typeof setTimeout> | null = null;

function updateReplayStatus(): void {
  const statusEl = document.getElementById('replay-status');
  if (statusEl === null) return;
  const stepText = 'Step ' + String(replayIndex + 1) + '/' + String(flatReveals.length);
  if (replayIndex >= 0 && replayIndex < flatReveals.length) {
    const r = flatReveals[replayIndex];
    statusEl.textContent = stepText + ' — ' + r.key + ' ' + r.reason;
  } else {
    statusEl.textContent = stepText;
  }
}

function replayStepForward(): void {
  if (replayIndex < flatReveals.length - 1) {
    replayIndex++;
    applyReplayState(replayPreReveals, flatReveals, replayIndex);
    updateReplayStatus();
    render();
  }
}

function replayStepBack(): void {
  if (replayIndex >= 0) {
    replayIndex--;
    applyReplayState(replayPreReveals, flatReveals, replayIndex);
    updateReplayStatus();
    render();
  }
}

function replayPlay(): void {
  const playPauseBtn = document.getElementById('play-pause-btn');
  if (playTimerId !== null) {
    // Pause
    clearTimeout(playTimerId);
    playTimerId = null;
    if (playPauseBtn) playPauseBtn.textContent = 'Play';
    return;
  }
  if (playPauseBtn) playPauseBtn.textContent = 'Pause';
  function tick() {
    if (replayIndex < flatReveals.length - 1) {
      replayStepForward();
      playTimerId = setTimeout(tick, 200);
    } else {
      playTimerId = null;
      if (playPauseBtn) playPauseBtn.textContent = 'Play';
    }
  }
  tick();
}

function handleSolve(): void {
  // Stop any playing replay
  if (playTimerId !== null) { clearTimeout(playTimerId); playTimerId = null; }

  // Show "Solving..." feedback immediately, defer expensive work
  const solveButton = document.getElementById('solve-btn') as HTMLButtonElement | null;
  const statusEl = document.getElementById('replay-status');
  if (statusEl !== null) statusEl.textContent = 'Solving...';
  const replayDiv = document.getElementById('replay-controls');
  if (replayDiv !== null) replayDiv.style.display = '';
  if (solveButton !== null) { solveButton.disabled = true; solveButton.textContent = 'Solving...'; }

  setTimeout(() => {
    const diffSelect = document.getElementById('difficulty-select') as HTMLSelectElement | null;
    const difficulty = (diffSelect?.value === 'hard' ? 'hard' : 'easy') as 'easy' | 'hard';
    const result = generatePuzzle(currentGrid, difficulty);
    if (solveButton !== null) { solveButton.disabled = false; solveButton.textContent = 'Solve'; }

    if (result === null) {
      if (statusEl !== null) statusEl.textContent = 'No solution found';
      return;
    }

    currentGrid.coverAll();
    actionHistory.clear();

    const flattened = flattenReplay(result.replay);
    replayPreReveals = flattened.preReveals;
    flatReveals = flattened.deductions;
    replayIndex = -1;

    // Apply pre-reveals as the starting state
    applyReplayState(replayPreReveals, flatReveals, -1);
    updateReplayStatus();
    render();
  }, 0);
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

// Difficulty selector
const difficultySelect = document.createElement('select');
difficultySelect.id = 'difficulty-select';
const easyOpt = document.createElement('option');
easyOpt.value = 'easy';
easyOpt.textContent = 'Easy';
const hardOpt = document.createElement('option');
hardOpt.value = 'hard';
hardOpt.textContent = 'Hard';
difficultySelect.appendChild(easyOpt);
difficultySelect.appendChild(hardOpt);
controlsEl.appendChild(difficultySelect);

// Solve button
const solveBtn = document.createElement('button');
solveBtn.id = 'solve-btn';
solveBtn.textContent = 'Solve';
solveBtn.addEventListener('click', handleSolve);
controlsEl.appendChild(solveBtn);

// Replay controls (initially hidden)
const replayDiv = document.createElement('div');
replayDiv.id = 'replay-controls';
replayDiv.style.display = 'none';

const prevBtn = document.createElement('button');
prevBtn.textContent = 'Prev';
prevBtn.addEventListener('click', replayStepBack);

const nextBtn = document.createElement('button');
nextBtn.textContent = 'Next';
nextBtn.addEventListener('click', replayStepForward);

const playPauseBtn = document.createElement('button');
playPauseBtn.id = 'play-pause-btn';
playPauseBtn.textContent = 'Play';
playPauseBtn.addEventListener('click', replayPlay);

const statusSpan = document.createElement('span');
statusSpan.id = 'replay-status';
statusSpan.textContent = '';

replayDiv.appendChild(prevBtn);
replayDiv.appendChild(nextBtn);
replayDiv.appendChild(playPauseBtn);
replayDiv.appendChild(statusSpan);
controlsEl.appendChild(replayDiv);

loadGrid(0);
