import type { Word } from './types.js';

export type DerivationPart = { text: string; wordId?: string };

export function derivationParts(
  text: string,
  words: readonly Word[],
  currentWordId?: string
): DerivationPart[] {
  const byId = new Map(words.map((word) => [word.id, word]));
  const current = currentWordId === undefined ? undefined : byId.get(currentWordId);
  const families = new Set(current?.spelling.map(({ language }) => language.split('-')[0]));
  const family = families.size === 1 ? [...families][0] : undefined;
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
      const ids = [...spellings.get(match)!];
      const sameFamily =
        family === undefined
          ? []
          : ids.filter((id) =>
              byId
                .get(id)!
                .spelling.some(
                  (spelling) =>
                    spelling.text === match && spelling.language.split('-')[0] === family
                )
            );
      // Prefer the current language without guessing between senses within it.
      // Unique cross-language links still support character exploration.
      const resolved = sameFamily.length ? sameFamily : ids;
      const wordId = resolved.length === 1 ? resolved[0] : undefined;
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
