const API_BASE = 'http://localhost:3000/api';

/** Typed HTTP adapter shared by the word and grammar catalogs. */
export function catalogApi<T extends { id: string }>(resource: string, noun: string) {
  async function read<R>(response: Response, failure: string): Promise<R> {
    if (!response.ok) throw new Error(failure);
    return response.json();
  }
  return {
    async list(): Promise<T[]> {
      return read(await fetch(`${API_BASE}/${resource}`), `Failed to fetch ${noun}s`);
    },
    async create(input: Omit<T, 'id'>, requestKey?: string): Promise<T> {
      return read(
        await fetch(`${API_BASE}/${resource}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(requestKey ? { 'Idempotency-Key': requestKey } : {}),
          },
          body: JSON.stringify(input),
        }),
        `Failed to create ${noun}`
      );
    },
    async update(id: string, updates: Partial<Omit<T, 'id'>>): Promise<T> {
      return read(
        await fetch(`${API_BASE}/${resource}/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }),
        `Failed to update ${noun}`
      );
    },
  };
}
