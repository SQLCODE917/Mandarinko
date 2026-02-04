import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs/promises';
import type { Request, Response, Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataStore } from './dataStore';
import { createWordRouter } from './wordRouter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC_TESTDATA = path.join(__dirname, '..', 'testdata', 'testVocabulary.json');
const TARGET = path.join(__dirname, '..', 'vocabulary.json');

let router: Router;
let store: DataStore;

beforeEach(async () => {
  await fs.copyFile(SRC_TESTDATA, TARGET);
  store = new DataStore(TARGET);
  await store.load();
  router = createWordRouter(store);
});

function getRouteHandler(method: 'get' | 'post' | 'patch', routePath: string) {
  const layer = router.stack.find((stackEntry) => {
    const route = stackEntry.route as undefined | { path?: string; methods?: Record<string, boolean> };
    return route?.path === routePath && route?.methods?.[method];
  });

  if (!layer || !layer.route) {
    throw new Error(`Missing route handler for ${method.toUpperCase()} ${routePath}`);
  }

  return layer.route.stack[0].handle as (req: Request, res: Response) => Promise<void> | void;
}

function createMockResponse() {
  const res: Partial<Response> & { body?: unknown } = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this as Response;
    },
    json(payload: unknown) {
      this.body = payload;
      return this as Response;
    },
  };

  return res as Response & { body?: unknown };
}

describe('server package word API', () => {
  it('returns words list', async () => {
    const handler = getRouteHandler('get', '/');
    const res = createMockResponse();
    await handler({} as Request, res);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('gets a word by id', async () => {
    const listHandler = getRouteHandler('get', '/');
    const listRes = createMockResponse();
    await listHandler({} as Request, listRes);
    const first = (listRes.body as Array<{ id: string }>)[0];

    const handler = getRouteHandler('get', '/:id');
    const res = createMockResponse();
    await handler({ params: { id: first.id } } as unknown as Request, res);
    expect(res.statusCode).toBe(200);
    expect((res.body as { id: string }).id).toBe(first.id);
  });

  it('creates and patches word', async () => {
    const createHandler = getRouteHandler('post', '/');
    const createRes = createMockResponse();
    await createHandler({} as Request, createRes);
    expect(createRes.statusCode).toBe(201);
    expect((createRes.body as { id?: string }).id).toBeTruthy();

    const id = (createRes.body as { id: string }).id;
    const patchHandler = getRouteHandler('patch', '/:id');
    const patchRes = createMockResponse();
    await patchHandler({ params: { id }, body: { pronunciation: 'X' } } as unknown as Request, patchRes);
    expect(patchRes.statusCode).toBe(200);
    expect((patchRes.body as { pronunciation?: string }).pronunciation).toBe('X');
  });
});
