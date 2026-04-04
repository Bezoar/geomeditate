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
import { ReplayController, type ReplayHighlights } from './view/solve-replay';

const svgEl = document.getElementById('grid-svg') as unknown as SVGElement;
const controlsEl = document.getElementById('controls')!;

let currentGrid: HexGrid;
let lineClueStates = new Map<string, LineClueState>();
let hiddenFlowerClues = new Set<string>();
let dimmedFlowerClues = new Set<string>();
let flowerGuideClues = new Set<string>();
let actionHistory = new ActionHistory();
const storage = new LocalStorageBackend();
let replayController: ReplayController | null = null;

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

/** Apply a board state snapshot from the verifier to the live grid. */
function applyBoardState(boardState: Map<string, CellVisualState>): void {
  let remaining = 0;
  for (const [key, cell] of currentGrid.cells) {
    const newState = boardState.get(key);
    if (newState !== undefined && newState !== cell.visualState) {
      currentGrid.cells.set(key, { ...cell, visualState: newState });
    }
    const c = currentGrid.cells.get(key)!;
    if (c.groundTruth === CellGroundTruth.FILLED && c.visualState !== CellVisualState.MARKED_FILLED) {
      remaining++;
    }
  }
  currentGrid.remainingCount = remaining;
}

function updateReplayStatus(stepIndex: number, total: number): void {
  const statusEl = document.getElementById('replay-status');
  if (statusEl === null) return;
  if (stepIndex === -1) {
    statusEl.textContent = 'Step 0/' + String(total);
  } else if (replayController !== null && replayController.isStuck && stepIndex === total) {
    statusEl.textContent = 'Stuck';
  } else {
    statusEl.textContent = 'Step ' + String(stepIndex + 1) + '/' + String(total);
  }
}

function handleSolve(): void {
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

    replayController = new ReplayController(
      result.replay,
      (_highlights: ReplayHighlights, stepIndex: number, total: number) => {
        // Apply the board state snapshot to the live grid
        if (stepIndex === -1) {
          // Reset to all covered
          currentGrid.coverAll();
        } else if (stepIndex < result.replay.steps.length) {
          applyBoardState(result.replay.steps[stepIndex].boardState);
        } else if (result.replay.stuck && stepIndex === result.replay.steps.length) {
          // Stuck state — show last known board state
          const lastStep = result.replay.steps[result.replay.steps.length - 1];
          if (lastStep) applyBoardState(lastStep.boardState);
        }
        updateReplayStatus(stepIndex, total);
        render();
      },
      500,
    );

    if (statusEl !== null) statusEl.textContent = 'Step 0/' + String(result.replay.steps.length);
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
prevBtn.addEventListener('click', () => { replayController?.stepBack(); });

const nextBtn = document.createElement('button');
nextBtn.textContent = 'Next';
nextBtn.addEventListener('click', () => { replayController?.stepForward(); });

const playPauseBtn = document.createElement('button');
playPauseBtn.textContent = 'Play';
playPauseBtn.addEventListener('click', () => {
  if (replayController === null) return;
  if (replayController.isPlaying) {
    replayController.pause();
    playPauseBtn.textContent = 'Play';
  } else {
    replayController.play();
    playPauseBtn.textContent = 'Pause';
  }
});

const statusSpan = document.createElement('span');
statusSpan.id = 'replay-status';
statusSpan.textContent = '';

replayDiv.appendChild(prevBtn);
replayDiv.appendChild(nextBtn);
replayDiv.appendChild(playPauseBtn);
replayDiv.appendChild(statusSpan);
controlsEl.appendChild(replayDiv);

loadGrid(0);
