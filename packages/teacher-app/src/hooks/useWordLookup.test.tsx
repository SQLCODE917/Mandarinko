import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useWordLookup } from './useWordLookup';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  searchBySpelling: vi.fn(),
}));

const searchMock = vi.mocked(api.searchBySpelling);

function TestLookup({ spelling }: { spelling: string }) {
  const { match } = useWordLookup(spelling, { enabled: true, delayMs: 0 });
  return <div data-testid="match">{match?.id ?? ''}</div>;
}

describe('useWordLookup', () => {
  beforeEach(() => {
    searchMock.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the first match for a spelling', async () => {
    searchMock.mockResolvedValue([
      {
        id: 'word-1',
        spelling: [{ language: 'zh-Hans', text: '我' }],
        pronunciation: 'wo(3)',
        definition: ['I'],
      },
    ]);

    const { container } = render(<TestLookup spelling="我" />);
    await vi.runAllTimersAsync();
    await waitFor(() => {
      const el = container.querySelector('[data-testid="match"]') as HTMLElement;
      expect(el.textContent).toBe('word-1');
    });
  });
});
