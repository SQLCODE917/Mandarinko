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
const app = () => createApp(join(directory, 'words.json'), join(directory, 'grammar.json')).app;
const writeRelationships = (data: unknown) =>
  writeFile(join(directory, 'grammar.relationships.json'), JSON.stringify(data));
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'grammar-map-'));
  await writeFile(join(directory, 'grammar.json'), JSON.stringify({ schemaVersion: 1, patterns }));
  await writeRelationships({ schemaVersion: 2, relationships: [] });
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});
describe('grammar connection API', () => {
  it('reads the sole relationship table, persists symmetric comparisons, and recovers after restart', async () => {
    expect((await request(app()).get('/api/grammar-map').expect(200)).body).toEqual({
      schemaVersion: 2,
      relationships: [],
    });
    await request(app())
      .put('/api/grammar/b/comparisons')
      .send({ patternIds: ['a'] })
      .expect(200);
    const comparisons = (await request(app()).get('/api/grammar-comparisons').expect(200)).body;
    expect(comparisons).toEqual([{ id: 'compared:a:b', fromId: 'a', toId: 'b', type: 'compared' }]);
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
  it('reports missing patterns without writes', async () => {
    const before = await readFile(join(directory, 'grammar.relationships.json'), 'utf8');
    await request(app())
      .put('/api/grammar/missing/comparisons')
      .send({ patternIds: [] })
      .expect(404);
    expect(await readFile(join(directory, 'grammar.relationships.json'), 'utf8')).toBe(before);
  });
  it.each([
    [{ schemaVersion: 1, relationships: [] }, 'schemaVersion'],
    [
      {
        schemaVersion: 2,
        relationships: [{ id: 'invalid', fromId: 'a', toId: 'missing', type: 'compared' }],
      },
      'relationships[0].toId',
    ],
  ])('rejects malformed connection tables without overwriting them', async (data, field) => {
    await writeRelationships(data);
    const before = await readFile(join(directory, 'grammar.relationships.json'), 'utf8');
    const result = await request(app()).get('/api/grammar-map').expect(500);
    expect(result.body.error).toContain(field);
    await request(app())
      .put('/api/grammar/a/comparisons')
      .send({ patternIds: ['b'] })
      .expect(500);
    expect(await readFile(join(directory, 'grammar.relationships.json'), 'utf8')).toBe(before);
    await request(app()).get('/api/grammar').expect(200);
  });
  it('reports missing or unreadable relationship data while catalog endpoints stay available', async () => {
    await rm(join(directory, 'grammar.relationships.json'));
    await request(app()).get('/api/grammar-map').expect(500);
    await request(app()).get('/api/grammar-comparisons').expect(500);
    await writeFile(join(directory, 'grammar.relationships.json'), '{');
    await request(app()).get('/api/grammar-map').expect(500);
    await request(app()).get('/api/grammar').expect(200);
  });
  it('edits every comparison while preserving other types, other endpoints and retained rationales', async () => {
    const data: GrammarMapData = {
      schemaVersion: 2,
      relationships: [
        {
          id: 'compared:a:b',
          fromId: 'a',
          toId: 'b',
          type: 'compared',
          rationale: 'Compare these forms.',
        },
        {
          id: 'buildsOn:a:b',
          fromId: 'a',
          toId: 'b',
          type: 'buildsOn',
          rationale: 'Extend this construction.',
        },
        { id: 'introducedEarlier:b:a', fromId: 'b', toId: 'a', type: 'introducedEarlier' },
      ],
    };
    await writeRelationships(data);
    const api = app();
    await Promise.all([
      request(api)
        .put('/api/grammar/c/comparisons')
        .send({ patternIds: ['b'] })
        .expect(200),
      request(api)
        .put('/api/grammar/a/comparisons')
        .send({ patternIds: ['b', 'c'] })
        .expect(200),
    ]);
    const retained = (await request(api).get('/api/grammar-map')).body.relationships;
    expect(retained).toEqual(expect.arrayContaining(data.relationships));
    await request(api).put('/api/grammar/a/comparisons').send({ patternIds: [] }).expect(200);
    const rows = (await request(api).get('/api/grammar-map')).body.relationships;
    expect(rows).toHaveLength(3);
    expect(rows).toEqual(
      expect.arrayContaining([
        ...data.relationships.slice(1),
        { id: 'compared:b:c', fromId: 'b', toId: 'c', type: 'compared' },
      ])
    );
  });
  it('does not acknowledge failed storage; explicit retry works', async () => {
    const file = join(directory, 'grammar.relationships.json'),
      before = await readFile(file, 'utf8');
    const spy = vi.spyOn(JsonFile.prototype, 'write').mockRejectedValueOnce(new Error('Disk full'));
    try {
      const api = app();
      await request(api)
        .put('/api/grammar/a/comparisons')
        .send({ patternIds: ['b'] })
        .expect(500);
      expect(await readFile(file, 'utf8')).toBe(before);
      await request(api)
        .put('/api/grammar/a/comparisons')
        .send({ patternIds: ['b'] })
        .expect(200);
    } finally {
      spy.mockRestore();
    }
  });
});
