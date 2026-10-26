import { describe, expect, it } from 'vitest';
import type { Word } from '@mandarinko/core';
import { derivationParts } from './derivationLinks';

const word = (id: string, ...spellings: string[]): Word => ({
  id,
  spelling: spellings.map((text) => ({ language: 'zh-Hant', text })),
  pronunciation: '',
  definition: [],
});

describe('derivation references', () => {
  it('preserves all text while linking the longest known spelling and its variants', () => {
    const words = [
      word('hand', '手'),
      word('bow', '弓'),
      word('chief', '主'),
      word('assert', '主張', '主张'),
      word('long', '長', '长'),
    ];
    const text = 'Hand 手, 主張 / 主张 with 弓 and 長. Unknown 龘.';
    const parts = derivationParts(text, words);
    expect(parts.filter((part) => part.wordId !== undefined)).toEqual([
      { text: '手', wordId: 'hand' },
      { text: '主張', wordId: 'assert' },
      { text: '主张', wordId: 'assert' },
      { text: '弓', wordId: 'bow' },
      { text: '長', wordId: 'long' },
    ]);
    expect(parts.map((part) => part.text).join('')).toBe(text);
  });

  it('does not guess between different entries or split an ambiguous phrase into shorter links', () => {
    expect(
      derivationParts('主張', [word('a', '主張'), word('b', '主張'), word('chief', '主')])
    ).toEqual([{ text: '主張' }]);
  });

  it('deduplicates variants of one entry and leaves self-references plain', () => {
    const words = [word('hand', '手', '手')];
    expect(derivationParts('手', words)).toEqual([{ text: '手', wordId: 'hand' }]);
    expect(derivationParts('手', words, 'hand')).toEqual([{ text: '手' }]);
  });

  it('does not turn Latin, kana, or unknown characters into dictionary links', () => {
    const text = 'hand あ 会う 龘';
    expect(
      derivationParts(text, [word('english', 'hand'), word('japanese', '会う', 'あ')])
    ).toEqual([{ text }]);
  });

  it('handles supplementary-plane Han characters without breaking Unicode text', () => {
    const text = '🙂 𠀀 手';
    expect(derivationParts(text, [word('ancient', '𠀀'), word('hand', '手')])).toEqual([
      { text: '🙂 ' },
      { text: '𠀀', wordId: 'ancient' },
      { text: ' ' },
      { text: '手', wordId: 'hand' },
    ]);
  });

  it('resolves Chinese versus Japanese homographs using the current language family', () => {
    const chinese = word('eight-zh', '八');
    chinese.spelling[0].language = 'zh-Hans';
    const japanese = word('eight-ja', '八');
    japanese.spelling[0].language = 'ja';
    const root = word('root', '尒');
    const words = [root, chinese, japanese];
    expect(derivationParts('separated by 八', words, root.id)).toEqual([
      { text: 'separated by ' },
      { text: '八', wordId: chinese.id },
    ]);
    expect(derivationParts('八', words)).toEqual([{ text: '八' }]);
    expect(derivationParts('八', words, 'missing')).toEqual([{ text: '八' }]);
    root.spelling[0].language = 'ja';
    expect(derivationParts('八', words, root.id)).toEqual([{ text: '八', wordId: japanese.id }]);
  });

  it('retains same-language ambiguity and self-reference protection', () => {
    const words = [word('root', '尒'), word('a', '八'), word('b', '八')];
    expect(derivationParts('八', words, 'root')).toEqual([{ text: '八' }]);
    const japanese = word('ja', '八');
    japanese.spelling[0].language = 'ja';
    expect(derivationParts('八', [word('self', '八'), japanese], 'self')).toEqual([{ text: '八' }]);
  });

  it('keeps unique cross-language references but does not guess for mixed-language roots', () => {
    const root = word('root', '尒');
    const japanese = word('eight-ja', '八');
    japanese.spelling[0].language = 'ja';
    expect(derivationParts('八', [root, japanese], 'root')).toEqual([
      { text: '八', wordId: japanese.id },
    ]);
    root.spelling.push({ language: 'ja', text: '尒' });
    expect(derivationParts('八', [root, word('eight-zh', '八'), japanese], 'root')).toEqual([
      { text: '八' },
    ]);
  });

  it('accepts an empty derivation or vocabulary without inventing links', () => {
    expect(derivationParts('', [])).toEqual([]);
    expect(derivationParts('<b>手</b>', [])).toEqual([{ text: '<b>手</b>' }]);
  });
});
