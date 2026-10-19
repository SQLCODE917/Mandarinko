import { act } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./hooks/useVocabulary', () => {
  const words = [
    {
      id: 'root',
      spelling: [{ language: 'zh-Hans', text: '我' }],
      pronunciation: 'wo(3)',
      definition: ['I, me'],
      derivation: 'Hand 手 holding a halberd 戈. Unknown 龘.',
      childrenIds: ['hand'],
    },
    {
      id: 'hand',
      spelling: [{ language: 'zh-Hant', text: '手' }],
      pronunciation: 'shou(3)',
      definition: ['hand'],
      derivation: 'A mark 一',
    },
    {
      id: 'halberd',
      spelling: [{ language: 'zh-Hant', text: '戈' }],
      pronunciation: 'ge(1)',
      definition: ['halberd'],
    },
    {
      id: 'one',
      spelling: [{ language: 'zh-Hant', text: '一' }],
      pronunciation: 'yi(1)',
      definition: ['one'],
    },
  ];
  const refetch = async () => words;
  return { useVocabulary: () => ({ words, loading: false, refetch }) };
});

beforeEach(() => window.history.replaceState(null, '', '/'));

describe('dictionary dialog sessions', () => {
  it('does not validate an untouched draft on blur and closes with the first click', async () => {
    const { container } = render(<App />);
    act(() => screen.getByRole('button', { name: '+ Create New Word' }).click());
    const spelling = container.querySelector<HTMLTextAreaElement>('.word-editor textarea')!;
    expect(document.activeElement).toBe(spelling);
    // The local user-event harness does not generate the browser's blur-before-click sequence.
    await act(async () => spelling.dispatchEvent(new Event('focusout', { bubbles: true })));
    expect(container.querySelector('.editor-row-message')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await act(async () => screen.getByRole('button', { name: 'Close' }).click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it.each(['word', 'create'])('reopens the same %s dialog after closing it', async (kind) => {
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
      await act(async () => screen.getByRole('button', { name: 'Close' }).click());
      expect(container.querySelector('[role="dialog"]')).toBeNull();
    }
  });
});

async function traverseHistory(direction: 'back' | 'forward') {
  await act(async () => {
    const popped = new Promise<void>((resolve) => {
      window.addEventListener('popstate', () => resolve(), { once: true });
    });
    window.history[direction]();
    await popped;
  });
}

describe('dictionary browsing', () => {
  const mainWord = (container: HTMLElement) =>
    container.querySelector('.word-tree-body > .word-node .word-entry-spellings')?.textContent;

  it('links derivations and preserves the dialog through browser Back and Forward', async () => {
    const { container } = render(<App />);
    act(() => container.querySelector<HTMLButtonElement>('.word-item')!.click());
    const dialog = container.querySelector('[role="dialog"]');
    const panel = container.querySelector('.word-tree-content');
    const link = container.querySelector<HTMLAnchorElement>(
      '.word-tree-body > .word-node .word-entry-derivation a'
    );
    expect(link?.textContent).toBe('手');
    expect(link?.getAttribute('href')).toBe('/?word=hand');
    act(() => link!.click());
    expect(mainWord(container)).toBe('手');
    expect(window.location.search).toBe('?word=hand');
    expect(container.querySelector('[role="dialog"]')).toBe(dialog);
    expect(container.querySelector('.word-tree-content')).toBe(panel);

    await traverseHistory('back');
    expect(mainWord(container)).toBe('我');
    expect(container.querySelector('[role="dialog"]')).toBe(dialog);
    await traverseHistory('forward');
    expect(mainWord(container)).toBe('手');
    expect(container.querySelector('.word-tree-content')).toBe(panel);
  });

  it('uses Back to close the first word and Forward to restore it', async () => {
    const { container } = render(<App />);
    act(() => container.querySelector<HTMLButtonElement>('.word-item')!.click());
    expect(window.location.search).toBe('?word=root');
    await traverseHistory('back');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await traverseHistory('forward');
    expect(mainWord(container)).toBe('我');
  });

  it.each([
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
  ])('preserves native modified-link behavior for %o', (modifiers) => {
    const { container } = render(<App />);
    act(() => container.querySelector<HTMLButtonElement>('.word-item')!.click());
    const link = container.querySelector<HTMLAnchorElement>(
      '.word-tree-body > .word-node .word-entry-derivation a'
    )!;
    const originalHref = window.location.href;
    let intercepted: boolean | undefined;
    document.addEventListener(
      'click',
      (event) => {
        intercepted = event.defaultPrevented;
        // Cancel jsdom's default navigation only after React's handler has run.
        event.preventDefault();
      },
      { once: true }
    );
    act(() =>
      link.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          button: 0,
          ...modifiers,
        })
      )
    );
    expect(intercepted).toBe(false);
    expect(window.location.href).toBe(originalHref);
    expect(mainWord(container)).toBe('我');
  });

  it('keeps list buttons free of nested links and opens a separate inline editor in the same shell', async () => {
    const { container } = render(<App />);
    expect(container.querySelector('.word-item a')).toBeNull();
    act(() => container.querySelector<HTMLButtonElement>('.word-item')!.click());
    const dialog = container.querySelector('[role="dialog"]');
    const panel = container.querySelector('.word-tree-content');
    act(() => screen.getByRole('button', { name: 'Edit' }).click());
    expect(container.querySelector('.word-editor')).not.toBeNull();
    expect(container.querySelector('[role="dialog"]')).toBe(dialog);
    expect(container.querySelector('.word-tree-content')).toBe(panel);
    expect(container.querySelector('.word-entry-derivation a')).toBeNull();
    await act(async () => screen.getByRole('button', { name: 'Close' }).click());
    expect(mainWord(container)).toBe('我');
    expect(window.location.search).toBe('?word=root');
  });

  it('makes Close a history location so Back can reopen the last word', async () => {
    const { container } = render(<App />);
    act(() => container.querySelector<HTMLButtonElement>('.word-item')!.click());
    act(() => screen.getByRole('button', { name: 'Close' }).click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await traverseHistory('back');
    expect(mainWord(container)).toBe('我');
  });

  it('opens deep links directly without a blank or stale first render', () => {
    window.history.replaceState(null, '', '/?word=hand');
    const { container } = render(<App />);
    expect(mainWord(container)).toBe('手');
    expect(container.querySelector('.word-form')).toBeNull();
  });

  it.each(['?word=missing', '?word=', '?word=root&word=hand', '?word=root&newWord=1'])(
    'shows an explicit error rather than a new-word editor for %s',
    (query) => {
      window.history.replaceState(null, '', `/${query}`);
      const { container } = render(<App />);
      expect(container.querySelector('[role="alert"]')).not.toBeNull();
      expect(container.querySelector('.word-form')).toBeNull();
    }
  );
});
