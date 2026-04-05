import type { Segment } from '../clues/line';

export type SegmentVisibility = 'invisible' | 'visible' | 'visible-with-line' | 'dimmed';

export interface SegmentState {
  visibility: SegmentVisibility;
  savedVisibility: 'visible' | 'visible-with-line' | 'dimmed';
  activated: boolean;
}

export function defaultState(): SegmentState {
  return { visibility: 'visible', savedVisibility: 'visible', activated: true };
}

export function getState(
  states: Map<string, SegmentState>,
  segment: Segment,
): SegmentState {
  const existing = states.get(segment.id);
  if (existing) return existing;
  return defaultState();
}

export function toggleGuideLine(state: SegmentState): SegmentState {
  if (state.visibility === 'dimmed' || state.visibility === 'invisible') {
    return state;
  }
  const newVis: SegmentVisibility =
    state.visibility === 'visible' ? 'visible-with-line' : 'visible';
  return { ...state, visibility: newVis, savedVisibility: newVis };
}

export function toggleDimmed(state: SegmentState): SegmentState {
  if (state.visibility === 'invisible') return state;
  if (state.visibility === 'dimmed') {
    return { ...state, visibility: state.savedVisibility };
  }
  return { ...state, visibility: 'dimmed', savedVisibility: state.visibility as 'visible' | 'visible-with-line' };
}

export function toggleInvisible(state: SegmentState): SegmentState {
  if (state.visibility === 'invisible') {
    return { ...state, visibility: state.savedVisibility };
  }
  const saved: 'visible' | 'visible-with-line' | 'dimmed' = state.visibility;
  return { ...state, visibility: 'invisible', savedVisibility: saved };
}
