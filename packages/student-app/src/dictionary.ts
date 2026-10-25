import { createEntrySearch, type Word } from '@mandarinko/core';
export interface DictionaryRepository {
  load(): Promise<Word[]>;
}
export interface DictionaryBoot {
  words: Word[];
  total: number;
  url: string;
}
export const searchDictionary = (words: readonly Word[]) => createEntrySearch(words);
export function readLocation(search: string) {
  const params = new URLSearchParams(search);
  return {
    query: params.get('q') ?? '',
    wordId: params.get('word'),
  };
}
