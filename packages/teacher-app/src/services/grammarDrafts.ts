import type { GrammarDraft, GrammarDraftStore, GrammarInput } from '../domain/grammarEditorSession';

const prefix = 'mandarinko:grammar-draft:';
export const grammarDrafts: GrammarDraftStore = {
  read(slot) {
    const raw = localStorage.getItem(prefix + slot);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as GrammarDraft;
    if (
      !value ||
      typeof value.requestKey !== 'string' ||
      !value.draft ||
      !Array.isArray(value.draft.spelling) ||
      !Array.isArray(value.draft.definition) ||
      !Array.isArray(value.draft.examples)
    )
      throw new Error('Invalid grammar draft');
    // Upgrade retained browser drafts when comparisons move out of catalog data.
    // Reading does not overwrite the original; the next successful checkpoint does.
    const content = (input: GrammarInput & { contrastIds?: unknown }): GrammarInput => {
      if (!('contrastIds' in input)) return input;
      if (
        !Array.isArray(input.contrastIds) ||
        input.contrastIds.some((id) => typeof id !== 'string')
      )
        throw new Error('Invalid comparison draft');
      const { contrastIds, ...rest } = input;
      return { ...rest, comparisonIds: rest.comparisonIds ?? (contrastIds as string[]) };
    };
    return {
      ...value,
      draft: content(value.draft),
      ...(value.pendingCreation ? { pendingCreation: content(value.pendingCreation) } : {}),
    };
  },
  write(slot, value) {
    localStorage.setItem(prefix + slot, JSON.stringify(value));
  },
  remove(slot) {
    localStorage.removeItem(prefix + slot);
  },
};
