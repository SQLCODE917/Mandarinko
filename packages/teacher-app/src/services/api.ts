import type {
  SearchResponse,
  GrammarResponse,
  CreateGrammarRequest,
  UpdateGrammarRequest,
} from '@mandarinko/server/types';
import type { Word } from '@mandarinko/core';

import { catalogApi } from './catalogApi';

const wordCatalog = catalogApi<Word>('words', 'word');
const grammarCatalog = catalogApi<GrammarResponse>('grammar', 'grammar pattern');
export const fetchAllWords = wordCatalog.list;
export const createWord = wordCatalog.create;
export const updateWord = wordCatalog.update;
export const fetchGrammar = grammarCatalog.list;
export const createGrammar: (
  input: CreateGrammarRequest,
  requestKey?: string
) => Promise<GrammarResponse> = grammarCatalog.create;
export const updateGrammar: (id: string, input: UpdateGrammarRequest) => Promise<GrammarResponse> =
  grammarCatalog.update;

const API_BASE = 'http://localhost:3000/api';

export async function searchByDefinition(keyword: string): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: keyword });
  const response = await fetch(`${API_BASE}/words/search/definition?${params}`);
  if (!response.ok) throw new Error('Failed to search by definition');
  return response.json();
}

export async function searchBySpelling(
  text: string,
  exact: boolean = false
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: text, exact: exact ? '1' : '0' });
  const response = await fetch(`${API_BASE}/words/search/spelling?${params}`);
  if (!response.ok) throw new Error('Failed to search by spelling');
  return response.json();
}
