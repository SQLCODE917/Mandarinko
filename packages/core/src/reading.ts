import type { Word } from './types.js';
export interface ReadingNode {
  word: Word;
  children: ReadingNode[];
}
/** Only existing, non-ancestor relations are traversed. Japanese words keep their own entry. */
export function wordRelations(
  word: Word,
  words: ReadonlyMap<string, Word>
): { children: ReadingNode[]; siblings: ReadingNode[] } {
  const visit = (
    ids: readonly string[] | undefined,
    ancestors: ReadonlySet<string>
  ): ReadingNode[] =>
    [...new Set(ids ?? [])].flatMap((id) => {
      const related = words.get(id);
      if (!related || ancestors.has(id)) return [];
      const next = new Set(ancestors);
      next.add(id);
      return [{ word: related, children: visit(related.childrenIds, next) }];
    });
  const ancestors = new Set([word.id]);
  return {
    children: visit(word.childrenIds, ancestors),
    siblings: visit(word.siblingIds, ancestors),
  };
}
