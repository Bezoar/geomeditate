import type { LineClue } from '../clues/line';
import { coordKey } from '../model/hex-coord';

export type LineClueVisibility = 'invisible' | 'visible' | 'visible-with-line' | 'dimmed';

export interface LineClueState {
  visibility: LineClueVisibility;
  savedVisibility: 'visible' | 'visible-with-line' | 'dimmed';
}

export function lineClueKey(clue: LineClue): string {
  return `${clue.axis}:${coordKey(clue.startCoord)}`;
}

export function defaultState(): LineClueState {
  return { visibility: 'visible', savedVisibility: 'visible' };
}

export function getState(
  states: Map<string, LineClueState>,
  clue: LineClue,
): LineClueState {
  const key = lineClueKey(clue);
  let state = states.get(key);
  if (!state) {
    state = defaultState();
    states.set(key, state);
  }
  return state;
}

/** Left-click: toggle guide line (only when visible) */
export function toggleGuideLine(state: LineClueState): LineClueState {
  if (state.visibility === 'visible') {
    return { ...state, visibility: 'visible-with-line' };
  }
  if (state.visibility === 'visible-with-line') {
    return { ...state, visibility: 'visible' };
  }
  // dimmed or invisible: toggle line on dimmed too
  if (state.visibility === 'dimmed') {
    return state; // no-op when dimmed
  }
  return state;
}

/** Right-click: toggle between dimmed and visible */
export function toggleDimmed(state: LineClueState): LineClueState {
  if (state.visibility === 'dimmed') {
    return { ...state, visibility: 'visible' };
  }
  if (state.visibility === 'visible' || state.visibility === 'visible-with-line') {
    return { ...state, visibility: 'dimmed' };
  }
  return state; // invisible: no-op
}

/** Option-click: toggle invisible, saving/restoring previous state */
export function toggleInvisible(state: LineClueState): LineClueState {
  if (state.visibility === 'invisible') {
    return { ...state, visibility: state.savedVisibility };
  }
  // Save current visibility and go invisible
  return {
    visibility: 'invisible',
    savedVisibility: state.visibility,
  };
}
