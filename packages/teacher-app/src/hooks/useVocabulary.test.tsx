import { act } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Word } from '@mandarinko/core';
import { useVocabulary } from './useVocabulary';
import * as api from '../services/api';

vi.mock('../services/api', () => ({ fetchAllWords: vi.fn() }));

describe('saved vocabulary updates', () => {
  it('publishes updates and new words without a refetch, duplicate row, or loading frame', async () => {
    const word: Word = {
      id: 'root',
      spelling: [{ language: 'zh-Hans', text: '道' }],
      pronunciation: 'dao',
      definition: ['way'],
    };
    vi.mocked(api.fetchAllWords).mockResolvedValue([word]);
    let current!: ReturnType<typeof useVocabulary>;
    function Probe() {
      current = useVocabulary();
      return null;
    }
    await act(async () => {
      render(<Probe />);
    });
    const upsert = current.upsertWord;
    act(() => {
      upsert({ ...word, pronunciation: 'dào' });
      upsert({ ...word, id: 'new' });
      upsert({ ...word, id: 'new', definition: ['new meaning'] });
    });
    expect(current.upsertWord).toBe(upsert);
    expect(current.loading).toBe(false);
    expect(current.words).toHaveLength(2);
    expect(current.words[0].pronunciation).toBe('dào');
    expect(current.words[1].definition).toEqual(['new meaning']);
    expect(api.fetchAllWords).toHaveBeenCalledTimes(1);
    expect(word.pronunciation).toBe('dao');
  });
});

it('reports a failed explicit refresh instead of returning an empty dictionary', async () => {
  vi.mocked(api.fetchAllWords).mockResolvedValueOnce([]);
  let current!: ReturnType<typeof useVocabulary>;
  function Probe() {
    current = useVocabulary();
    return null;
  }
  await act(async () => {
    render(<Probe />);
  });
  vi.mocked(api.fetchAllWords).mockRejectedValueOnce(new Error('Offline'));
  await act(async () => {
    await expect(current.refetch()).rejects.toThrow('Offline');
  });
  expect(current.error).toBe('Offline');
});
