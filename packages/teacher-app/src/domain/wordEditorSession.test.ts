import { describe, expect, it, vi } from 'vitest';
import type { Word } from '@mandarinko/core';
import { WordEditorSession } from './wordEditorSession';
import type { EditorDraftStore } from './editorDraftStore';

const root: Word = {
  id: 'root',
  spelling: [{ language: 'zh-Hans', text: '我' }],
  pronunciation: 'wo',
  definition: ['I'],
};
const child: Word = {
  id: 'child',
  spelling: [{ language: 'zh-Hant', text: '手' }],
  pronunciation: 'shou',
  definition: ['hand'],
};
const fresh = {
  spelling: [{ language: 'zh-Hans', text: '新' }],
  pronunciation: 'xin',
  definition: ['new'],
};
function fixture(initial?: Word) {
  const records = new Map<string, string>();
  const store: EditorDraftStore = {
    read: (key) => records.get(key) ?? null,
    write: (key, value) => {
      records.set(key, value);
    },
    remove: (key) => {
      records.delete(key);
    },
  };
  const entries = new Map(
    [root, child, ...(initial ? [initial] : [])].map((word) => [word.id, structuredClone(word)])
  );
  const api = {
    createWord: vi.fn(async (word: Omit<Word, 'id'>, key?: string) => {
      const saved = entries.get(key!) ?? { ...structuredClone(word), id: key! };
      entries.set(saved.id, saved);
      return saved;
    }),
    updateWord: vi.fn(async (id: string, updates: Partial<Word>) => {
      const saved = { ...entries.get(id)!, ...structuredClone(updates) };
      entries.set(id, saved);
      return saved;
    }),
  };
  let sequence = 0;
  const uuid = () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`;
  const open = () => new WordEditorSession(initial, [...entries.values()], api, store, uuid);
  return { session: open(), open, api, entries, store, records };
}

describe('word editor lifecycle and durable drafts', () => {
  it('refuses to publish duplicate spellings in separate new draft rows', async () => {
    const { session, api } = fixture();
    session.change(session.rows[0], fresh);
    const row = session.addRow('child')!;
    session.change(row, fresh);
    await session.finish();
    expect(session.validation).toBe(true);
    expect(row.message).toContain('another draft');
    expect(api.createWord).not.toHaveBeenCalled();
  });

  it("never overwrites or removes another tab's newer draft", async () => {
    const { session, open, records } = fixture();
    session.change(session.rows[0], fresh);
    const another = open();
    session.change(session.rows[0], { pronunciation: 'first tab' });
    const saved = records.get('new');
    another.change(another.rows[0], { pronunciation: 'second tab' });
    expect(another.storageError).toContain('another tab');
    expect(records.get('new')).toBe(saved);
    another.requestDiscard();
    another.confirmDiscard();
    expect(records.get('new')).toBe(saved);
  });

  it('does not send a create request when its retry identity cannot be stored', async () => {
    const { session, api, store } = fixture();
    session.change(session.rows[0], fresh);
    store.write = () => {
      throw new Error('Quota');
    };
    await session.finish();
    expect(session.lifecycle.kind).toBe('failed');
    expect(api.createWord).not.toHaveBeenCalled();
  });

  it('preserves an invalid revision made after a failed Create-and-next, without resetting it', async () => {
    const { session, api, entries } = fixture();
    api.createWord.mockImplementationOnce(async (value, key) => {
      entries.set(key!, { ...value, id: key! });
      throw new Error('Lost response');
    });
    session.change(session.rows[0], fresh);
    await session.finish(true);
    session.change(session.rows[0], { pronunciation: '' });
    await session.retry();
    expect(session.lifecycle.kind).toBe('open');
    expect(session.validation).toBe(true);
    expect(session.rows[0].word.pronunciation).toBe('');
    expect(session.rows[0].word.spelling[0].text).toBe('新');
    expect(session.dirty).toBe(true);
    expect(entries.size).toBe(3);
  });

  it('restores pending field changes without reverting unrelated server edits', async () => {
    const { session, entries, open } = fixture(root);
    session.change(session.rows[0], { pronunciation: 'saved' });
    await session.commit(session.rows[0]);
    session.change(session.rows[0], { definition: [''] });
    await session.close();
    entries.set('root', { ...entries.get('root')!, derivation: 'Changed elsewhere' });
    const restored = open();
    await restored.close();
    expect(entries.get('root')?.derivation).toBe('Changed elsewhere');
    expect(restored.rows[0].word.definition).toEqual(['']);
  });
  it('does not validate, write, or prompt when an empty placeholder loses focus and closes', async () => {
    const { session, api, records } = fixture();
    await session.commit(session.rows[0], true);
    await session.close();
    expect(session.rows[0].message).toBe('');
    expect(session.lifecycle).toEqual({ kind: 'closed', outcome: 'close' });
    expect(api.createWord).not.toHaveBeenCalled();
    expect(records.size).toBe(0);
  });
  it.each([false, true])(
    'keeps a %s complete new word as a draft through blur, close, and reopening',
    async (complete) => {
      const { session, api, open } = fixture();
      session.change(session.rows[0], complete ? fresh : { pronunciation: 'unfinished' });
      await session.commit(session.rows[0], true);
      await session.close();
      expect(api.createWord).not.toHaveBeenCalled();
      expect(session.lifecycle.kind).toBe('closed');
      const restored = open();
      expect(restored.restored).toBe(true);
      expect(restored.rows[0].word.pronunciation).toBe(complete ? 'xin' : 'unfinished');
      expect(restored.lifecycle.kind).toBe('open');
    }
  );
  it('validates only an explicit finish and preserves input without any dictionary writes', async () => {
    const { session, api } = fixture();
    session.change(session.rows[0], { pronunciation: 'unfinished' });
    await session.commit(session.rows[0]);
    expect(session.rows[0].message).toBe('');
    await session.finish();
    expect(session.validation).toBe(true);
    expect(session.rows[0].messageKind).toBe('error');
    expect(session.rows[0].word.pronunciation).toBe('unfinished');
    expect(session.lifecycle.kind).toBe('open');
    expect(api.createWord).not.toHaveBeenCalled();
  });
  it('publishes once and resets for another word only after success', async () => {
    const { session, api, records } = fixture();
    session.change(session.rows[0], fresh);
    const first = session.finish(true);
    const second = session.finish(true);
    await first;
    await second;
    expect(api.createWord).toHaveBeenCalledTimes(1);
    expect(session.rows[0].word.spelling[0].text).toBe('');
    expect(session.rows[0].id).toBeUndefined();
    expect(session.lifecycle.kind).toBe('open');
    expect(session.focusRevision).toBe(1);
    expect(records.size).toBe(0);
  });
  it('remembers Close during creation, without a second request or intermediate draft loss', async () => {
    const { session, api } = fixture();
    let release!: (word: Word) => void;
    api.createWord.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    session.change(session.rows[0], fresh);
    const saving = session.finish();
    const closing = session.close();
    expect(session.lifecycle).toEqual({ kind: 'working', action: 'finish', exit: 'close' });
    release({ ...fresh, id: session.rows[0].requestKey });
    await saving;
    await closing;
    expect(api.createWord).toHaveBeenCalledTimes(1);
    expect(session.lifecycle).toEqual({ kind: 'closed', outcome: 'close' });
  });
  it('reuses an existing spelling across variants, protects self/duplicate links and leaves ambiguous words unchosen', async () => {
    const { session, api, entries } = fixture(root);
    const row = session.addRow('child')!;
    session.change(row, { spelling: [{ language: 'zh-Hans', text: '手' }] });
    await session.commit(row, true);
    expect(row.id).toBe('child');
    expect(row.word.pronunciation).toBe('shou');
    expect(entries.get('root')?.childrenIds).toEqual(['child']);
    const another = session.addRow('child')!;
    expect(session.reuse(another, child)).toBe(false);
    expect(session.reuse(another, root)).toBe(false);
    expect(api.createWord).not.toHaveBeenCalled();
    const ambiguous = new WordEditorSession(
      undefined,
      [child, { ...child, id: 'other' }],
      api,
      fixture().store
    );
    ambiguous.change(ambiguous.rows[0], { spelling: child.spelling });
    await ambiguous.commit(ambiguous.rows[0], true);
    expect(ambiguous.rows[0].matches).toHaveLength(2);
    expect(ambiguous.rows[0].id).toBeUndefined();
  });
  it('creates related words only on explicit Add, then links them after their IDs exist', async () => {
    const { session, api, entries } = fixture(root);
    const row = session.addRow('sibling')!;
    session.change(row, fresh);
    await session.commit(row);
    expect(api.createWord).not.toHaveBeenCalled();
    await session.finish();
    expect(api.createWord).toHaveBeenCalledTimes(1);
    expect(entries.get('root')?.siblingIds).toEqual([row.id]);
  });
  it('serializes autosaves without resetting newer text or marking it saved prematurely', async () => {
    const { session, api, entries } = fixture(root);
    let release!: (word: Word) => void;
    api.updateWord.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const row = session.rows[0];
    session.change(row, { pronunciation: 'first' });
    const saving = session.commit(row);
    session.change(row, { pronunciation: 'second' });
    void session.commit(row);
    release({ ...root, pronunciation: 'first' });
    await saving;
    expect(row.word.pronunciation).toBe('second');
    expect(entries.get('root')?.pronunciation).toBe('second');
    expect(api.updateWord).toHaveBeenCalledTimes(2);
    expect(session.dirty).toBe(false);
  });
  it('processes explicit Finish pressed while blur-triggered autosave is still running', async () => {
    const { session, api } = fixture(root);
    let release!: (word: Word) => void;
    api.updateWord.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    session.change(session.rows[0], { pronunciation: 'changed' });
    const saving = session.commit(session.rows[0]);
    const row = session.addRow('child')!;
    session.change(row, fresh);
    void session.finish();
    release({ ...root, pronunciation: 'changed' });
    await saving;
    expect(api.createWord).toHaveBeenCalledTimes(1);
    expect(session.lifecycle).toEqual({ kind: 'closed', outcome: 'finished' });
  });
  it('keeps failures through Close and reload, never automatically retrying', async () => {
    const { session, api, open } = fixture(root);
    api.updateWord.mockRejectedValueOnce(new Error('Offline'));
    session.change(session.rows[0], { definition: ['changed'] });
    await session.commit(session.rows[0]);
    expect(session.lifecycle.kind).toBe('failed');
    await session.close();
    expect(session.lifecycle.kind).toBe('closed');
    const restored = open();
    expect(restored.error).toBe('Offline');
    expect(restored.lifecycle.kind).toBe('failed');
    expect(api.updateWord).toHaveBeenCalledTimes(1);
    await restored.retry();
    expect(api.updateWord).toHaveBeenCalledTimes(2);
    expect(restored.dirty).toBe(false);
  });
  it('retries a lost creation response with the original payload and key after reload', async () => {
    const { session, api, entries, open } = fixture();
    api.createWord.mockImplementationOnce(async (word, key) => {
      entries.set(key!, { ...word, id: key! });
      throw new Error('Response lost');
    });
    session.change(session.rows[0], fresh);
    await session.finish();
    await session.close();
    const restored = open();
    restored.change(restored.rows[0], { definition: ['revised while offline'] });
    await restored.retry();
    expect(api.createWord).toHaveBeenCalledTimes(2);
    expect(api.createWord.mock.calls[1]).toEqual(api.createWord.mock.calls[0]);
    expect(entries.size).toBe(3);
    expect(entries.get(restored.rows[0].id!)?.definition).toEqual(['revised while offline']);
  });
  it('does not recreate a related word when its link fails and Retry is pressed', async () => {
    const { session, api } = fixture(root);
    const row = session.addRow('child')!;
    session.change(row, fresh);
    api.updateWord.mockRejectedValueOnce(new Error('Link failed'));
    await session.finish();
    expect(api.createWord).toHaveBeenCalledTimes(1);
    await session.retry();
    expect(api.createWord).toHaveBeenCalledTimes(1);
    expect(api.updateWord.mock.calls[1][1]).toEqual({ childrenIds: [row.id], siblingIds: [] });
  });
  it('confirms discarding meaningful input, cancels without changing it, and never deletes saved words', async () => {
    const { session, api, records, entries } = fixture(root);
    session.change(session.rows[0], { pronunciation: 'saved' });
    await session.commit(session.rows[0]);
    session.change(session.rows[0], { definition: [''] });
    session.requestDiscard();
    expect(session.lifecycle.kind).toBe('confirm-discard');
    session.cancelDiscard();
    expect(session.rows[0].word.definition).toEqual(['']);
    session.requestDiscard();
    session.confirmDiscard();
    expect(session.lifecycle.kind).toBe('closed');
    expect(records.size).toBe(0);
    expect(entries.get('root')?.pronunciation).toBe('saved');
    expect(entries.get('root')?.definition).toEqual(['I']);
    expect(api.createWord).not.toHaveBeenCalled();
  });
  it('unlinks without deleting the word and preserves links through subsequent field updates', async () => {
    const { session, entries } = fixture({ ...root, childrenIds: ['child'] });
    await session.unlink(session.rows[1]);
    session.change(session.rows[0], { derivation: 'Updated' });
    await session.commit(session.rows[0]);
    expect(entries.has('child')).toBe(true);
    expect(entries.get('root')?.childrenIds).toEqual([]);
  });
  it('handles a shared word appearing in both relationship groups without stale overwrites', async () => {
    const { session, entries } = fixture({
      ...root,
      childrenIds: ['child'],
      siblingIds: ['child'],
    });
    session.change(session.rows[1], { definition: ['shared'] });
    await session.commit(session.rows[1]);
    session.change(session.rows[2], { pronunciation: 'changed' });
    await session.commit(session.rows[2]);
    expect(entries.get('child')?.definition).toEqual(['shared']);
    expect(session.dirty).toBe(false);
  });
  it('protects drafts on quota failure and requires explicit permission to leave without storing them', async () => {
    const { session, store } = fixture();
    store.write = () => {
      throw new Error('Quota');
    };
    session.change(session.rows[0], fresh);
    await session.close();
    expect(session.lifecycle.kind).toBe('confirm-leave');
    session.cancelDiscard();
    expect(session.lifecycle.kind).toBe('open');
    await session.close();
    session.leaveWithoutDraft();
    expect(session.lifecycle.kind).toBe('closed');
  });
  it.each(['invalid JSON', '{"version":1,"rows":[]}'])(
    'rejects corrupt storage without overwriting it: %s',
    (raw) => {
      const { records, open } = fixture();
      records.set('new', raw);
      const restored = open();
      expect(restored.storageError).not.toBe('');
      restored.change(restored.rows[0], fresh);
      expect(records.get('new')).toBe(raw);
      restored.requestDiscard();
      restored.confirmDiscard();
      expect(records.has('new')).toBe(false);
    }
  );
});
