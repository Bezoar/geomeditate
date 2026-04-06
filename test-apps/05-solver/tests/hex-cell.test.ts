import { describe, it, expect } from 'vitest';
import {
  CellGroundTruth,
  CellVisualState,
  type HexCell,
  openCell,
  markCell,
  recoverCell,
  toggleGroundTruth,
  createCell,
  revealCell,
} from '../src/model/hex-cell';

describe('createCell', () => {
  it('creates a covered cell with given ground truth', () => {
    const cell = createCell({ col: 0, row: 0 }, CellGroundTruth.FILLED);
    expect(cell.groundTruth).toBe(CellGroundTruth.FILLED);
    expect(cell.visualState).toBe(CellVisualState.COVERED);
  });

  it('defaults contiguityEnabled to true', () => {
    const cell = createCell({ col: 0, row: 0 }, CellGroundTruth.EMPTY);
    expect(cell.contiguityEnabled).toBe(true);
  });
});

describe('revealCell', () => {
  it('reveals an empty cell as OPEN_EMPTY', () => {
    const cell = createCell({ col: 0, row: 0 }, CellGroundTruth.EMPTY);
    const revealed = revealCell(cell);
    expect(revealed.visualState).toBe(CellVisualState.OPEN_EMPTY);
  });

  it('reveals a filled cell as MARKED_FILLED', () => {
    const cell = createCell({ col: 0, row: 0 }, CellGroundTruth.FILLED);
    const revealed = revealCell(cell);
    expect(revealed.visualState).toBe(CellVisualState.MARKED_FILLED);
  });
});

describe('openCell', () => {
  it('opens a covered empty cell to OPEN_EMPTY', () => {
    const cell = createCell({ col: 0, row: 0 }, CellGroundTruth.EMPTY);
    const result = openCell(cell);
    expect(result.cell.visualState).toBe(CellVisualState.OPEN_EMPTY);
    expect(result.isMistake).toBe(false);
  });

  it('keeps a covered filled cell COVERED and flags mistake', () => {
    const cell = createCell({ col: 0, row: 0 }, CellGroundTruth.FILLED);
    const result = openCell(cell);
    expect(result.cell.visualState).toBe(CellVisualState.COVERED);
    expect(result.isMistake).toBe(true);
  });

  it('is a no-op on an already open cell', () => {
    const cell: HexCell = {
      coord: { col: 0, row: 0 },
      groundTruth: CellGroundTruth.EMPTY,
      visualState: CellVisualState.OPEN_EMPTY,
      neighborClueValue: null,
      neighborClueNotation: null,
      contiguityEnabled: true,
      flowerClueValue: null,
    };
    const result = openCell(cell);
    expect(result.cell.visualState).toBe(CellVisualState.OPEN_EMPTY);
    expect(result.isMistake).toBe(false);
  });

  it('is a no-op on a marked cell', () => {
    const cell: HexCell = {
      coord: { col: 0, row: 0 },
      groundTruth: CellGroundTruth.FILLED,
      visualState: CellVisualState.MARKED_FILLED,
      neighborClueValue: null,
      neighborClueNotation: null,
      contiguityEnabled: true,
      flowerClueValue: null,
    };
    const result = openCell(cell);
    expect(result.cell.visualState).toBe(CellVisualState.MARKED_FILLED);
    expect(result.isMistake).toBe(false);
  });
});

