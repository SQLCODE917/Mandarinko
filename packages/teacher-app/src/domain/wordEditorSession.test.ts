import { describe, expect, it, vi } from 'vitest';
import type { Word } from '@mandarinko/core';
import { WordEditorSession } from './wordEditorSession';

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
function fixture(initial: Word | undefined = root, words = [root, child]) {
  const entries = new Map(words.map((word) => [word.id, structuredClone(word)]));
  const api = {
    createWord: vi.fn(async (word: Omit<Word, 'id'>) => {
      const saved = { ...word, id: `created-${entries.size}` };
      entries.set(saved.id, saved);
      return saved;
    }),
    updateWord: vi.fn(async (id: string, value: Partial<Word>) => {
      const saved = { ...entries.get(id)!, ...value };
      entries.set(id, saved);
      return saved;
    }),
    refreshVocabulary: vi.fn(async () => [...entries.values()]),
  };
  return { session: new WordEditorSession(initial, words, api), api, entries };
}

describe('inline word editor persistence', () => {
  it('keeps partial drafts local and creates once after required fields are ready', async () => {
    const { api } = fixture();
    const fresh = new WordEditorSession(undefined, [root, child], api);
    const row = fresh.rows[0];
    fresh.change(row, { spelling: [{ language: 'zh-Hans', text: '新' }] });
    await fresh.commit(row, true);
    expect(api.createWord).not.toHaveBeenCalled();
    expect(await fresh.finish()).toBe(false);
    fresh.change(row, { pronunciation: 'xin', definition: ['new'] });
    await fresh.commit(row);
    await fresh.commit(row);
    expect(api.createWord).toHaveBeenCalledTimes(1);
    expect(fresh.dirty).toBe(false);
  });

  it('reuses an exact character across language variants and saves its relationship without a POST', async () => {
    const { session, api, entries } = fixture();
    const row = session.addRow('child');
    session.change(row, { spelling: [{ language: 'zh-Hans', text: '手' }] });
    await session.commit(row, true);
    expect(row.id).toBe('child');
    expect(row.word.pronunciation).toBe('shou');
    expect(api.createWord).not.toHaveBeenCalled();
    expect(entries.get('root')?.childrenIds).toEqual(['child']);
    session.change(session.rows[0], { derivation: 'Long text' });
    await session.commit(session.rows[0]);
    expect(entries.get('root')?.childrenIds).toEqual(['child']);
  });

  it('creates a child before linking it, preserving a new root draft and sibling entries', async () => {
    const { api, entries } = fixture();
    const session = new WordEditorSession(undefined, [root, child], api);
    const sibling = session.addRow('sibling');
    session.change(sibling, { spelling: [{ language: 'ja', text: '手' }] });
    await session.commit(sibling, true);
    const row = session.rows[0];
    session.change(row, {
      spelling: [{ language: 'zh-Hans', text: '新' }],
      pronunciation: 'xin',
      definition: ['new'],
    });
    await session.commit(row);
    expect(entries.get(row.id!)?.siblingIds).toEqual(['child']);
    expect(await session.finish()).toBe(true);
  });

  it('does not guess ambiguous matches, link self, or duplicate a relationship', async () => {
    const duplicate = { ...child, id: 'other' };
    const { session, api } = fixture(root, [root, child, duplicate]);
    const row = session.addRow('child');
    session.change(row, { spelling: child.spelling });
    await session.commit(row, true);
    expect(row.matches).toHaveLength(2);
    expect(api.createWord).not.toHaveBeenCalled();
    expect(api.updateWord).not.toHaveBeenCalled();
    expect(session.reuse(row, root)).toBe(false);
    expect(session.reuse(row, child)).toBe(true);
    await session.commit(row);
    const another = session.addRow('child');
    expect(session.reuse(another, child)).toBe(false);
  });

  it('serializes saves and leaves text entered during an in-flight request intact', async () => {
    const { session, api } = fixture();
    let release!: (word: Word) => void;
    api.updateWord.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const row = session.rows[0];
    session.change(row, { pronunciation: 'first' });
    const first = session.commit(row);
    await Promise.resolve();
    session.change(row, { pronunciation: 'second' });
    const second = session.commit(row);
    expect(api.updateWord).toHaveBeenCalledTimes(1);
    release({ ...root, pronunciation: 'first' });
    await first;
    await second;
    expect(row.word.pronunciation).toBe('second');
    expect(api.updateWord.mock.calls[1][1].pronunciation).toBe('second');
    expect(session.dirty).toBe(false);
  });

  it('keeps failed edits, blocks close and automatic writes, then retries explicitly', async () => {
    const { session, api } = fixture();
    api.updateWord.mockRejectedValueOnce(new Error('Offline'));
    const row = session.rows[0];
    session.change(row, { definition: ['changed'] });
    await session.commit(row);
    expect(session.error).toBe('Offline');
    expect(row.word.definition).toEqual(['changed']);
    expect(await session.finish()).toBe(false);
    expect(api.updateWord).toHaveBeenCalledTimes(1);
    await session.retry();
    expect(session.error).toBe('');
    expect(session.dirty).toBe(false);
  });

  it('retries a failed relationship write without creating the word twice', async () => {
    const { session, api } = fixture();
    const row = session.addRow('sibling');
    session.change(row, {
      spelling: [{ language: 'ja', text: '新' }],
      pronunciation: 'xin',
      definition: ['new'],
    });
    api.updateWord.mockRejectedValueOnce(new Error('Link failed'));
    await session.commit(row);
    expect(session.error).toBe('Link failed');
    expect(api.createWord).toHaveBeenCalledTimes(1);
    await session.retry();
    expect(api.createWord).toHaveBeenCalledTimes(1);
    expect(api.updateWord.mock.calls[1][1]).toEqual({ childrenIds: [], siblingIds: [row.id] });
  });

  it('unlinks without deleting a word and preserves the result in later field saves', async () => {
    const { session, entries } = fixture({ ...root, childrenIds: ['child'] });
    await session.unlink(session.rows[1]);
    session.change(session.rows[0], { derivation: 'Updated' });
    await session.commit(session.rows[0]);
    expect(entries.get('root')?.childrenIds).toEqual([]);
    expect(entries.has('child')).toBe(true);
    expect(session.rows).toHaveLength(1);
  });

  it('discards unsaved text while keeping fields that were already saved', async () => {
    const { session, entries } = fixture();
    const row = session.rows[0];
    session.change(row, { pronunciation: 'saved' });
    await session.commit(row);
    session.change(row, { definition: [''] });
    await session.commit(row);
    const draft = session.addRow('child');
    session.change(draft, { pronunciation: 'incomplete' });
    expect(await session.finish()).toBe(false);
    await session.discardUnsaved();
    expect(row.word.pronunciation).toBe('saved');
    expect(row.word.definition).toEqual(['I']);
    expect(session.rows).toHaveLength(1);
    expect(entries.get('root')?.pronunciation).toBe('saved');
    expect(await session.finish()).toBe(true);
  });

  it('shares edits when the same word appears in both relationship groups', async () => {
    const { session, api, entries } = fixture({
      ...root,
      childrenIds: ['child'],
      siblingIds: ['child'],
    });
    session.change(session.rows[1], { definition: ['shared meaning'] });
    await session.commit(session.rows[1]);
    expect(session.rows[2].word.definition).toEqual(['shared meaning']);
    session.change(session.rows[2], { pronunciation: 'shared reading' });
    await session.commit(session.rows[2]);
    expect(entries.get('child')?.definition).toEqual(['shared meaning']);
    expect(entries.get('child')?.pronunciation).toBe('shared reading');
    expect(api.updateWord).toHaveBeenCalledTimes(2);
    expect(session.dirty).toBe(false);
  });

  it('reuses the current draft when an existing child is also added as a sibling', async () => {
    const { session, entries } = fixture({ ...root, childrenIds: ['child'] });
    session.change(session.rows[1], { definition: ['updated meaning'] });
    const sibling = session.addRow('sibling');
    expect(session.reuse(sibling, child)).toBe(true);
    await session.commit(sibling);
    expect(sibling.word.definition).toEqual(['updated meaning']);
    expect(entries.get('child')?.definition).toEqual(['updated meaning']);
    expect(session.dirty).toBe(false);
  });
});
