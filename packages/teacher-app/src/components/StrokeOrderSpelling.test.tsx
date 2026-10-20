import { act } from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StrokeOrderScope } from './StrokeOrderSpelling';
import { WordEntry } from './WordEntry';
import { createStrokePlayer } from '../services/strokeOrder';

vi.mock('../services/strokeOrder', async (original) => ({
  ...(await original<typeof import('../services/strokeOrder')>()),
  createStrokePlayer: vi.fn(),
}));
const create = vi.mocked(createStrokePlayer);
const word = {
  id: 'meeting',
  spelling: [{ language: 'ja', text: '会う' }],
  pronunciation: 'あう (canonical)',
  definition: ['to meet'],
};
let dispose: ReturnType<typeof vi.fn>;
beforeEach(() => {
  dispose = vi.fn();
  create.mockReset();
  create.mockImplementation(async (target) => {
    target.append(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
    return { reset: vi.fn(), play: () => new Promise(() => {}), dispose };
  });
});

function setup() {
  const result = render(
    <StrokeOrderScope>
      <WordEntry word={word} strokeOrder />
      <WordEntry
        word={{ ...word, id: 'other', spelling: [{ language: 'zh-Hans', text: '会' }] }}
        strokeOrder
      />
    </StrokeOrderScope>
  );
  return { ...result, buttons: result.container.querySelectorAll('button') };
}

describe('stroke order spelling', () => {
  it('does not add playback buttons to lists or load data before activation', () => {
    const { container } = render(<WordEntry word={word} />);
    expect(container.querySelector('button')).toBeNull();
    setup();
    expect(create).not.toHaveBeenCalled();
  });

  it('toggles with one click, retains the sizing text and canonical pronunciation, and disposes playback', async () => {
    const { container, buttons } = setup();
    await act(async () => buttons[0].click());
    await waitFor(() => expect(buttons[0].dataset.playing).toBe('true'));
    expect(buttons[0].querySelector('.stroke-order-text')?.textContent).toBe('会う');
    expect(container.querySelector('.word-entry-pronunciation')?.textContent).toBe(
      word.pronunciation
    );
    expect(create.mock.calls.map((args) => args.slice(1, 3))).toEqual([
      ['会', 'ja'],
      ['う', 'ja'],
    ]);
    await act(async () => buttons[0].click());
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[0].querySelector('svg')).toBeNull();
    expect(dispose).toHaveBeenCalledTimes(2);
  });

  it('allows just one active spelling and cleans up on unmount', async () => {
    const { buttons, unmount } = setup();
    await act(async () => buttons[0].click());
    await waitFor(() => expect(buttons[0].dataset.playing).toBe('true'));
    await act(async () => buttons[1].click());
    await waitFor(() => expect(buttons[1].dataset.playing).toBe('true'));
    expect(buttons[0].dataset.playing).toBe('false');
    expect(buttons[0].querySelector('svg')).toBeNull();
    unmount();
    expect(dispose).toHaveBeenCalledTimes(3);
  });

  it('keeps text visible on failure and reports unavailable data without automatic retries', async () => {
    create.mockRejectedValue(new Error('missing'));
    const { buttons } = setup();
    await act(async () => buttons[0].click());
    await waitFor(() =>
      expect(buttons[0].querySelector('[role="status"]')?.textContent).toBe(
        'Stroke order unavailable'
      )
    );
    expect(buttons[0].dataset.playing).toBe('false');
    expect(buttons[0].getAttribute('aria-busy')).toBe('false');
    expect(create).toHaveBeenCalledTimes(1);
    await act(async () => buttons[0].click());
    expect(buttons[0].querySelector('[role="status"]')).toBeNull();
  });

  it('ignores a late load after cancel and disposes its player', async () => {
    let complete!: (value: Awaited<ReturnType<typeof createStrokePlayer>>) => void;
    create.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      })
    );
    const { buttons } = setup();
    await act(async () => buttons[1].click());
    expect(buttons[1].getAttribute('aria-busy')).toBe('true');
    await act(async () => buttons[1].click());
    await act(async () => complete({ reset: vi.fn(), play: vi.fn(), dispose }));
    expect(buttons[1].dataset.playing).toBe('false');
    expect(buttons[1].querySelector('svg')).toBeNull();
    expect(dispose).toHaveBeenCalled();
  });
});

it('draws characters in sequence and repeats only after the completed-word pause', async () => {
  vi.useFakeTimers();
  const drawn: string[] = [];
  let finish!: () => void;
  create.mockImplementation(async (_target, character) => ({
    reset: vi.fn(),
    dispose: vi.fn(),
    play: () => {
      drawn.push(character);
      return new Promise<void>((resolve) => {
        finish = resolve;
      });
    },
  }));
  const { buttons, unmount } = setup();
  try {
    await act(async () => buttons[0].click());
    expect(drawn).toEqual(['会']);
    await act(async () => finish());
    expect(drawn).toEqual(['会', 'う']);
    await act(async () => finish());
    expect(drawn).toEqual(['会', 'う']);
    await act(async () => vi.advanceTimersByTime(1200));
    expect(drawn).toEqual(['会', 'う', '会']);
  } finally {
    unmount();
    vi.useRealTimers();
  }
});
