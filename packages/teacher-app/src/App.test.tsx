import { act } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./hooks/useVocabulary', () => {
  const words = [
    {
      id: 'root',
      spelling: [{ language: 'zh-Hans', text: '我' }],
      pronunciation: 'wo(3)',
      definition: ['I, me'],
    },
  ];
  const refetch = async () => words;
  return { useVocabulary: () => ({ words, loading: false, refetch }) };
});

describe('dictionary dialog sessions', () => {
  it.each(['word', 'create'])('reopens the same %s dialog after closing it', (kind) => {
    const { container } = render(<App />);
    const trigger =
      kind === 'word'
        ? container.querySelector<HTMLButtonElement>('.word-item')!
        : screen.getByRole('button', { name: '+ Create New Word' });

    for (let attempt = 0; attempt < 2; attempt++) {
      act(() => trigger.click());
      expect(
        container.querySelector('[role="dialog"]'),
        `open attempt ${attempt + 1}`
      ).not.toBeNull();
      act(() => screen.getByRole('button', { name: 'Close' }).click());
      expect(container.querySelector('[role="dialog"]')).toBeNull();
    }
  });
});
