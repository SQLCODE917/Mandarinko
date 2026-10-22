import type { Word, GrammarPattern } from '@mandarinko/core';

export type ListGrammarResponse = GrammarPattern[];
export type CreateGrammarRequest = Omit<GrammarPattern, 'id'>;
export type UpdateGrammarRequest = Partial<CreateGrammarRequest>;
export type GrammarResponse = GrammarPattern;

export type WordResponse = Word & { id: string };
export type ListWordsResponse = WordResponse[];
export type SearchResponse = WordResponse[];
export type CreateWordRequest = Omit<Word, 'id'>;
export type UpdateWordRequest = Partial<Word>;
export type CreateWordResponse = WordResponse;
export type UpdateWordResponse = WordResponse;
export type DeleteWordResponse = { success: boolean };
