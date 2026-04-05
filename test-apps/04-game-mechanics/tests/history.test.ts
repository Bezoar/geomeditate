import { describe, it, expect } from 'vitest';
import { ActionHistory } from '../src/save/history';
import type { GameAction } from '../src/save/types';

describe('ActionHistory', () => {
  it('starts empty with cursor at 0', () => {
    const h = new ActionHistory();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
    expect(h.cursor).toBe(0);
  });

  it('records actions and advances cursor', () => {
    const h = new ActionHistory();
    h.push({ type: 'open', coord: '1,1', wasMistake: false });
    expect(h.cursor).toBe(1);
    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(false);
  });

  it('undo returns the last action and decrements cursor', () => {
    const h = new ActionHistory();
    const action: GameAction = { type: 'open', coord: '1,1', wasMistake: false };
    h.push(action);
    const undone = h.undo();
    expect(undone).toEqual(action);
    expect(h.cursor).toBe(0);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(true);
  });

  it('redo returns the next action and advances cursor', () => {
    const h = new ActionHistory();
    const action: GameAction = { type: 'mark', coord: '0,0', wasMistake: false };
    h.push(action);
    h.undo();
    const redone = h.redo();
    expect(redone).toEqual(action);
    expect(h.cursor).toBe(1);
  });

  it('push after undo truncates redo stack', () => {
    const h = new ActionHistory();
    h.push({ type: 'open', coord: '1,1', wasMistake: false });
    h.push({ type: 'mark', coord: '2,2', wasMistake: false });
    h.undo();
    h.push({ type: 'open', coord: '3,3', wasMistake: false });
    expect(h.cursor).toBe(2);
    expect(h.canRedo()).toBe(false);
    h.undo();
    const action = h.undo()!;
    expect(action.type).toBe('open');
    expect('coord' in action && action.coord).toBe('1,1');
  });

  it('undo on empty returns null', () => {
    const h = new ActionHistory();
    expect(h.undo()).toBeNull();
  });

  it('redo on fully applied returns null', () => {
    const h = new ActionHistory();
    h.push({ type: 'open', coord: '1,1', wasMistake: false });
    expect(h.redo()).toBeNull();
  });

  it('serializes to HistoryState', () => {
    const h = new ActionHistory();
    h.push({ type: 'open', coord: '1,1', wasMistake: false });
    h.push({ type: 'mark', coord: '2,2', wasMistake: false });
    h.undo();
    const state = h.serialize();
    expect(state.cursor).toBe(1);
    expect(state.actions).toHaveLength(2);
  });

  it('deserializes from HistoryState', () => {
    const state = {
      actions: [
        { type: 'open' as const, coord: '1,1', wasMistake: false },
        { type: 'mark' as const, coord: '2,2', wasMistake: false },
      ],
      cursor: 1,
    };
    const h = ActionHistory.deserialize(state);
    expect(h.cursor).toBe(1);
    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(true);
  });

  it('clear resets to empty state', () => {
    const h = new ActionHistory();
    h.push({ type: 'open', coord: '1,1', wasMistake: false });
    h.clear();
    expect(h.cursor).toBe(0);
    expect(h.canUndo()).toBe(false);
  });
});
