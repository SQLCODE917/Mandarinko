import { describe, expect, it, vi } from 'vitest';
import {
  createStrokePlayer,
  hasStrokeOrder,
  parseChineseStrokes,
  parseJapaneseStrokes,
  strokeLanguage,
} from './strokeOrder';

describe('stroke data selection', () => {
  it('selects by language rather than the shared character', () => {
    expect(strokeLanguage('ja-JP')).toBe('ja');
    expect(strokeLanguage('zh-Hant')).toBe('zh');
    expect(strokeLanguage('jargon')).toBeUndefined();
    expect(hasStrokeOrder('会', 'en')).toBe(false);
    expect(hasStrokeOrder('hello', 'ja')).toBe(false);
    expect(hasStrokeOrder('会う', 'ja')).toBe(true);
  });
  it('extracts only ordered stroke paths without injecting SVG markup or numbers', () => {
    expect(
      parseJapaneseStrokes(
        '<svg xmlns="http://www.w3.org/2000/svg"><image href="bad"/><g id="kvg:StrokePaths_04f1a"><g><path d="M1,2 L3,4" onload="bad()"/><path d="M5,6 L7,8"/></g></g><path d="M0,0"/></svg>'
      )
    ).toEqual(['M1,2 L3,4', 'M5,6 L7,8']);
  });
  it.each([
    '<svg/>',
    '<svg>',
    '<svg><g id="kvg:StrokePaths_x"><path/></g></svg>',
    '<html>not SVG</html>',
  ])('rejects missing or malformed stroke data: %s', (source) => {
    expect(() => parseJapaneseStrokes(source)).toThrow('Japanese stroke data is unavailable.');
  });
});

describe('Chinese stroke data', () => {
  it('accepts matching outlines and drawing medians', () => {
    const data = {
      strokes: ['M0,0 L1,1'],
      medians: [
        [
          [0, 0],
          [1, 1],
        ],
      ],
    };
    expect(parseChineseStrokes(data)).toBe(data);
  });
  it.each([
    null,
    {},
    { strokes: [], medians: [] },
    { strokes: ['M0,0'], medians: [] },
    { strokes: ['M0,0'], medians: [[[0, 0]]] },
    {
      strokes: ['M0,0'],
      medians: [
        [
          [0, 0],
          ['bad', 1],
        ],
      ],
    },
  ])('rejects malformed data before creating a renderer: %o', (data) => {
    expect(() => parseChineseStrokes(data)).toThrow('Chinese stroke data is unavailable.');
  });
});

it('gives the real Chinese renderer a viewBox so CSS can scale its 100-unit drawing to the spelling slot', async () => {
  const target = document.createElement('span');
  const data = {
    strokes: ['M100,100 L200,200'],
    medians: [
      [
        [100, 100],
        [200, 200],
      ],
    ],
  };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
  let player: Awaited<ReturnType<typeof createStrokePlayer>> | undefined;
  try {
    player = await createStrokePlayer(target, '日', 'zh-Hans', new AbortController().signal);
    expect(target.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 100 100');
  } finally {
    player?.dispose();
    vi.unstubAllGlobals();
  }
});
