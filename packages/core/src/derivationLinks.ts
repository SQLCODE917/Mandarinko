import type { Word } from './types.js';

export type DerivationPart = { text: string; wordId?: string };

export function derivationParts(
  text: string,
  words: readonly Word[],
  currentWordId?: string
): DerivationPart[] {
  const spellings = new Map<string, Set<string>>();
  for (const word of words) {
    for (const spelling of word.spelling) {
      if (!/^\p{Script=Han}+$/u.test(spelling.text)) continue;
      const ids = spellings.get(spelling.text) ?? new Set<string>();
      ids.add(word.id);
      spellings.set(spelling.text, ids);
    }
  }
  const candidates = [...spellings.keys()].sort((a, b) => b.length - a.length);
  const parts: DerivationPart[] = [];
  let plain = '';
  let offset = 0;
  while (offset < text.length) {
    const match = candidates.find((spelling) => text.startsWith(spelling, offset));
    if (match) {
      const ids = spellings.get(match)!;
      const wordId = ids.size === 1 ? [...ids][0] : undefined;
      if (wordId !== undefined && wordId !== currentWordId) {
        if (plain) parts.push({ text: plain });
        plain = '';
        parts.push({ text: match, wordId });
      } else {
        // An ambiguous or self-referencing phrase stays whole instead of linking its parts.
        plain += match;
      }
      offset += match.length;
    } else {
      const character = String.fromCodePoint(text.codePointAt(offset)!);
      plain += character;
      offset += character.length;
    }
  }
  if (plain) parts.push({ text: plain });
  return parts;
}
