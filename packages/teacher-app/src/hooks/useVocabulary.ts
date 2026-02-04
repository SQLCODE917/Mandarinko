import { useState, useEffect, useCallback } from 'react';
import type { Word } from '@mandarinko/core';
import * as api from '../services/api';

export function useVocabulary() {
  const [words, setWords] = useState<(Word & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchAllWords();
      setWords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  return { words, loading, error, refetch: loadWords };
}
