import { StaticDictionaryRepository } from './staticDictionary';
import { expect, it, vi } from 'vitest';
import { matchesEntry, type Word } from '@mandarinko/core';
import { searchDictionary, readLocation } from './dictionary';
const word: Word = {
  id: '1',
  spelling: [{ language: 'ja', text: '食べる' }],
  pronunciation: 'たべる',
  definition: ['to eat'],
  metadata: { jlptLevel: 5 },
};
it('compiled search retains core semantics and original order across every field', () => {
  const words = [word, { ...word, id: '2', derivation: 'Food history 手' }];
  const search = searchDictionary(words);
  for (const query of ['', '食', 'たべる', 'TO EAT', 'jlptLevel 5', 'Food 手', 'missing'])
    expect(search(query)).toEqual(words.filter((w) => matchesEntry(w, query)));
});
it('URLs retain multilingual queries and word selection while ignoring old page numbers', () => {
  expect(readLocation('?page=-3&q=食&word=1')).toEqual({ query: '食', wordId: '1' });
  expect(readLocation('?page=3')).toEqual({ query: '', wordId: null });
});
it('shares a successful snapshot and makes a failed load explicitly retryable', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 500 }))
    .mockResolvedValueOnce(new Response(JSON.stringify([word])));
  const repo = new StaticDictionaryRepository('/data/dictionary.json', request);
  await expect(repo.load()).rejects.toThrow('could not');
  const a = repo.load(),
    b = repo.load();
  expect(a).toBe(b);
  expect(await a).toEqual([word]);
  expect(request).toHaveBeenCalledTimes(2);
  await repo.load();
  expect(request).toHaveBeenCalledTimes(2);
});
it('rejects malformed snapshots instead of showing an empty success', async () => {
  const repo = new StaticDictionaryRepository(
    '/data',
    vi.fn().mockResolvedValue(new Response('{}'))
  );
  await expect(repo.load()).rejects.toThrow('Invalid dictionary snapshot');
});

it('calls fetch as an unbound function, as required by browser hosts', async () => {
  function request(this: unknown) {
    expect(this).toBeUndefined();
    return Promise.resolve(new Response(JSON.stringify([word])));
  }
  await expect(new StaticDictionaryRepository('/data', request).load()).resolves.toEqual([word]);
});
