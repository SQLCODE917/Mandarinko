import type { CharacterJson } from 'hanzi-writer';

// Pin both data sources: a shared Unicode glyph need not share a writing order.
const JAPANESE_DATA =
  'https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@70a0b7ae0c18ceb5cb358274b029cce0234a43bc/kanji/';
const CHINESE_DATA = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';
const japanese = new Map<string, Promise<string[]>>();
const chinese = new Map<string, Promise<CharacterJson>>();
const SVG_NS = 'http://www.w3.org/2000/svg';

export function strokeLanguage(language: string): 'ja' | 'zh' | undefined {
  if (/^ja(?:-|$)/i.test(language)) return 'ja';
  if (/^zh(?:-|$)/i.test(language)) return 'zh';
}

export function hasStrokeOrder(text: string, language: string): boolean {
  return Boolean(
    strokeLanguage(language) && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)
  );
}

function cached<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>) {
  let result = cache.get(key);
  if (!result) {
    result = load().catch((error: unknown) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, result);
  }
  return result;
}

export function parseJapaneseStrokes(source: string): string[] {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  // Read only path data from the stroke group; never inject downloaded markup.
  const paths = [...document.querySelectorAll('g[id^="kvg:StrokePaths_"] path')].map(
    (path) => path.getAttribute('d') ?? ''
  );
  if (document.querySelector('parsererror') || paths.length === 0 || paths.some((path) => !path))
    throw new Error('Japanese stroke data is unavailable.');
  return paths;
}

export function parseChineseStrokes(value: unknown): CharacterJson {
  const data = value as Partial<CharacterJson> | null;
  if (
    !data ||
    !Array.isArray(data.strokes) ||
    data.strokes.length === 0 ||
    !data.strokes.every((stroke) => typeof stroke === 'string' && stroke.length > 0) ||
    !Array.isArray(data.medians) ||
    data.medians.length !== data.strokes.length ||
    !data.medians.every(
      (median) =>
        Array.isArray(median) &&
        median.length >= 2 &&
        median.every(
          (point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)
        )
    )
  )
    throw new Error('Chinese stroke data is unavailable.');
  return data as CharacterJson;
}

export type StrokePlayer = {
  reset: () => void;
  play: () => Promise<unknown>;
  dispose: () => void;
};

export async function createStrokePlayer(
  target: HTMLElement,
  character: string,
  language: string,
  signal: AbortSignal
): Promise<StrokePlayer> {
  if (!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(character)) {
    target.textContent = character;
    return { reset: () => {}, play: async () => {}, dispose: () => {} };
  }
  if (strokeLanguage(language) === 'ja') {
    const paths = await cached(japanese, character, async () => {
      const code = character.codePointAt(0)!.toString(16).padStart(5, '0');
      const response = await fetch(`${JAPANESE_DATA}${code}.svg`);
      if (!response.ok) throw new Error('Japanese stroke data is unavailable.');
      return parseJapaneseStrokes(await response.text());
    });
    if (signal.aborted) throw new DOMException('Playback cancelled.', 'AbortError');
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 109 109');
    const strokes = paths.map((data) => {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', data);
      path.setAttribute('pathLength', '1');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '5');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.style.strokeDasharray = '1';
      path.style.strokeDashoffset = '1';
      svg.append(path);
      return path;
    });
    target.textContent = '';
    target.appendChild(svg);
    let animations: Animation[] = [];
    const reset = () => {
      animations.forEach((animation) => animation.cancel());
      animations = [];
    };
    return {
      reset,
      play: () => {
        const duration = strokes.length * 550;
        animations = strokes.map((stroke, index) =>
          stroke.animate(
            [
              { strokeDashoffset: '1', offset: 0 },
              { strokeDashoffset: '1', offset: index / strokes.length },
              { strokeDashoffset: '0', offset: (index + 0.8) / strokes.length },
              { strokeDashoffset: '0', offset: 1 },
            ],
            { duration, fill: 'forwards' }
          )
        );
        return Promise.all(animations.map((animation) => animation.finished));
      },
      dispose: reset,
    };
  }
  const [module, data] = await Promise.all([
    import('hanzi-writer'),
    cached(chinese, character, async () => {
      const response = await fetch(`${CHINESE_DATA}${encodeURIComponent(character)}.json`);
      if (!response.ok) throw new Error('Chinese stroke data is unavailable.');
      return parseChineseStrokes(await response.json());
    }),
  ]);
  if (signal.aborted) throw new DOMException('Playback cancelled.', 'AbortError');
  const writer = module.default.create(target, character, {
    width: 100,
    height: 100,
    padding: 5,
    showCharacter: false,
    showOutline: false,
    strokeColor: '#292723',
    strokeAnimationSpeed: 1,
    delayBetweenStrokes: 180,
    charDataLoader: () => data,
  });
  // Hanzi Writer sets pixel dimensions but no viewBox. Preserve its drawing
  // coordinates when CSS scales the SVG into the original spelling's slot.
  target.querySelector('svg')!.setAttribute('viewBox', '0 0 100 100');
  return {
    reset: () => {
      void writer.hideCharacter({ duration: 0 });
    },
    play: () => writer.animateCharacter(),
    dispose: () => writer.pauseAnimation(),
  };
}
