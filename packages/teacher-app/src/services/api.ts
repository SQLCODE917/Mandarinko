import type { ListWordsResponse, SearchResponse } from '@mandarinko/server/types';
import type { Word } from '@mandarinko/core';

const API_BASE = 'http://localhost:3000/api';

export async function fetchAllWords(): Promise<ListWordsResponse> {
  const response = await fetch(`${API_BASE}/words`);
  if (!response.ok) throw new Error('Failed to fetch words');
  return response.json();
}

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

export async function createWord(word: Omit<Word, 'id'>): Promise<Word & { id: string }> {
  const response = await fetch(`${API_BASE}/words`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(word),
  });
  if (!response.ok) throw new Error('Failed to create word');
  return response.json();
}

export async function updateWord(
  id: string,
  updates: Partial<Word>
): Promise<Word & { id: string }> {
  const response = await fetch(`${API_BASE}/words/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update word');
  return response.json();
}
