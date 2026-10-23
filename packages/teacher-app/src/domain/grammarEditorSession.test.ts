import { describe, expect, it, vi } from 'vitest';
import {
  GrammarEditorSession,
  type GrammarDraft,
  type GrammarEditorPorts,
} from './grammarEditorSession';
import type { GrammarPattern } from '@mandarinko/core';

const pattern: GrammarPattern = {
  id: 'de',
  title: 'Location',
  spelling: [{ language: 'ja', text: 'で' }],
  definition: ['At'],
  examples: [],
  metadata: { jlptLevel: 5 },
};
function fixture(recovered?: GrammarDraft) {
  let draft = recovered;
  const ports: GrammarEditorPorts = {
    create: vi.fn(async (input, key) => ({ ...input, id: key })),
    update: vi.fn(async (id, input) => ({ ...input, id })),
    drafts: {
      read: () => draft,
      write: (_slot, value) => {
        draft = value;
      },
      remove: () => {
        draft = undefined;
      },
    },
    newKey: () => '11111111-1111-4111-8111-111111111111',
  };
  return { ports, draft: () => draft };
}

describe('flat grammar editor lifecycle', () => {
  it('finishes an unchanged existing pattern without a write', async () => {
    const f = fixture();
    const session = new GrammarEditorSession(pattern, f.ports);
    await session.finish();
    expect(f.ports.update).not.toHaveBeenCalled();
    expect(session.lifecycle).toEqual({ kind: 'closed', outcome: 'finished' });
  });
  it('keeps new input local on blur and close, and restores it without publishing', async () => {
    const f = fixture();
    const session = new GrammarEditorSession(undefined, f.ports);
    session.change({ title: 'Draft' });
    await session.commit();
    session.close();
    expect(f.ports.create).not.toHaveBeenCalled();
    expect(session.lifecycle.kind).toBe('closed');
    const resumed = new GrammarEditorSession(undefined, f.ports);
    expect(resumed.draft.title).toBe('Draft');
  });

  it('blocks invalid creation and creates only after explicit completion', async () => {
    const f = fixture();
    const session = new GrammarEditorSession(undefined, f.ports);
    await session.finish();
    expect(session.errors.some((error) => error.field === 'title')).toBe(true);
    expect(f.ports.create).not.toHaveBeenCalled();
    const { id: _id, ...input } = pattern;
    session.change(input);
    await session.finish();
    expect(f.ports.create).toHaveBeenCalledTimes(1);
    expect(f.draft()).toBeUndefined();
    expect(session.lifecycle).toEqual({ kind: 'closed', outcome: 'finished' });
  });

  it('autosaves existing patterns while preserving examples, contrasts and metadata', async () => {
    const f = fixture();
    const session = new GrammarEditorSession(pattern, f.ports);
    session.change({ title: 'Changed' });
    await session.commit();
    expect(f.ports.update).toHaveBeenCalledWith('de', { ...session.draft });
    expect(session.draft.metadata).toEqual(pattern.metadata);
    expect(session.dirty).toBe(false);
  });

  it('retains an exact creation payload and key for explicit retry after reload', async () => {
    const f = fixture();
    vi.mocked(f.ports.create).mockRejectedValueOnce(new Error('Lost response'));
    const session = new GrammarEditorSession(undefined, f.ports);
    const { id: _id, ...input } = pattern;
    session.change(input);
    await session.finish();
    expect(session.lifecycle.kind).toBe('failed');
    const resumed = new GrammarEditorSession(undefined, f.ports);
    await resumed.commit();
    expect(f.ports.create).toHaveBeenCalledTimes(1);
    resumed.change({ title: 'Must not change unconfirmed payload' });
    await resumed.retry();
    expect(f.ports.create).toHaveBeenNthCalledWith(
      2,
      input,
      '11111111-1111-4111-8111-111111111111'
    );
  });

  it('requires a deliberate choice before closing when browser storage fails', () => {
    const f = fixture();
    f.ports.drafts.write = () => {
      throw new Error('Storage blocked');
    };
    const session = new GrammarEditorSession(undefined, f.ports);
    session.change({ title: 'Unstored' });
    session.close();
    expect(session.lifecycle.kind).toBe('confirm-leave');
    session.leaveWithoutDraft();
    expect(session.lifecycle.kind).toBe('closed');
  });

  it('keeps later edits while saving and finishes their queued save before exiting', async () => {
    const f = fixture();
    let complete!: () => void;
    const delayed = new Promise<void>((resolve) => {
      complete = resolve;
    });
    vi.mocked(f.ports.update).mockImplementationOnce(async (id, input) => {
      await delayed;
      return { ...input, id };
    });
    const session = new GrammarEditorSession(pattern, f.ports);
    session.change({ title: 'First edit' });
    const saving = session.commit();
    session.change({ definition: ['Edited during save'] });
    await session.finish();
    complete();
    await saving;
    expect(f.ports.update).toHaveBeenCalledTimes(2);
    expect(session.saved?.definition).toEqual(['Edited during save']);
    expect(session.lifecycle).toEqual({ kind: 'closed', outcome: 'finished' });
    expect(f.draft()).toBeUndefined();
  });
});
