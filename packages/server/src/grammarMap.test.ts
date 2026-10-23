import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './index.js';
import { JsonFile } from './jsonFile.js';
import type { GrammarMapData } from '@mandarinko/core';

let directory: string;
const patterns = ['a', 'b', 'c'].map((id) => ({
  id,
  title: id,
  spelling: [{ language: 'ja', text: id }],
  definition: ['Definition'],
  examples: [],
}));
const source = {
  id: 'editorial',
  title: 'Editorial',
  url: 'https://example.com',
  edition: '1',
  retrievedAt: '2026-10-23',
  curriculum: 'editorial',
};
const unit = {
  id: 'editorial-comparisons',
  sourceId: 'editorial',
  title: 'Editorial',
  order: 0,
  locator: 'Mandarinko',
  instructional: false,
};
const app = () => createApp(join(directory, 'words.json'), join(directory, 'grammar.json')).app;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'grammar-map-'));
  await writeFile(join(directory, 'grammar.json'), JSON.stringify({ schemaVersion: 1, patterns }));
  for (const [file, key, rows] of [
    ['sources', 'sources', [source]],
    ['units', 'units', [unit]],
    ['source-items', 'items', []],
    ['relationships', 'relationships', []],
  ] as const)
    await writeFile(
      join(directory, `grammar.${file}.json`),
      JSON.stringify({ schemaVersion: 1, [key]: rows })
    );
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});
describe('grammar reference API', () => {
  it('reads normalized tables, persists symmetric comparisons, and recovers after restart', async () => {
    const first = (await request(app()).get('/api/grammar-map').expect(200)).body as GrammarMapData;
    expect(first.sources).toEqual([source]);
    expect(first.relationships).toEqual([]);
    await request(app())
      .put('/api/grammar/b/comparisons')
      .send({ patternIds: ['a'] })
      .expect(200);
    const comparisons = (await request(app()).get('/api/grammar-comparisons').expect(200)).body;
    expect(comparisons).toMatchObject([{ fromId: 'a', toId: 'b', basis: 'editorial' }]);
    expect(JSON.parse(await readFile(join(directory, 'grammar.json'), 'utf8')).patterns).toEqual(
      patterns
    );
    await request(app()).put('/api/grammar/a/comparisons').send({ patternIds: [] }).expect(200);
    expect((await request(app()).get('/api/grammar-map')).body.relationships).toEqual([]);
  });
  it.each([
    { patternIds: ['a'] },
    { patternIds: ['missing'] },
    { patternIds: ['b', 'b'] },
    { patternIds: [null] },
    { patternIds: 'b' },
    { patternIds: [], extra: 1 },
  ])('rejects invalid comparison edits without writes: %j', async (body) => {
    const file = join(directory, 'grammar.relationships.json'),
      before = await readFile(file, 'utf8');
    await request(app()).put('/api/grammar/a/comparisons').send(body).expect(400);
    expect(await readFile(file, 'utf8')).toBe(before);
  });
  it('reports missing patterns and malformed references directly', async () => {
    await request(app())
      .put('/api/grammar/missing/comparisons')
      .send({ patternIds: [] })
      .expect(404);
    await writeFile(
      join(directory, 'grammar.units.json'),
      JSON.stringify({ schemaVersion: 2, units: [] })
    );
    await request(app()).get('/api/grammar-map').expect(500);
    await request(app())
      .put('/api/grammar/a/comparisons')
      .send({ patternIds: ['b'] })
      .expect(500);
    await rm(join(directory, 'grammar.sources.json'));
    await request(app()).get('/api/grammar-map').expect(500);
    await request(app()).get('/api/grammar').expect(200);
  });
  it('preserves source assertions and other editorial comparisons', async () => {
    const data: GrammarMapData = {
      schemaVersion: 1,
      sources: [source, { ...source, id: 'book', curriculum: 'book' }],
      units: [unit, { ...unit, id: 'lesson', sourceId: 'book', order: 1 }],
      items: patterns.slice(0, 2).map((p, i) => ({
        id: p.id,
        unitId: 'lesson',
        position: i,
        form: p.id,
        meaning: 'meaning',
        locator: 'p.1',
        patternId: p.id,
        status: 'resolved',
      })),
      relationships: [
        {
          id: 'sourced',
          fromId: 'a',
          toId: 'b',
          type: 'compared',
          unitId: 'lesson',
          itemIds: ['a', 'b'],
          basis: 'explicit',
          rationale: 'An explicit source comparison.',
        },
      ],
    };
    for (const [file, key] of [
      ['sources', 'sources'],
      ['units', 'units'],
      ['source-items', 'items'],
      ['relationships', 'relationships'],
    ] as const)
      await writeFile(
        join(directory, `grammar.${file}.json`),
        JSON.stringify({ schemaVersion: 1, [key]: data[key] })
      );
    const api = app();
    await Promise.all([
      request(api)
        .put('/api/grammar/c/comparisons')
        .send({ patternIds: ['b'] })
        .expect(200),
      request(api)
        .put('/api/grammar/a/comparisons')
        .send({ patternIds: ['c'] })
        .expect(200),
    ]);
    await request(api).put('/api/grammar/a/comparisons').send({ patternIds: [] }).expect(200);
    const rows = (await request(api).get('/api/grammar-map')).body.relationships;
    expect(rows).toEqual(
      expect.arrayContaining([
        data.relationships[0],
        expect.objectContaining({ fromId: 'b', toId: 'c', basis: 'editorial' }),
      ])
    );
  });
  it('does not acknowledge failed storage; explicit retry works', async () => {
    const file = join(directory, 'grammar.relationships.json'),
      before = await readFile(file, 'utf8');
    const spy = vi.spyOn(JsonFile.prototype, 'write').mockRejectedValueOnce(new Error('Disk full'));
    try {
      await request(app())
        .put('/api/grammar/a/comparisons')
        .send({ patternIds: ['b'] })
        .expect(500);
      expect(await readFile(file, 'utf8')).toBe(before);
      await request(app())
        .put('/api/grammar/a/comparisons')
        .send({ patternIds: ['b'] })
        .expect(200);
    } finally {
      spy.mockRestore();
    }
  });
});
