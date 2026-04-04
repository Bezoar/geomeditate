import type { GameAction, HistoryState } from './types';

export class ActionHistory {
  private actions: GameAction[] = [];
  private _cursor = 0;

  get cursor(): number {
    return this._cursor;
  }

  canUndo(): boolean {
    return this._cursor > 0;
  }

  canRedo(): boolean {
    return this._cursor < this.actions.length;
  }

  push(action: GameAction): void {
    // Truncate any redo actions
    this.actions.length = this._cursor;
    this.actions.push(action);
    this._cursor++;
  }

  undo(): GameAction | null {
    if (!this.canUndo()) return null;
    this._cursor--;
    return this.actions[this._cursor];
  }

  redo(): GameAction | null {
    if (!this.canRedo()) return null;
    const action = this.actions[this._cursor];
    this._cursor++;
    return action;
  }

  clear(): void {
    this.actions = [];
    this._cursor = 0;
  }

  serialize(): HistoryState {
    return {
      actions: [...this.actions],
      cursor: this._cursor,
    };
  }

  static deserialize(state: HistoryState): ActionHistory {
    const h = new ActionHistory();
    h.actions = [...state.actions];
    h._cursor = state.cursor;
    return h;
  }
}
