import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './index.js';
import { JsonFile } from './jsonFile.js';

const input = {
  spelling: [{ language: 'ja', text: 'で' }],
  title: 'Location',
  definition: ['At a place'],
  examples: [],
  metadata: { jlptLevel: 5 },
};
let directory: string;
let file: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'mandarinko-grammar-'));
  file = join(directory, 'grammar.json');
  await writeFile(file, JSON.stringify({ schemaVersion: 1, patterns: [{ ...input, id: 'de' }] }));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});
const app = () => createApp(join(directory, 'vocabulary.json'), file).app;

describe('grammar API and persistence', () => {
  it('lists, reads, creates and patches grammar independently of vocabulary', async () => {
    const api = app();
    expect((await request(api).get('/api/grammar')).body).toEqual([{ ...input, id: 'de' }]);
    expect((await request(api).get('/api/grammar/de')).body.title).toBe('Location');
    const created = await request(api).post('/api/grammar').send(input).expect(201);
    await request(api)
      .patch(`/api/grammar/${created.body.id}`)
      .send({ category: 'Particles' })
      .expect(200);
    const saved = JSON.parse(await readFile(file, 'utf8'));
    expect(saved.schemaVersion).toBe(1);
    expect(saved.patterns).toHaveLength(2);
    expect(saved.patterns[1]).toEqual({ ...input, id: created.body.id, category: 'Particles' });
    expect((await request(app()).get('/api/grammar')).body).toEqual(saved.patterns);
  });

  it.each([
    null,
    [],
    { ...input, id: 'supplied' },
    { ...input, childrenIds: [] },
    { ...input, examples: [null] },
    { ...input, contrastIds: ['missing'] },
  ])('rejects invalid creation without changing storage: %j', async (body) => {
    const before = await readFile(file, 'utf8');
    await request(app())
      .post('/api/grammar')
      .send(body ?? 'null')
      .expect(400);
    expect(await readFile(file, 'utf8')).toBe(before);
  });

  it('rejects immutable IDs, invalid edits and unknown IDs', async () => {
    const api = app();
    await request(api).patch('/api/grammar/de').send({ id: 'other' }).expect(400);
    await request(api)
      .patch('/api/grammar/de')
      .send({ spelling: [null] })
      .expect(400);
    await request(api)
      .patch('/api/grammar/de')
      .send({ contrastIds: ['de'] })
      .expect(400);
    await request(api).patch('/api/grammar/missing').send({ title: 'new' }).expect(404);
    await request(api).get('/api/grammar/missing').expect(404);
    expect((await request(api).get('/api/grammar/de')).body).toEqual({ ...input, id: 'de' });
  });

  it('recovers creation with the same key across a restart and rejects conflicting reuse', async () => {
    const key = '11111111-1111-4111-8111-111111111111';
    const create = (body = input) =>
      request(app()).post('/api/grammar').set('Idempotency-Key', key).send(body);
    await create().expect(201);
    await create().expect(200);
    await create({ ...input, title: 'Different' }).expect(409);
    await request(app()).post('/api/grammar').set('Idempotency-Key', 'bad').send(input).expect(400);
    expect(JSON.parse(await readFile(file, 'utf8')).patterns).toHaveLength(2);
  });

  it('preserves concurrent creations', async () => {
    const api = app();
    const responses = await Promise.all(
      ['A', 'B'].map((title) =>
        request(api)
          .post('/api/grammar')
          .send({ ...input, title })
      )
    );
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(JSON.parse(await readFile(file, 'utf8')).patterns).toHaveLength(3);
  });

  it('reports unavailable or malformed storage without acknowledging writes', async () => {
    await writeFile(file, 'broken');
    await request(app()).get('/api/grammar').expect(500);
    await request(app()).post('/api/grammar').send(input).expect(500);
    await rm(file);
    await request(app()).post('/api/grammar').send(input).expect(500);
  });

  it('does not publish a failed disk write and permits an explicit retry with the same key', async () => {
    const before = await readFile(file, 'utf8');
    const key = '22222222-2222-4222-8222-222222222222';
    const write = vi
      .spyOn(JsonFile.prototype, 'write')
      .mockRejectedValueOnce(new Error('Disk full'));
    try {
      const api = app();
      await request(api).post('/api/grammar').set('Idempotency-Key', key).send(input).expect(500);
      expect(await readFile(file, 'utf8')).toBe(before);
      await request(api).post('/api/grammar').set('Idempotency-Key', key).send(input).expect(201);
      expect(JSON.parse(await readFile(file, 'utf8')).patterns).toHaveLength(2);
    } finally {
      write.mockRestore();
    }
  });
});
