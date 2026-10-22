import type { GrammarDraft, GrammarDraftStore } from '../domain/grammarEditorSession';

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
    return value;
  },
  write(slot, value) {
    localStorage.setItem(prefix + slot, JSON.stringify(value));
  },
  remove(slot) {
    localStorage.removeItem(prefix + slot);
  },
};
