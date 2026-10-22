import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseGrammarData, type GrammarData } from '@mandarinko/core';

const correctedSpellings = {
  'jidoushi-tadoushi-pairs': '自動詞 ↔ 他動詞',
  'jidoushi-teiru-state': '自動詞 + ている',
  'naide-without-doing': '〜ないで',
  'tearu-vs-teiru': '〜てある vs 〜ている',
  'teiru-habit': '〜ている',
  'te-manner': '〜て',
  'te-ta-form-conjugation': 'て形・た形',
  'ba-conditional': '〜ば',
  'bakei-conditional-conjugation': 'ば形',
  'nara-topic-conditional': '〜なら',
  'tara-conditional': '〜たら',
  'to-conditional-natural': '〜と',
  'ikoukei-volitional-conjugation': 'V意向形',
  'ni-naru-become': '〜になる',
  'ni-suru-choose': '〜にする',
  'meireikei-imperative': '命令形',
  'nakunarimashita-no-longer': '〜なくなりました',
  'ni-yotte-by-agent': '〜によって',
  'shiekikei-causative-conjugation': '使役形',
  'shieki-ukemikei-conjugation': '使役受身形',
  'ukemikei-passive-conjugation': '受身形',
};

async function readGrammar(): Promise<GrammarData> {
  return parseGrammarData(
    JSON.parse(await readFile(new URL('../grammar.json', import.meta.url), 'utf8'))
  );
}

describe('shipped grammar data', () => {
  it('keeps Japanese forms separate from the removed Vietnamese explanations', async () => {
    const data = await readGrammar();
    for (const [id, text] of Object.entries(correctedSpellings)) {
      expect(data.patterns.find((pattern) => pattern.id === id)?.spelling[0], id).toEqual({
        language: 'ja',
        text,
      });
    }
  });

  it('contains no accented Latin contamination in Japanese pattern or example spellings', async () => {
    const data = await readGrammar();
    // ASCII grammar placeholders (V, N, Adj) remain valid notation. Latin accents
    // and combining tone marks exposed the Vietnamese explanations in this corpus.
    const accentedLatin = /[\u00c0-\u024f\u0300-\u036f\u1e00-\u1eff]/u;
    const contaminated: string[] = [];
    for (const pattern of data.patterns) {
      const entries = [pattern, ...pattern.examples];
      entries.forEach((entry, index) => {
        entry.spelling.forEach((spelling) => {
          if (spelling.language === 'ja' && accentedLatin.test(spelling.text.normalize('NFC'))) {
            contaminated.push(`${pattern.id}[${index}]: ${spelling.text}`);
          }
        });
      });
    }
    expect(contaminated).toEqual([]);
  });
});
