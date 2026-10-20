import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createStrokePlayer, type StrokePlayer } from '../services/strokeOrder';
import './StrokeOrderSpelling.css';

const Playback = createContext<{ active?: string; select: (id?: string) => void }>({
  select: () => {},
});

// One active spelling across the main word and all of its related entries.
export function StrokeOrderScope({ children }: { children: ReactNode }) {
  const [active, select] = useState<string>();
  return <Playback.Provider value={{ active, select }}>{children}</Playback.Provider>;
}

export function StrokeOrderSpelling({ text, language }: { text: string; language: string }) {
  const id = useId();
  const { active, select } = useContext(Playback);
  const requested = active === id;
  const [state, setState] = useState<'plain' | 'loading' | 'playing' | 'failed'>('plain');
  const overlay = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!requested) {
      setState('plain');
      return;
    }
    const controller = new AbortController();
    const target = overlay.current!;
    const players: StrokePlayer[] = [];
    setState('loading');
    const run = async () => {
      try {
        // Build detached: loading never exposes a partly rendered spelling.
        const stage = document.createElement('span');
        stage.className = 'stroke-order-characters';
        for (const character of text) {
          const cell = document.createElement('span');
          stage.append(cell);
          const player = await createStrokePlayer(cell, character, language, controller.signal);
          if (controller.signal.aborted) {
            player.dispose();
            return;
          }
          players.push(player);
        }
        if (controller.signal.aborted) return;
        target.textContent = '';
        target.appendChild(stage);
        setState('playing');
        while (!controller.signal.aborted) {
          players.forEach((player) => player.reset());
          for (const player of players) {
            if (controller.signal.aborted) return;
            await player.play();
          }
          if (controller.signal.aborted) return;
          await new Promise<void>((resolve) => {
            const finish = () => {
              clearTimeout(timer);
              controller.signal.removeEventListener('abort', finish);
              resolve();
            };
            const timer = window.setTimeout(finish, 1200);
            controller.signal.addEventListener('abort', finish, { once: true });
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          players.forEach((player) => player.dispose());
          target.textContent = '';
          setState('failed');
        }
      }
    };
    void run();
    return () => {
      controller.abort();
      players.forEach((player) => player.dispose());
      target.textContent = '';
    };
  }, [requested, text, language]);

  const message =
    state === 'failed'
      ? 'Stroke order unavailable. Click to return to text.'
      : state === 'loading'
        ? 'Loading stroke order. Click to cancel.'
        : requested
          ? 'Click to return to text.'
          : 'Click to animate stroke order.';
  return (
    <button
      type="button"
      className="stroke-order-spelling"
      lang={language}
      title={message}
      aria-label={`Stroke order for ${text}`}
      aria-pressed={requested}
      aria-busy={state === 'loading'}
      aria-describedby={state === 'failed' ? `${id}-status` : undefined}
      data-playing={requested && state === 'playing'}
      onClick={() => select(requested ? undefined : id)}
    >
      <span className="stroke-order-text">{text}</span>
      <span className="stroke-order-overlay" ref={overlay} aria-hidden="true" />
      {state === 'failed' && (
        <span className="stroke-order-error" role="status" id={`${id}-status`}>
          Stroke order unavailable
        </span>
      )}
    </button>
  );
}
