import { describe, expect, it } from 'vitest';
import { transitionEditor, type EditorLifecycle } from './editorLifecycle';

describe('editor exit and save state machine', () => {
  it('closes a safely stored draft without validation or a save effect', () => {
    expect(
      transitionEditor({ kind: 'open' }, { type: 'CLOSE', needsSave: false, stored: true })
    ).toEqual({ state: { kind: 'closed', outcome: 'close' }, effects: [] });
  });
  it('starts publication once, remembers Close while writing, and leaves once it settles', () => {
    const started = transitionEditor({ kind: 'open' }, { type: 'START', action: 'finish' });
    expect(started.effects).toEqual(['save']);
    const repeated = transitionEditor(started.state, { type: 'START', action: 'finish' });
    expect(repeated.effects).toEqual([]);
    const closing = transitionEditor(repeated.state, {
      type: 'CLOSE',
      needsSave: true,
      stored: true,
    });
    expect(closing.state).toEqual({ kind: 'working', action: 'finish', exit: 'close' });
    expect(
      transitionEditor(closing.state, { type: 'COMPLETE', stored: true, hasDraft: false }).state
    ).toEqual({ kind: 'closed', outcome: 'close' });
  });
  it('upgrades an autosave to explicit finish without launching a second worker', () => {
    expect(
      transitionEditor(
        { kind: 'working', action: 'autosave', exit: 'stay' },
        { type: 'START', action: 'next' }
      )
    ).toEqual({ state: { kind: 'working', action: 'next', exit: 'stay' }, effects: [] });
  });
  it('requires explicit retry after failure and retains that intent across discard cancellation', () => {
    const failed: EditorLifecycle = { kind: 'failed', action: 'finish', message: 'Offline' };
    expect(transitionEditor(failed, { type: 'START', action: 'finish' }).effects).toEqual([]);
    const confirm = transitionEditor(failed, { type: 'DISCARD', hasDraft: true });
    expect(transitionEditor(confirm.state, { type: 'CANCEL' }).state).toEqual(failed);
    expect(transitionEditor(failed, { type: 'RETRY' }).effects).toEqual(['save']);
  });
  it('protects input when browser storage fails, allowing an explicit unsafe exit only', () => {
    const guarded = transitionEditor(
      { kind: 'open' },
      { type: 'CLOSE', needsSave: false, stored: false }
    );
    expect(guarded.state.kind).toBe('confirm-leave');
    expect(transitionEditor(guarded.state, { type: 'CANCEL' }).state.kind).toBe('open');
    expect(transitionEditor(guarded.state, { type: 'LEAVE_WITHOUT_DRAFT' }).state.kind).toBe(
      'closed'
    );
  });
  it('does not discard while explicit creation is in flight', () => {
    const working: EditorLifecycle = { kind: 'working', action: 'finish', exit: 'stay' };
    expect(transitionEditor(working, { type: 'DISCARD', hasDraft: true }).state).toEqual(working);
  });
  it('keeps closed sessions terminal under repeated actions and late responses', () => {
    const closed: EditorLifecycle = { kind: 'closed', outcome: 'close' };
    expect(
      transitionEditor(closed, { type: 'COMPLETE', stored: true, hasDraft: false }).state
    ).toBe(closed);
    expect(transitionEditor(closed, { type: 'RETRY' }).effects).toEqual([]);
  });
});
