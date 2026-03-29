import { HexGrid } from './model/hex-grid';
import { TEST_GRIDS } from './grids/test-grids';
import { renderGrid, type CellInteraction } from './view/grid-renderer';
import { renderClues } from './view/clue-renderer';
import type { HexCoord } from './model/hex-coord';

const svgEl = document.getElementById('grid-svg') as unknown as SVGElement;

let currentGrid: HexGrid;

function updateHud(): void {
  document.getElementById('remaining')!.textContent = String(currentGrid.remainingCount);
  document.getElementById('mistakes')!.textContent = String(currentGrid.mistakeCount);
}

function render(): void {
  renderGrid(currentGrid, svgEl, handleCellClick);
  renderClues(currentGrid, svgEl);
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
  }
  render();
}

function loadGrid(index: number): void {
  const config = TEST_GRIDS[index];
  currentGrid = new HexGrid(config);
  currentGrid.computeAllClues();
  render();
}

loadGrid(0);
