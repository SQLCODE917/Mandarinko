import { useState, useCallback } from 'react';
import type { Word } from '@mandarinko/core';
import * as api from '../services/api';

export function useSearch() {
  const [results, setResults] = useState<(Word & { id: string })[]>([]);
  const [loading, setLoading] = useState(false);

  const searchByDefinition = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setResults([]);
      return [];
    }
    try {
      setLoading(true);
      const data = await api.searchByDefinition(keyword);
      return data;
    } catch (err) {
      console.error('Search failed:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const searchBySpelling = useCallback(async (text: string, exact: boolean = false) => {
    if (!text.trim()) {
      setResults([]);
      return [];
    }
    try {
      setLoading(true);
      const data = await api.searchBySpelling(text, exact);
      return data;
    } catch (err) {
      console.error('Search failed:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const combineResults = useCallback((resultArrays: (Word & { id: string })[][]) => {
    // Combine results from multiple searches while avoiding duplicates
    const seen = new Set<string>();
    const combined: (Word & { id: string })[] = [];

    for (const results of resultArrays) {
      for (const word of results) {
        if (!seen.has(word.id)) {
          seen.add(word.id);
          combined.push(word);
        }
      }
    }

    setResults(combined);
  }, []);

  return { results, loading, searchByDefinition, searchBySpelling, combineResults };
}