describe('markCell', () => {
  it('marks a covered filled cell as MARKED_FILLED without mistake', () => {
    const cell = createCell({ col: 0, row: 0 }, CellGroundTruth.FILLED);
    const result = markCell(cell);
    expect(result.cell.visualState).toBe(CellVisualState.MARKED_FILLED);
    expect(result.isMistake).toBe(false);
  });

  it('keeps a covered empty cell COVERED and flags mistake', () => {
    const cell = createCell({ col: 0, row: 0 }, CellGroundTruth.EMPTY);
    const result = markCell(cell);
    expect(result.cell.visualState).toBe(CellVisualState.COVERED);
    expect(result.isMistake).toBe(true);
  });

  it('is a no-op on an already open cell', () => {
    const cell: HexCell = {
      coord: { col: 0, row: 0 },
      groundTruth: CellGroundTruth.EMPTY,
      visualState: CellVisualState.OPEN_EMPTY,
      neighborClueValue: null,
      neighborClueNotation: null,
      contiguityEnabled: true,
      flowerClueValue: null,
    };
    const result = markCell(cell);
    expect(result.cell.visualState).toBe(CellVisualState.OPEN_EMPTY);
    expect(result.isMistake).toBe(false);
  });

  it('is a no-op on an already marked cell', () => {
    const cell: HexCell = {
      coord: { col: 0, row: 0 },
      groundTruth: CellGroundTruth.FILLED,
      visualState: CellVisualState.MARKED_FILLED,
      neighborClueValue: null,
      neighborClueNotation: null,
      contiguityEnabled: true,
      flowerClueValue: null,
    };
    const result = markCell(cell);
    expect(result.cell.visualState).toBe(CellVisualState.MARKED_FILLED);
    expect(result.isMistake).toBe(false);
  });
});

describe('recoverCell', () => {
  it('re-covers an open empty cell', () => {
    const cell: HexCell = {
      coord: { col: 0, row: 0 },
      groundTruth: CellGroundTruth.EMPTY,
      visualState: CellVisualState.OPEN_EMPTY,
      neighborClueValue: null,
      neighborClueNotation: null,
      contiguityEnabled: true,
      flowerClueValue: null,
    };
    const result = recoverCell(cell);
    expect(result.visualState).toBe(CellVisualState.COVERED);
  });

  it('re-covers a marked filled cell', () => {
    const cell: HexCell = {
      coord: { col: 0, row: 0 },
      groundTruth: CellGroundTruth.FILLED,
      visualState: CellVisualState.MARKED_FILLED,
      neighborClueValue: null,
      neighborClueNotation: null,
      contiguityEnabled: true,
      flowerClueValue: null,
    };
    const result = recoverCell(cell);
    expect(result.visualState).toBe(CellVisualState.COVERED);
  });

  it('is a no-op on an already covered cell', () => {
    const cell = createCell({ col: 0, row: 0 }, CellGroundTruth.EMPTY);
    const result = recoverCell(cell);
    expect(result.visualState).toBe(CellVisualState.COVERED);
  });
});

describe('toggleGroundTruth', () => {
  it('toggles FILLED to EMPTY', () => {
    const cell = createCell({ col: 0, row: 0 }, CellGroundTruth.FILLED);
    const result = toggleGroundTruth(cell);
    expect(result.groundTruth).toBe(CellGroundTruth.EMPTY);
  });

  it('toggles EMPTY to FILLED', () => {
    const cell = createCell({ col: 0, row: 0 }, CellGroundTruth.EMPTY);
    const result = toggleGroundTruth(cell);
    expect(result.groundTruth).toBe(CellGroundTruth.FILLED);
  });

  it('preserves the visual state when toggling', () => {
    const cell: HexCell = {
      coord: { col: 0, row: 0 },
      groundTruth: CellGroundTruth.FILLED,
      visualState: CellVisualState.MARKED_FILLED,
      neighborClueValue: null,
      neighborClueNotation: null,
      contiguityEnabled: true,
      flowerClueValue: null,
    };
    const result = toggleGroundTruth(cell);
    expect(result.groundTruth).toBe(CellGroundTruth.EMPTY);
    // Visual state preserved — caller is responsible for updating display
    expect(result.visualState).toBe(CellVisualState.MARKED_FILLED);
  });

  it('preserves coordinates', () => {
    const cell = createCell({ col: 3, row: 7 }, CellGroundTruth.EMPTY);
    const result = toggleGroundTruth(cell);
    expect(result.coord).toEqual({ col: 3, row: 7 });
  });
});
