import { useEffect, useState } from 'react';
import type { Word } from '@mandarinko/core';
import * as api from '../services/api';

type LookupState = {
  match: (Word & { id: string }) | null;
  loading: boolean;
};

export function useWordLookup(
  spelling: string,
  { enabled = true, delayMs = 250 }: { enabled?: boolean; delayMs?: number } = {}
): LookupState {
  const [match, setMatch] = useState<LookupState['match']>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const trimmed = spelling.trim();
    if (!trimmed) {
      setMatch(null);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        const results = await api.searchBySpelling(trimmed, true);
        setMatch(results.length > 0 ? results[0] : null);
      } catch {
        setMatch(null);
      } finally {
        setLoading(false);
      }
    }, delayMs);

    return () => clearTimeout(handle);
  }, [spelling, enabled, delayMs]);

  return { match, loading };
}
