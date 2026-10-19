import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Request, Response } from 'express';
import { DataStore } from './dataStore';
import { createWordRouter } from './wordRouter';

const key = '35c47a45-c2ec-4f70-8bc3-08d55d943c10';
const payload = {
  spelling: [{ language: 'zh-Hans', text: '新' }],
  pronunciation: 'xin',
  definition: ['new'],
};
let directory: string;
let file: string;
let store: DataStore;
let router: ReturnType<typeof createWordRouter>;
beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mandarinko-creation-'));
  file = path.join(directory, 'vocabulary.json');
  await fs.writeFile(file, '{}');
  store = new DataStore(file);
  await store.load();
  router = createWordRouter(store);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(directory, { recursive: true, force: true });
});

async function post(body: unknown = payload, requestKey: unknown = key) {
  const handler = router.stack.find((entry) => {
    const route = entry.route as undefined | { path?: string; methods?: Record<string, boolean> };
    return route?.path === '/' && route.methods?.post;
  })!.route!.stack[0].handle;
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(value: unknown) {
      this.body = value;
      return this;
    },
  };
  await handler(
    {
      body,
      headers: requestKey === undefined ? {} : { 'idempotency-key': requestKey },
    } as unknown as Request,
    response as unknown as Response,
    () => {}
  );
  return response;
}

describe('durable creation retry keys', () => {
  it('shares one in-flight save for concurrent copies of the same request', async () => {
    const save = store.save.bind(store);
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls = vi.spyOn(store, 'save').mockImplementationOnce(async () => {
      await blocked;
      await save();
    });
    const first = post();
    const duplicate = post();
    expect(calls).toHaveBeenCalledTimes(1);
    release();
    expect((await first).statusCode).toBe(201);
    expect((await duplicate).statusCode).toBe(200);
    expect(store.getManager().getAll()).toHaveLength(1);
  });
  it('returns the same word after a lost response and a server reload', async () => {
    expect((await post()).statusCode).toBe(201);
    store = new DataStore(file);
    await store.load();
    router = createWordRouter(store);
    const retried = await post();
    expect(retried.statusCode).toBe(200);
    expect((retried.body as { id: string }).id).toBe(key);
    expect(store.getManager().getAll()).toHaveLength(1);
    expect(Object.keys(JSON.parse(await fs.readFile(file, 'utf8')))).toEqual([key]);
  });
  it('rejects key reuse with different content without altering the original', async () => {
    await post();
    const res = await post({ ...payload, pronunciation: 'different' });
    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({
      error: 'Idempotency-Key has already been used for different word data',
    });
    expect(store.getManager().getById(key)?.pronunciation).toBe('xin');
  });
  it.each(['', 'root', ['duplicate', 'headers'], '35c47a45-c2ec-1f70-8bc3-08d55d943c10'])(
    'rejects an invalid key: %j',
    async (requestKey) => {
      const res = await post(payload, requestKey);
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Idempotency-Key must be a UUID v4' });
      expect(store.getManager().getAll()).toHaveLength(0);
    }
  );
  it('retains payload, reference, and provided-ID rejection before any persistence', async () => {
    const save = vi.spyOn(store, 'save');
    expect((await post({ ...payload, id: key })).body).toEqual({
      error: 'ID must not be provided when creating a word',
    });
    const unknown = await post({ ...payload, childrenIds: ['missing'] });
    expect(unknown.statusCode).toBe(400);
    expect((unknown.body as { details: unknown[] }).details).toContainEqual({
      field: 'childrenIds',
      message: 'Referenced word with ID "missing" does not exist',
    });
    expect((await post({ ...payload, pronunciation: '' })).statusCode).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });
  it('retries durability after a storage failure without allocating a second ID', async () => {
    vi.spyOn(store, 'save').mockRejectedValueOnce(new Error('Disk unavailable'));
    expect((await post()).statusCode).toBe(400);
    expect((await post()).statusCode).toBe(200);
    const reloaded = new DataStore(file);
    await reloaded.load();
    expect(reloaded.getManager().getAll()).toHaveLength(1);
    expect(reloaded.getManager().getById(key)).toBeDefined();
  });
});
