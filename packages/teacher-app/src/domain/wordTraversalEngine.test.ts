import { describe, expect, it, vi } from 'vitest';
import type { Word } from '@mandarinko/core';
import { WordTraversalEngine } from './wordTraversalEngine';

type WordEntity = Word & { id: string };

const baseWord = (id: string, spelling: string, extra?: Partial<Word>): WordEntity => ({
  id,
  spelling: [{ language: 'zh-Hans', text: spelling }],
  pronunciation: '',
  definition: [''],
  ...extra,
});

const createCallbacks = (initial: WordEntity[]) => {
  const vocab = new Map(initial.map((word) => [word.id, { ...word }]));

  const createWord = vi.fn(async (word: Omit<Word, 'id'>) => {
    const id = `created-${vocab.size + 1}`;
    const created: WordEntity = { ...word, id };
    vocab.set(id, created);
    return created;
  });

  const updateWord = vi.fn(async (id: string, updates: Partial<Word>) => {
    const current = vocab.get(id);
    if (!current) {
      throw new Error('Missing word');
    }
    const updated = { ...current, ...updates };
    vocab.set(id, updated);
    return updated;
  });

  const refreshVocabulary = vi.fn(async () => Array.from(vocab.values()));

  return { createWord, updateWord, refreshVocabulary, vocab };
};

describe('WordTraversalEngine', () => {
  it('opens with view mode and supports editing + closing', () => {
    const root = baseWord('root', '主张', { childrenIds: ['child'], siblingIds: ['sib'] });
    const child = baseWord('child', '主');
    const sibling = baseWord('sib', '张');
    const callbacks = createCallbacks([root, child, sibling]);
    const engine = new WordTraversalEngine(callbacks);

    engine.open('root', [root, child, sibling], 'view');
    let vm = engine.getViewModel();
    expect(vm?.current.id).toBe('root');
    expect(vm?.current.mode).toBe('view');
    expect(vm?.children.length).toBe(1);
    expect(vm?.siblings.length).toBe(1);

    vm?.current.onEdit();
    vm = engine.getViewModel();
    expect(vm?.current.mode).toBe('edit');

    vm?.current.onClose();
    vm = engine.getViewModel();
    expect(vm?.current.mode).toBe('view');
  });

  it('creates a sibling from a child and returns to the parent authoring state', async () => {
    const root = baseWord('root', '主张', { childrenIds: ['child'] });
    const child = baseWord('child', '主');
    const callbacks = createCallbacks([root, child]);
    const engine = new WordTraversalEngine(callbacks);

    engine.open('root', [root, child], 'view');
    engine.editWord('root');
    engine.editWord('child');

    let vm = engine.getViewModel();
    vm?.current.onAddSibling();
    vm = engine.getViewModel();

    expect(vm?.current.mode).toBe('create');
    const tempId = vm?.current.id ?? '';
    expect(tempId.startsWith('temp-')).toBe(true);

    await vm?.current.onSave({
      spelling: [{ language: 'zh-Hans', text: '弓' }],
      pronunciation: 'gong(1)',
      definition: ['bow'],
    });

    expect(callbacks.createWord).toHaveBeenCalledTimes(1);
    expect(callbacks.updateWord).toHaveBeenCalledWith('child', {
      siblingIds: [expect.stringMatching(/^created-/)],
    });
    expect(callbacks.refreshVocabulary).toHaveBeenCalled();

    vm = engine.getViewModel();
    expect(vm?.current.id).toBe('child');
    expect(vm?.current.mode).toBe('edit');
    expect(engine.getState().words.has(tempId)).toBe(false);
  });

  it('reuses an existing word in place of a draft sibling', async () => {
    const root = baseWord('root', '主张', { childrenIds: ['child'] });
    const child = baseWord('child', '主');
    const existing = baseWord('existing', '弓');
    const callbacks = createCallbacks([root, child, existing]);
    const engine = new WordTraversalEngine(callbacks);

    engine.open('root', [root, child, existing], 'view');
    engine.editWord('root');
    engine.editWord('child');

    let vm = engine.getViewModel();
    vm?.current.onAddSibling();
    vm = engine.getViewModel();
    const tempId = vm?.current.id ?? '';

    await vm?.current.onReuseExisting(existing);

    expect(callbacks.updateWord).toHaveBeenCalledWith('child', {
      siblingIds: ['existing'],
    });
    expect(callbacks.refreshVocabulary).toHaveBeenCalled();
    expect(engine.getState().words.has(tempId)).toBe(false);

    vm = engine.getViewModel();
    expect(vm?.current.id).toBe('child');
    expect(vm?.current.mode).toBe('edit');
  });

  it('builds nested child relations while avoiding cycles', () => {
    const root = baseWord('root', '我們', { childrenIds: ['wo'] });
    const wo = baseWord('wo', '我', { childrenIds: ['ge'] });
    const ge = baseWord('ge', '戈', { childrenIds: ['root'] });
    const callbacks = createCallbacks([root, wo, ge]);
    const engine = new WordTraversalEngine(callbacks);

    engine.open('root', [root, wo, ge], 'view');
    const vm = engine.getViewModel();

    expect(vm?.children.map((child) => child.id)).toEqual(['wo']);
    expect(vm?.children[0]?.children.map((child) => child.id)).toEqual(['ge']);
    expect(vm?.children[0]?.children[0]?.children).toEqual([]);
  });
});
