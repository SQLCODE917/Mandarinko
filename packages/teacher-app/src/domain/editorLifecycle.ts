export type SaveAction = 'autosave' | 'finish' | 'next';
type Resting = { kind: 'open' } | { kind: 'failed'; action: SaveAction; message: string };
export type EditorLifecycle =
  | Resting
  | { kind: 'working'; action: SaveAction; exit: 'stay' | 'close' | 'discard' }
  | { kind: 'confirm-discard'; rowKey?: number; returnTo: Resting }
  | { kind: 'confirm-leave'; returnTo: Resting }
  | { kind: 'closed'; outcome: 'close' | 'finished' };
export type LifecycleEvent =
  | { type: 'START'; action: SaveAction }
  | { type: 'CLOSE'; needsSave: boolean; stored: boolean }
  | { type: 'COMPLETE'; stored: boolean; hasDraft: boolean }
  | { type: 'FAIL'; message: string; stored: boolean }
  | { type: 'RETRY' }
  | { type: 'NEEDS_INPUT'; stored: boolean }
  | { type: 'DISCARD'; hasDraft: boolean; rowKey?: number }
  | { type: 'CONFIRM_DISCARD' }
  | { type: 'CANCEL' }
  | { type: 'LEAVE_WITHOUT_DRAFT' };
type Transition = { state: EditorLifecycle; effects: ('save' | 'discard' | 'reset')[] };

/** The only authority for finishing, leaving, retrying, and abandoning an editor. */
export function transitionEditor(state: EditorLifecycle, event: LifecycleEvent): Transition {
  const result = (next: EditorLifecycle, ...effects: Transition['effects']): Transition => ({
    state: next,
    effects,
  });
  const exit = (stored: boolean, returnTo: Resting) =>
    stored
      ? result({ kind: 'closed', outcome: 'close' })
      : result({ kind: 'confirm-leave', returnTo });
  if (state.kind === 'closed') return result(state);
  switch (event.type) {
    case 'START':
      if (state.kind === 'working' && state.action === 'autosave' && state.exit === 'stay')
        return result({ ...state, action: event.action });
      return state.kind === 'open'
        ? result({ kind: 'working', action: event.action, exit: 'stay' }, 'save')
        : result(state);
    case 'CLOSE':
      if (state.kind === 'working') return result({ ...state, exit: 'close' });
      if (state.kind === 'open' && event.needsSave)
        return result({ kind: 'working', action: 'autosave', exit: 'close' }, 'save');
      return state.kind === 'open' || state.kind === 'failed'
        ? exit(event.stored, state)
        : result(state);
    case 'COMPLETE':
      if (state.kind !== 'working') return result(state);
      if (state.exit === 'close') return exit(event.stored, { kind: 'open' });
      if (state.exit === 'discard')
        return event.hasDraft
          ? result({ kind: 'confirm-discard', returnTo: { kind: 'open' } })
          : result({ kind: 'closed', outcome: 'close' });
      if (state.action === 'next') return result({ kind: 'open' }, 'reset');
      return result(
        state.action === 'finish' ? { kind: 'closed', outcome: 'finished' } : { kind: 'open' }
      );
    case 'FAIL': {
      if (state.kind !== 'working') return result(state);
      const failed: Resting = { kind: 'failed', action: state.action, message: event.message };
      if (state.exit === 'close') return exit(event.stored, failed);
      if (state.exit === 'discard') return result({ kind: 'confirm-discard', returnTo: failed });
      return result(failed);
    }
    case 'RETRY':
      return state.kind === 'failed'
        ? result({ kind: 'working', action: state.action, exit: 'stay' }, 'save')
        : result(state);
    case 'NEEDS_INPUT':
      if (state.kind !== 'working') return result(state);
      return state.kind === 'working' && state.exit === 'close'
        ? exit(event.stored, { kind: 'open' })
        : result({ kind: 'open' });
    case 'DISCARD':
      if (state.kind === 'working')
        return state.action === 'autosave' && event.rowKey === undefined
          ? result({ ...state, exit: 'discard' })
          : result(state);
      if (state.kind !== 'open' && state.kind !== 'failed') return result(state);
      return event.hasDraft
        ? result({ kind: 'confirm-discard', rowKey: event.rowKey, returnTo: state })
        : result(
            event.rowKey === undefined ? { kind: 'closed', outcome: 'close' } : state,
            'discard'
          );
    case 'CANCEL':
      return state.kind === 'confirm-discard' || state.kind === 'confirm-leave'
        ? result(state.returnTo)
        : result(state);
    case 'CONFIRM_DISCARD':
      return state.kind === 'confirm-discard'
        ? result(
            state.rowKey === undefined ? { kind: 'closed', outcome: 'close' } : state.returnTo,
            'discard'
          )
        : result(state);
    case 'LEAVE_WITHOUT_DRAFT':
      return state.kind === 'confirm-leave'
        ? result({ kind: 'closed', outcome: 'close' })
        : result(state);
  }
}
