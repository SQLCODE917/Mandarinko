import { describe, it, expect } from 'vitest';
import { componentSpellings, spellingMatches, parseEntryPaste } from './entryParsing';

describe('entry parsing', () => {
  it('splits only explicit delimiters and deduplicates, preserving compounds', () => {
    expect(componentSpellings('女, 馬，子;又；女\n学校')).toEqual(['女', '馬', '子', '又', '学校']);
    expect(componentSpellings('女馬')).toEqual(['女馬']);
  });
  it('matches Chinese aliases but keeps Japanese separate', () => {
    const w = {
      spelling: [
        { language: 'zh-Hans', text: '学' },
        { language: 'zh-Hant', text: '學' },
      ],
    };
    expect(spellingMatches(w, '學', 'zh-Hans')).toBe(true);
    expect(spellingMatches(w, '学', 'ja')).toBe(false);
  });
  it('reads quoted multiline cells, tabs, escaped quotes and CRLF', () => {
    expect(
      parseEntryPaste(
        'spelling\tdefinitions\tderivation\r\n好\t"good\r\nwell"\t"a ""quote""\tand tab"\r\n'
      )[0].values
    ).toEqual({ spelling: '好', definitions: 'good\nwell', derivation: 'a "quote"\tand tab' });
  });
  it.each([
    '好\tgood',
    'spelling\tspelling\n好\t好',
    'spelling\tunknown\n好\tx',
    'spelling\n"好',
    'spelling\n"好"x',
    'spelling\thskLevel\n好\t0',
    'spelling\tjlptLevel\n好\t6',
    'spelling\troot\n好\tyes',
    'spelling\tlanguage\ttraditional\n学\tja\t學',
    'spelling\n\tvalue',
  ])('rejects malformed paste: %s', (value) => {
    expect(() => parseEntryPaste(value)).toThrow();
  });
});
