import type { Word } from '@mandarinko/core';

export type WordResponse = Word & { id: string };
export type ListWordsResponse = WordResponse[];
export type SearchResponse = WordResponse[];
export type CreateWordRequest = Omit<Word, 'id'>;
export type UpdateWordRequest = Partial<Word>;
export type CreateWordResponse = WordResponse;
export type UpdateWordResponse = WordResponse;
export type DeleteWordResponse = { success: boolean };
