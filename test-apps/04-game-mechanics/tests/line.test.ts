import { describe, it, expect } from 'vitest';
import { coordKey, type HexCoord } from '../src/model/hex-coord';
import { CellGroundTruth, ClueNotation, createCell, type HexCell } from '../src/model/hex-cell';
import {
  segmentId,
  lineGroupId,
  computeAllSegmentsAndGroups,
} from '../src/clues/line';

// --- helpers ---

/** Build a cellMap from an array of [col, row, groundTruth] tuples. */
function buildCellMap(
  entries: Array<[number, number, CellGroundTruth]>,
): Map<string, HexCell> {
  const map = new Map<string, HexCell>();
  for (const [col, row, gt] of entries) {
    const coord: HexCoord = { col, row };
    map.set(coordKey(coord), createCell(coord, gt));
  }
  return map;
}

const F = CellGroundTruth.FILLED;
const E = CellGroundTruth.EMPTY;

// --- Task 3 & 4: Segment/LineGroup types and computeAllSegmentsAndGroups ---

describe('segmentId', () => {
  it('produces seg:<axis>:<col>,<row> format', () => {
    expect(segmentId('vertical', { col: 2, row: 0 })).toBe('seg:vertical:2,0');
    expect(segmentId('left-facing', { col: 3, row: -1 })).toBe('seg:left-facing:3,-1');
    expect(segmentId('right-facing', { col: 0, row: 5 })).toBe('seg:right-facing:0,5');
  });
});

describe('lineGroupId', () => {
  it('produces line:<axis>:<col>,<row> format', () => {
    expect(lineGroupId('vertical', { col: 2, row: 0 })).toBe('line:vertical:2,0');
    expect(lineGroupId('left-facing', { col: 0, row: 1 })).toBe('line:left-facing:0,1');
    expect(lineGroupId('right-facing', { col: 1, row: 0 })).toBe('line:right-facing:1,0');
  });
});

