import { createEntrySearch, type Word } from '@mandarinko/core';
export interface DictionaryRepository {
  load(): Promise<Word[]>;
}
export interface DictionaryBoot {
  words: Word[];
  total: number;
  url: string;
}
export const PAGE_SIZE = 24;
export const searchDictionary = (words: readonly Word[]) => createEntrySearch(words);
export function readLocation(search: string) {
  const params = new URLSearchParams(search);
  const raw = params.get('page');
  return {
    query: params.get('q') ?? '',
    page:
      raw && /^\d+$/.test(raw) ? Math.max(1, Math.min(Number(raw), Number.MAX_SAFE_INTEGER)) : 1,
    wordId: params.get('word'),
  };
}
