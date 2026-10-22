import express, { type Request, type Response, type Router } from 'express';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import {
  validateGrammarPattern,
  validateGrammarReferences,
  type GrammarPattern,
  type ValidationError,
} from '@mandarinko/core';
import type { GrammarRepository } from './grammarStore.js';
import { invalidCreationKey } from './creationKey.js';

class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: ValidationError[]
  ) {
    super(message);
  }
}

function bodyOf(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
    throw new RequestError(400, 'Expected a grammar pattern object');
  if (Object.prototype.hasOwnProperty.call(req.body, 'id'))
    throw new RequestError(400, 'ID must not be provided');
  return req.body;
}

function validate(pattern: unknown, patterns: GrammarPattern[]): asserts pattern is GrammarPattern {
  const errors = validateGrammarPattern(pattern);
  if (!errors.length)
    errors.push(...validateGrammarReferences(pattern as GrammarPattern, patterns));
  if (errors.length) throw new RequestError(400, 'Invalid grammar pattern', errors);
}

export function createGrammarRouter(store: GrammarRepository): Router {
  const router = express.Router();
  const handle =
    (action: (req: Request, res: Response) => Promise<void>) =>
    async (req: Request, res: Response) => {
      try {
        await action(req, res);
      } catch (error) {
        res.status(error instanceof RequestError ? error.status : 500).json({
          error: error instanceof Error ? error.message : String(error),
          ...(error instanceof RequestError && error.details ? { details: error.details } : {}),
        });
      }
    };
  router.get(
    '/',
    handle(async (_req, res) => {
      res.json((await store.read()).patterns);
    })
  );
  router.get(
    '/:id',
    handle(async (req, res) => {
      const pattern = (await store.read()).patterns.find((entry) => entry.id === req.params.id);
      if (!pattern) throw new RequestError(404, 'Grammar pattern not found');
      res.json(pattern);
    })
  );
  router.post(
    '/',
    handle(async (req, res) => {
      const body = bodyOf(req);
      const key = req.headers?.['idempotency-key'];
      if (invalidCreationKey(key)) throw new RequestError(400, 'Idempotency-Key must be a UUID v4');
      const pattern = { ...body, id: key ?? randomUUID() };
      let status = 201;
      await store.change((data) => {
        validate(pattern, data.patterns);
        const existing = data.patterns.find((entry) => entry.id === pattern.id);
        if (existing) {
          if (!isDeepStrictEqual(existing, pattern))
            throw new RequestError(
              409,
              'Idempotency-Key has already been used for different grammar data'
            );
          status = 200;
          return data;
        }
        return { ...data, patterns: [...data.patterns, pattern] };
      });
      res.status(status).json(pattern);
    })
  );
  router.patch(
    '/:id',
    handle(async (req, res) => {
      const updates = bodyOf(req);
      let saved: GrammarPattern | undefined;
      await store.change((data) => {
        const existing = data.patterns.find((entry) => entry.id === req.params.id);
        if (!existing) throw new RequestError(404, 'Grammar pattern not found');
        const pattern = { ...existing, ...updates };
        validate(pattern, data.patterns);
        saved = pattern;
        return {
          ...data,
          patterns: data.patterns.map((entry) => (entry.id === pattern.id ? pattern : entry)),
        };
      });
      res.json(saved);
    })
  );
  return router;
}
