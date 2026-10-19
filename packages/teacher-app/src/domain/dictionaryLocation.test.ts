import { describe, expect, it } from 'vitest';
import { dictionaryHref, readDictionaryLocation } from './dictionaryLocation';

describe('dictionary locations', () => {
  it('round-trips opaque word IDs while preserving unrelated location data', () => {
    const base = 'https://example.test/teacher?sort=recent&tag=a&tag=b#dictionary';
    const wordId = '0 / 手?&=#';
    const href = dictionaryHref(base, { kind: 'word', wordId });
    const url = new URL(href, base);
    expect(readDictionaryLocation(url.href)).toEqual({ kind: 'word', wordId });
    expect(url.pathname).toBe('/teacher');
    expect(url.searchParams.getAll('tag')).toEqual(['a', 'b']);
    expect(url.searchParams.get('sort')).toBe('recent');
    expect(url.hash).toBe('#dictionary');
  });

  it('distinguishes creation, viewing, and closing without reserving a word ID', () => {
    const base = 'https://example.test/?word=new';
    expect(readDictionaryLocation(base)).toEqual({ kind: 'word', wordId: 'new' });
    expect(dictionaryHref(base, { kind: 'create' })).toBe('/?newWord=1');
    expect(readDictionaryLocation('https://example.test/?newWord=1')).toEqual({ kind: 'create' });
    expect(dictionaryHref('https://example.test/?newWord=1', { kind: 'closed' })).toBe('/');
    expect(readDictionaryLocation('https://example.test/')).toEqual({ kind: 'closed' });
    expect(readDictionaryLocation('https://example.test/?word=0')).toEqual({
      kind: 'word',
      wordId: '0',
    });
  });

  it.each([
    '?word=',
    '?word=a&word=b',
    '?newWord=0',
    '?newWord=',
    '?newWord=1&newWord=1',
    '?word=a&newWord=1',
  ])('rejects an invalid selection explicitly: %s', (query) => {
    expect(readDictionaryLocation(`https://example.test/${query}`)).toMatchObject({
      kind: 'invalid',
      message: expect.any(String),
    });
  });
});
