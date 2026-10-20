import { act, createRef } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Word } from '@mandarinko/core';
import { WordEditor, type WordEditorHandle } from './WordEditor';

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

const word: Word = {
  id: 'root',
  spelling: [{ language: 'zh-Hans', text: '道' }],
  pronunciation: 'dao',
  definition: ['way'],
};
function setup(initial: Word | undefined = word) {
  const callbacks = {
    createWord: vi.fn(async (value: Omit<Word, 'id'>) => ({ ...value, id: 'new' })),
    updateWord: vi.fn(async (id: string, value: Partial<Word>) => ({ ...word, ...value, id })),
    refreshVocabulary: vi.fn(async () => [word]),
  };
  const ref = createRef<WordEditorHandle>();
  const onExit = vi.fn();
  const { container } = render(
    <WordEditor ref={ref} word={initial} words={[word]} callbacks={callbacks} onExit={onExit} />
  );
  const field = (name: string) =>
    container.querySelector<HTMLTextAreaElement>(`textarea[aria-label="${name}"]`)!;
  const button = (name: string) =>
    [...container.querySelectorAll('button')].find(
      (element) => element.textContent?.trim() === name
    )!;
  return { container, field, button, callbacks, ref, onExit };
}

describe('direct word entry', () => {
  it('saves on blur and preserves the next field and its focus', async () => {
    const { field, callbacks } = setup();
    const pronunciation = field('Main word: Pronunciation');
    const definition = field('Main word: Definition 1');
    await userEvent.type(pronunciation, 'dào');
    expect(callbacks.updateWord).not.toHaveBeenCalled();
    await act(async () => {
      pronunciation.focus();
      pronunciation.dispatchEvent(new Event('focusout', { bubbles: true }));
      definition.focus();
    });
    expect(callbacks.updateWord).toHaveBeenCalledTimes(1);
    expect(callbacks.updateWord.mock.calls[0][1].pronunciation).toBe('dào');
    expect(field('Main word: Definition 1')).toBe(definition);
    expect(document.activeElement).toBe(definition);
  });

  it('adds a related row with one click, focuses it, and reuses an existing word on blur', async () => {
    const { field, button, callbacks } = setup();
    await userEvent.click(button('+ Child'));
    const spelling = field('Child 1: Spelling 1');
    expect(document.activeElement).toBe(spelling);
    await userEvent.type(spelling, '道');
    await act(async () => field('Child 1: Pronunciation').focus());
    // Reject self-links rather than creating a second copy of the root.
    expect(callbacks.createWord).not.toHaveBeenCalled();
    expect(callbacks.updateWord).not.toHaveBeenCalled();
    expect(button('Discard draft')).toBeDefined();
  });

  it('focuses new definition and spelling fields immediately and supports paragraphs', async () => {
    const { field, button } = setup();
    await userEvent.click(button('+ Definition'));
    expect(document.activeElement).toBe(field('Main word: Definition 2'));
    const text = 'First line\nSecond line with more detail';
    await userEvent.type(field('Main word: Definition 2'), text);
    expect(field('Main word: Definition 2').value).toBe(text);
    await userEvent.click(button('+ Variant'));
    expect(document.activeElement).toBe(field('Main word: Spelling 2'));
  });

  it('keeps a failed save recoverable until explicit retry and Done', async () => {
    const { field, callbacks, button, container, onExit } = setup();
    callbacks.updateWord.mockRejectedValueOnce(new Error('Offline'));
    const pronunciation = field('Main word: Pronunciation');
    await userEvent.type(pronunciation, 'dào');
    await act(async () => {
      pronunciation.focus();
      pronunciation.dispatchEvent(new Event('focusout', { bubbles: true }));
      pronunciation.blur();
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Offline');
    expect(onExit).not.toHaveBeenCalled();
    expect(callbacks.updateWord).toHaveBeenCalledTimes(1);
    expect(pronunciation.value).toBe('dào');
    await userEvent.click(button('Retry save'));
    await userEvent.click(button('Done'));
    expect(onExit).toHaveBeenCalledWith({ kind: 'finished', wordId: 'root' });
    expect(callbacks.refreshVocabulary).not.toHaveBeenCalled();
  });
});