describe('computeAllSegmentsAndGroups', () => {
  it('returns empty maps for an empty cellMap', () => {
    const cellMap = new Map<string, HexCell>();
    const { segments, lineGroups } = computeAllSegmentsAndGroups(cellMap);
    expect(segments.size).toBe(0);
    expect(lineGroups.size).toBe(0);
  });

  describe('simple vertical column (no gaps)', () => {
    // Cells: (2,0), (2,1), (2,2) — all filled
    // Expected: 1 vertical LineGroup starting at (2,0)
    //           edge segment at predecessor(2,0,'vertical') = (2,-1), covers all 3 cells
    const cellMap = buildCellMap([
      [2, 0, F],
      [2, 1, F],
      [2, 2, F],
    ]);

    it('produces exactly one LineGroup for the vertical line', () => {
      const { lineGroups } = computeAllSegmentsAndGroups(cellMap);
      const vertGroups = [...lineGroups.values()].filter(g => g.axis === 'vertical');
      expect(vertGroups).toHaveLength(1);
      const grp = vertGroups[0];
      expect(grp.startCoord).toEqual({ col: 2, row: 0 });
      expect(grp.endCoord).toEqual({ col: 2, row: 2 });
      expect(grp.allCells.map(coordKey)).toEqual(['2,0', '2,1', '2,2']);
      expect(grp.gapPositions).toHaveLength(0);
    });

    it('produces exactly one edge Segment for the vertical line', () => {
      const { segments, lineGroups } = computeAllSegmentsAndGroups(cellMap);
      const vertGroups = [...lineGroups.values()].filter(g => g.axis === 'vertical');
      const grp = vertGroups[0];
      expect(grp.segmentIds).toHaveLength(1);

      const seg = segments.get(grp.segmentIds[0])!;
      expect(seg).toBeDefined();
      expect(seg.isEdgeClue).toBe(true);
      expect(seg.axis).toBe('vertical');
      // predecessor of (2,0) vertical is (2,-1)
      expect(seg.cluePosition).toEqual({ col: 2, row: -1 });
      expect(seg.cells.map(coordKey)).toEqual(['2,0', '2,1', '2,2']);
      expect(seg.value).toBe(3);
      expect(seg.contiguityEnabled).toBe(true);
    });
  });

  describe('vertical column with one gap', () => {
    // Cells: (2,0)=F, (2,1)=F, gap at (2,2), (2,3)=F
    // LineGroup: allCells=[(2,0),(2,1),(2,3)], gapPositions=[(2,2)]
    // Edge segment at (2,-1): cells=[(2,0),(2,1),(2,3)], value=3
    // Gap segment at (2,2): cells=[(2,3)], value=1
    const cellMap = buildCellMap([
      [2, 0, F],
      [2, 1, F],
      // (2,2) missing — gap
      [2, 3, F],
    ]);

    it('produces one LineGroup with one gap position', () => {
      const { lineGroups } = computeAllSegmentsAndGroups(cellMap);
      const vertGroups = [...lineGroups.values()].filter(g => g.axis === 'vertical');
      expect(vertGroups).toHaveLength(1);
      const grp = vertGroups[0];
      expect(grp.allCells.map(coordKey)).toEqual(['2,0', '2,1', '2,3']);
      expect(grp.gapPositions.map(coordKey)).toEqual(['2,2']);
      expect(grp.segmentIds).toHaveLength(2);
    });

    it('produces an edge segment covering all game cells', () => {
      const { segments, lineGroups } = computeAllSegmentsAndGroups(cellMap);
      const grp = [...lineGroups.values()].find(g => g.axis === 'vertical')!;
      const edgeSeg = [...segments.values()].find(
        s => s.lineGroupId === grp.id && s.isEdgeClue,
      )!;
      expect(edgeSeg.cluePosition).toEqual({ col: 2, row: -1 });
      expect(edgeSeg.cells.map(coordKey)).toEqual(['2,0', '2,1', '2,3']);
      expect(edgeSeg.value).toBe(3);
    });

    it('produces a gap segment covering only cells after the gap', () => {
      const { segments, lineGroups } = computeAllSegmentsAndGroups(cellMap);
      const grp = [...lineGroups.values()].find(g => g.axis === 'vertical')!;
      const gapSeg = [...segments.values()].find(
        s => s.lineGroupId === grp.id && !s.isEdgeClue,
      )!;
      expect(gapSeg.cluePosition).toEqual({ col: 2, row: 2 });
      expect(gapSeg.cells.map(coordKey)).toEqual(['2,3']);
      expect(gapSeg.value).toBe(1);
      expect(gapSeg.isEdgeClue).toBe(false);
    });
  });

  describe('contiguity ignores gaps (key design rule)', () => {
    // Cells: (2,0)=F, gap at (2,1), (2,2)=F
    // Edge segment cells=[(2,0),(2,2)], filled flags=[true,true] → CONTIGUOUS
    it('two filled cells separated only by a gap are CONTIGUOUS in the edge segment', () => {
      const cellMap = buildCellMap([
        [2, 0, F],
        // (2,1) missing — gap
        [2, 2, F],
      ]);
      const { segments, lineGroups } = computeAllSegmentsAndGroups(cellMap);
      const grp = [...lineGroups.values()].find(g => g.axis === 'vertical')!;
      const edgeSeg = [...segments.values()].find(
        s => s.lineGroupId === grp.id && s.isEdgeClue,
      )!;
      expect(edgeSeg.cells.map(coordKey)).toEqual(['2,0', '2,2']);
      expect(edgeSeg.value).toBe(2);
      expect(edgeSeg.notation).toBe(ClueNotation.CONTIGUOUS);
    });
  });

  describe('discontiguous: empty game cell between filled cells', () => {
    // Cells: (2,0)=F, (2,1)=E, (2,2)=F
    // Edge segment cells=[(2,0),(2,1),(2,2)], filled flags=[T,F,T] → DISCONTIGUOUS
    it('filled / empty game cell / filled → DISCONTIGUOUS', () => {
      const cellMap = buildCellMap([
        [2, 0, F],
        [2, 1, E],
        [2, 2, F],
      ]);
      const { segments, lineGroups } = computeAllSegmentsAndGroups(cellMap);
      const grp = [...lineGroups.values()].find(g => g.axis === 'vertical')!;
      const edgeSeg = [...segments.values()].find(
        s => s.lineGroupId === grp.id && s.isEdgeClue,
      )!;
      expect(edgeSeg.cells.map(coordKey)).toEqual(['2,0', '2,1', '2,2']);
      expect(edgeSeg.value).toBe(2);
      expect(edgeSeg.notation).toBe(ClueNotation.DISCONTIGUOUS);
    });
  });

  describe('multiple gaps', () => {
    // Cells: (2,0)=F, gap at (2,1), (2,2)=F, gap at (2,3), (2,4)=F
    // LineGroup: allCells=[(2,0),(2,2),(2,4)], gapPositions=[(2,1),(2,3)]
    // edge segment at (2,-1): cells=[(2,0),(2,2),(2,4)]
    // gap segment at (2,1): cells=[(2,2),(2,4)]
    // gap segment at (2,3): cells=[(2,4)]
    const cellMap = buildCellMap([
      [2, 0, F],
      // gap at (2,1)
      [2, 2, F],
      // gap at (2,3)
      [2, 4, F],
    ]);

    it('produces one edge segment and one gap segment per gap', () => {
      const { lineGroups } = computeAllSegmentsAndGroups(cellMap);
      const grp = [...lineGroups.values()].find(g => g.axis === 'vertical')!;
      expect(grp.gapPositions).toHaveLength(2);
      expect(grp.segmentIds).toHaveLength(3); // 1 edge + 2 gap
    });

    it('gap segment at first gap covers cells after that gap (overlapping ranges)', () => {
      const { segments } = computeAllSegmentsAndGroups(cellMap);
      const gap1Seg = segments.get(segmentId('vertical', { col: 2, row: 1 }))!;
      expect(gap1Seg).toBeDefined();
      expect(gap1Seg.cells.map(coordKey)).toEqual(['2,2', '2,4']);
    });

    it('gap segment at second gap covers only cells after that gap', () => {
      const { segments } = computeAllSegmentsAndGroups(cellMap);
      const gap2Seg = segments.get(segmentId('vertical', { col: 2, row: 3 }))!;
      expect(gap2Seg).toBeDefined();
      expect(gap2Seg.cells.map(coordKey)).toEqual(['2,4']);
    });
  });

  describe('left-facing diagonal segments', () => {
    // Left-facing from (0,1): (0,1) -> (1,0) -> (2,0) (using even/odd col offsets)
    // even col (0) step left-facing: [+1,-1] → (1,0)
    // odd col (1) step left-facing: [+1,0]  → (2,0)
    // predecessor of (0,1) left-facing: predIsEven=(0%2!==0)=false → {-1,1}
    const cellMap = buildCellMap([
      [0, 1, F],
      [1, 0, F],
      [2, 0, E],
    ]);

    it('produces a LineGroup and edge Segment for a left-facing line', () => {
      const { segments, lineGroups } = computeAllSegmentsAndGroups(cellMap);
      const grp = [...lineGroups.values()].find(
        g => g.axis === 'left-facing' && coordKey(g.startCoord) === '0,1',
      )!;
      expect(grp).toBeDefined();
      expect(grp.allCells.map(coordKey)).toEqual(['0,1', '1,0', '2,0']);

      const edgeSeg = [...segments.values()].find(
        s => s.lineGroupId === grp.id && s.isEdgeClue,
      )!;
      expect(edgeSeg).toBeDefined();
      expect(edgeSeg.axis).toBe('left-facing');
      // predecessor of (0,1) left-facing: col-1=-1, predIsEven=false → {col-1,row}={-1,1}
      expect(edgeSeg.cluePosition).toEqual({ col: -1, row: 1 });
      expect(edgeSeg.cells.map(coordKey)).toEqual(['0,1', '1,0', '2,0']);
      expect(edgeSeg.value).toBe(2);
    });
  });

  describe('right-facing diagonal segments', () => {
    // Right-facing from (0,0): (0,0) -> (1,0) -> (2,1)
    // even col (0) step right-facing: [+1,0] → (1,0)
    // odd col (1) step right-facing: [+1,+1] → (2,1)
    // predecessor of (0,0) right-facing: predIsEven=(0%2!==0)=false → {col-1,row-1}={-1,-1}
    const cellMap = buildCellMap([
      [0, 0, F],
      [1, 0, E],
      [2, 1, F],
    ]);

    it('produces a LineGroup and edge Segment for a right-facing line', () => {
      const { segments, lineGroups } = computeAllSegmentsAndGroups(cellMap);
      const grp = [...lineGroups.values()].find(
        g => g.axis === 'right-facing' && coordKey(g.startCoord) === '0,0',
      )!;
      expect(grp).toBeDefined();
      expect(grp.allCells.map(coordKey)).toEqual(['0,0', '1,0', '2,1']);

      const edgeSeg = [...segments.values()].find(
        s => s.lineGroupId === grp.id && s.isEdgeClue,
      )!;
      expect(edgeSeg).toBeDefined();
      expect(edgeSeg.axis).toBe('right-facing');
      // predecessor of (0,0) right-facing: predIsEven=false → {-1,-1}
      expect(edgeSeg.cluePosition).toEqual({ col: -1, row: -1 });
      expect(edgeSeg.cells.map(coordKey)).toEqual(['0,0', '1,0', '2,1']);
      expect(edgeSeg.value).toBe(2);
    });
  });

  describe('single-cell line', () => {
    // An isolated cell at (5,5) is a start on all 3 axes → 3 LineGroups, 3 edge Segments
    const cellMap = buildCellMap([[5, 5, F]]);

    it('produces 3 LineGroups (one per axis)', () => {
      const { lineGroups } = computeAllSegmentsAndGroups(cellMap);
      // Filter to those containing (5,5)
      const grps = [...lineGroups.values()].filter(
        g => coordKey(g.startCoord) === '5,5',
      );
      const axes = grps.map(g => g.axis).sort();
      expect(axes).toEqual(['left-facing', 'right-facing', 'vertical']);
    });

    it('produces 3 edge segments (one per axis), all isEdgeClue=true', () => {
      const { segments } = computeAllSegmentsAndGroups(cellMap);
      const edgeSegs = [...segments.values()].filter(s => s.isEdgeClue);
      // Each edge segment covers cell (5,5)
      const cellKeys = edgeSegs.flatMap(s => s.cells.map(coordKey));
      expect(cellKeys.every(k => k === '5,5')).toBe(true);
      const segAxes = edgeSegs.map(s => s.axis).sort();
      expect(segAxes).toEqual(['left-facing', 'right-facing', 'vertical']);
    });

    it('single-cell line has no gap segments', () => {
      const { lineGroups } = computeAllSegmentsAndGroups(cellMap);
      for (const grp of lineGroups.values()) {
        expect(grp.gapPositions).toHaveLength(0);
        expect(grp.segmentIds).toHaveLength(1);
      }
    });
  });

  describe('all segment IDs unique across a multi-cell grid', () => {
    it('no duplicate segment IDs on a 2x3 grid', () => {
      const cellMap = buildCellMap([
        [0, 0, F],
        [0, 1, E],
        [0, 2, F],
        [1, 0, F],
        [1, 1, F],
        [1, 2, E],
      ]);
      const { segments } = computeAllSegmentsAndGroups(cellMap);
      const ids = [...segments.keys()];
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
