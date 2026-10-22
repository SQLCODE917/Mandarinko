import { useEntries } from './useEntries';
import { fetchAllWords } from '../services/api';

export function useVocabulary() {
  const { entries: words, upsert: upsertWord, ...state } = useEntries(fetchAllWords);
  return { words, upsertWord, ...state };
}
