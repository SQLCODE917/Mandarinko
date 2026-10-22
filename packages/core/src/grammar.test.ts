import { describe, expect, it } from 'vitest';
import { matchesEntry, validateGrammarPattern, type GrammarPattern } from './index.js';

export const pattern: GrammarPattern = {
  id: 'de',
  spelling: [{ language: 'ja', text: 'で' }],
  title: 'Location of action',
  definition: ['Marks where an action occurs.'],
  category: 'Particles',
  examples: [
    {
      spelling: [{ language: 'ja', text: '図書館で読みます。' }],
      definition: ['I read at the library.'],
    },
  ],
  metadata: { jlptLevel: 5, addedBy: 'teacher' },
};

describe('grammar contract', () => {
  it('accepts flat patterns using shared spellings and metadata', () => {
    expect(validateGrammarPattern(pattern)).toEqual([]);
  });

  it.each([
    [null, 'pattern'],
    [{ ...pattern, childrenIds: [] }, 'childrenIds'],
    [{ ...pattern, spelling: [null] }, 'spelling[0]'],
    [{ ...pattern, examples: [{ ...pattern.examples[0], examples: [] }] }, 'examples[0].examples'],
    [{ ...pattern, examples: [{ spelling: [], definition: [] }] }, 'examples[0].spelling'],
    [{ ...pattern, metadata: { jlptLevel: '5' } }, 'metadata.jlptLevel'],
    [{ ...pattern, title: ' ' }, 'title'],
    [{ ...pattern, contrastIds: [null] }, 'contrastIds[0]'],
  ])('rejects malformed and recursive input at %s', (input, field) => {
    expect(validateGrammarPattern(input).some((error) => error.field === field)).toBe(true);
  });

  it.each([
    'で',
    'LOCATION',
    'occurs',
    'particles',
    '図書館',
    'library',
    'jlpt 5',
    'teacher',
    'de',
  ])('searches every field: %s', (query) => {
    expect(matchesEntry(pattern, query)).toBe(true);
  });

  it('matches blank queries and requires all search terms', () => {
    expect(matchesEntry(pattern, ' ')).toBe(true);
    expect(matchesEntry(pattern, 'library particles')).toBe(true);
    expect(matchesEntry(pattern, 'library absent')).toBe(false);
  });
});
