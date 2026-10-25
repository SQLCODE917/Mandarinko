import { expect, it } from 'vitest';
import { wordRelations } from './reading.js';
import type { Word } from './types.js';
it('preserves Japanese identity, follows shared character trees, and stops missing/cyclic links', () => {
  const words: Word[] = [
    {
      id: 'ja',
      spelling: [{ language: 'ja', text: '食べる' }],
      pronunciation: 'たべる',
      definition: ['eat'],
      childrenIds: ['han', 'missing', 'ja'],
      siblingIds: ['han'],
    },
    {
      id: 'han',
      spelling: [{ language: 'zh-Hant', text: '食' }],
      pronunciation: 'shi2',
      definition: ['food'],
      childrenIds: ['ja', 'han'],
    },
  ];
  const before = JSON.stringify(words);
  const result = wordRelations(words[0], new Map(words.map((w) => [w.id, w])));
  expect(result.children).toEqual([{ word: words[1], children: [] }]);
  expect(result.siblings).toEqual(result.children);
  expect(JSON.stringify(words)).toBe(before);
});
