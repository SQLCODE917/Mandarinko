import type { GrammarPattern } from './types.js';

export function normalizeGrammarForm(form: string): string {
  return form
    .normalize('NFKC')
    .replace(/[～〜~]/gu, '〜')
    .replace(/\s+/gu, '')
    .replace(/Noun/gu, 'N')
    .replace(/Verb/gu, 'V');
}

export function constructionKey(form: string) {
  return (
    normalizeGrammarForm(form)
      .replace(/名詞/gu, 'N')
      .replace(/\([^)]*[a-zA-Z][^)]*\)/gu, '')
      // Sense labels are distinct from one-mora optional forms: (の), (ら), (よ).
      .replace(/\((?=[^)]*[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}])[^)]{2,}\)$/gu, '')
      .replace(/[‐‑–−-]/gu, '-')
      .replace(/^V-る/u, '')
      .replace(/(?:Noun|Verb|[NVXYZ])\d*[-+＋]?/gu, '')
      .replace(/〜/gu, '')
      .replace(/[.…+＋]/gu, '')
  );
}
function alternatives(form: string) {
  // Split only explicit alternatives, keeping original form in the source row.
  return [form, ...form.split(/[／/・]/u)].map(constructionKey).filter(Boolean);
}
export function suggestGrammarPatterns(form: string, patterns: GrammarPattern[]) {
  const key = constructionKey(form);
  const distance = (a: string, b: string) => {
    let row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const next = [i];
      for (let j = 1; j <= b.length; j++)
        next[j] = Math.min(
          next[j - 1] + 1,
          row[j] + 1,
          row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      row = next;
    }
    return row[b.length];
  };
  return patterns
    .map((p) => ({
      id: p.id,
      score: Math.max(
        ...p.spelling
          .filter((s) => s.language === 'ja')
          .map((s) => {
            const other = constructionKey(s.text);
            return 1 - distance(key, other) / Math.max(1, key.length, other.length);
          }),
        0
      ),
    }))
    .filter((p) => p.score >= 0.55)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map((p) => p.id);
}
export function matchGrammarItem(
  item: { form: string; meaning: string },
  patterns: GrammarPattern[]
) {
  const { form, meaning } = item;
  const keys = alternatives(form);
  const candidates = patterns.filter((p) =>
    p.spelling.some(
      (s) => s.language === 'ja' && alternatives(s.text).some((k) => keys.includes(k))
    )
  );
  const sense = `${form} ${meaning}`.toLowerCase();
  const distinctions = [
    ['progress', 'habit'],
    ['result', 'habit'],
    ['cause', 'purpose'],
    ['hearsay', 'looks'],
    ['experience', 'occasional'],
    ['ability', 'passive'],
    ['decision', 'effort'],
    ['regret', 'discovery'],
  ];
  const compatible = candidates.filter((p) => {
    const text = `${p.title} ${p.definition.join(' ')}`.toLowerCase();
    const meaningWords = meaning.toLowerCase().match(/[a-z]{4,}/g) ?? [];
    if (meaningWords.length && !meaningWords.some((word) => text.includes(word))) return false;
    return distinctions.every(
      ([a, b]) =>
        !(sense.includes(a) && !sense.includes(b) && text.includes(b) && !text.includes(a)) &&
        !(sense.includes(b) && !sense.includes(a) && text.includes(a) && !text.includes(b))
    );
  });
  // These catalog entries combine senses that the curricula introduce separately.
  const combined = new Set(['koto-ga-aru', 'bakari-only-just', 'tsumori-da', 'to-iu-koto-da']);
  const broadFamilies = new Set([
    'こと',
    'の',
    'ように',
    'という',
    'ところ',
    'と',
    'が',
    'は',
    'で',
    'に',
    'から',
    'まで',
    'ばかり',
  ]);
  const needsSense = !/[a-z]{4,}/i.test(meaning) && broadFamilies.has(constructionKey(form));
  return {
    candidates: candidates.map((p) => p.id),
    patternId:
      compatible.length === 1 && !needsSense && !combined.has(compatible[0].id)
        ? compatible[0].id
        : undefined,
  };
}
