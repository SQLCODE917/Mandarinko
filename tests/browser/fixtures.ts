import { test as base, expect } from '@playwright/test';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../packages/server/dist/index.js';
import type { Word, GrammarPattern } from '../../packages/core/src/index';

export const grammarPatterns: GrammarPattern[] = [
  {
    id: 'de',
    spelling: [{ language: 'ja', text: 'で' }],
    title: 'Location of action',
    definition: ['Marks the location of an action'],
    category: 'Particles',
    examples: [
      {
        spelling: [{ language: 'ja', text: '図書館で読みます。' }],
        definition: ['I read at the library.'],
      },
    ],
    metadata: { jlptLevel: 5 },
  },
  {
    id: 'ni',
    spelling: [{ language: 'ja', text: 'に' }],
    title: 'Destination',
    definition: ['Marks a destination'],
    category: 'Particles',
    examples: [],
    metadata: { jlptLevel: 5 },
  },
];

export const words: Word[] = [
  {
    id: 'female',
    spelling: [{ language: 'zh-Hans', text: '女' }],
    pronunciation: 'nü3',
    definition: ['woman'],
    derivation: 'old',
  },
  {
    id: 'child',
    spelling: [{ language: 'zh-Hans', text: '子' }],
    pronunciation: 'zi3',
    definition: ['child'],
  },
  {
    id: 'again',
    spelling: [{ language: 'zh-Hans', text: '又' }],
    pronunciation: 'you4',
    definition: ['again'],
  },
  {
    id: 'study',
    spelling: [
      { language: 'zh-Hans', text: '学' },
      { language: 'zh-Hant', text: '學' },
    ],
    pronunciation: 'xue2',
    definition: ['study'],
    childrenIds: ['child'],
  },
  {
    id: 'ja-study',
    spelling: [{ language: 'ja', text: '学' }],
    pronunciation: 'gaku',
    definition: ['learning'],
  },
];
type Fixture = {
  vocabulary: {
    read: () => Promise<Record<string, Word>>;
    readGrammar: () => Promise<GrammarPattern[]>;
    delay: number;
    fail: 'create' | 'links' | 'lost' | 'comparisons' | null;
    writes: number;
  };
};
export const test = base.extend<Fixture>({
  vocabulary: [
    async ({ page }, use) => {
      const directory = await mkdtemp(join(tmpdir(), 'mandarinko-browser-'));
      const file = join(directory, 'vocabulary.json');
      const grammarFile = join(directory, 'grammar.json');
      await writeFile(file, JSON.stringify(Object.fromEntries(words.map((w) => [w.id, w]))));
      await writeFile(grammarFile, JSON.stringify({ schemaVersion: 1, patterns: grammarPatterns }));
      await writeFile(
        join(directory, 'grammar.relationships.json'),
        JSON.stringify({
          schemaVersion: 2,
          relationships: [
            {
              id: 'compared:de:ni',
              fromId: 'de',
              toId: 'ni',
              type: 'compared',
              rationale: 'Distinguish action locations from destinations.',
            },
          ],
        })
      );
      const { app } = createApp(file, grammarFile);
      const server = app.listen(0, '127.0.0.1');
      await new Promise<void>((resolve) => server.once('listening', resolve));
      const fixture: Fixture['vocabulary'] = {
        read: async () => JSON.parse(await readFile(file, 'utf8')),
        readGrammar: async () => JSON.parse(await readFile(grammarFile, 'utf8')).patterns,
        delay: 0,
        fail: null,
        writes: 0,
      };
      await page.route('http://localhost:3000/api/**', async (route) => {
        const request = route.request(),
          method = request.method();
        if (method === 'OPTIONS') {
          await route.fulfill({
            status: 204,
            headers: {
              'access-control-allow-origin': '*',
              'access-control-allow-headers': '*',
              'access-control-allow-methods': '*',
            },
          });
          return;
        }
        if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
          fixture.writes++;
          if (fixture.delay) await new Promise((resolve) => setTimeout(resolve, fixture.delay));
          const fail = fixture.fail;
          if (
            (fail === 'create' && method === 'POST') ||
            (fail === 'comparisons' && method === 'PUT') ||
            (fail === 'links' && request.postDataJSON()?.childrenIds)
          ) {
            fixture.fail = null;
            await route.fulfill({ status: 500, json: { error: 'deliberate fixture failure' } });
            return;
          }
        }
        const response = await route.fetch({
          url: `http://127.0.0.1:${(server.address() as AddressInfo).port}${new URL(request.url()).pathname}${new URL(request.url()).search}`,
        });
        if (fixture.fail === 'lost' && method === 'POST') {
          fixture.fail = null;
          await route.abort('failed');
          return;
        }
        await route.fulfill({
          response,
          headers: { ...response.headers(), 'access-control-allow-origin': '*' },
        });
      });
      try {
        await use(fixture);
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        );
        await rm(directory, { recursive: true, force: true });
      }
    },
    { auto: true },
  ],
});
export { expect };
