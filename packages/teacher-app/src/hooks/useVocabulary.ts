import { useState, useEffect, useCallback } from 'react';
import type { Word } from '@mandarinko/core';
import * as api from '../services/api';

export function useVocabulary() {
  const [words, setWords] = useState<(Word & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWords = useCallback(async (strict = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchAllWords();
      setWords(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      if (strict) throw err;
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  const upsertWord = useCallback((word: Word) => {
    setWords((current) =>
      current.some((entry) => entry.id === word.id)
        ? current.map((entry) => (entry.id === word.id ? word : entry))
        : [...current, word]
    );
  }, []);

  const refetch = useCallback(() => loadWords(true), [loadWords]);
  return { words, loading, error, refetch, upsertWord };
}
