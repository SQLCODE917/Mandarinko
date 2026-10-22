import { useState, useEffect, useCallback } from 'react';

export function useEntries<T extends { id: string }>(fetchEntries: () => Promise<T[]>) {
  const [entries, setEntries] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    async (strict = false) => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchEntries();
        setEntries(data);
        return data;
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
        if (strict) throw error;
        return [];
      } finally {
        setLoading(false);
      }
    },
    [fetchEntries]
  );
  useEffect(() => {
    void load();
  }, [load]);
  const upsert = useCallback(
    (entry: T) =>
      setEntries((current) =>
        current.some((item) => item.id === entry.id)
          ? current.map((item) => (item.id === entry.id ? entry : item))
          : [...current, entry]
      ),
    []
  );
  const refetch = useCallback(() => load(true), [load]);
  return { entries, loading, error, upsert, refetch };
}
