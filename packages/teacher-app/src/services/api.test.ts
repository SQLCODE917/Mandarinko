import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Word } from '@mandarinko/core';
import { createWord } from './api';

describe('api.createWord', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('sends the correct POST request and returns the created word', async () => {
    const newWord: Omit<Word, 'id'> = {
      spelling: [{ language: 'ja', text: '会う' }],
      pronunciation: 'あう',
      definition: ['to see (a person)', 'to meet'],
      derivation: 'example',
      childrenIds: ['2'],
      siblingIds: ['3'],
      metadata: { hskLevel: 2 },
    };

    const created = { ...newWord, id: 'server-id' };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => created,
    });

    const result = await createWord(newWord);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3000/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWord),
    });
    expect(result).toEqual(created);
  });

  it('throws when the request fails', async () => {
    const newWord: Omit<Word, 'id'> = {
      spelling: [{ language: 'ja', text: '会う' }],
      pronunciation: 'あう',
      definition: ['to see (a person)', 'to meet'],
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await expect(createWord(newWord)).rejects.toThrow('Failed to create word');
  });
});
