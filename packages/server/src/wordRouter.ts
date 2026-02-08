import express, { Request, Response, Router } from 'express';
import { DataStore } from './dataStore.js';
import { ValidationService } from '@mandarinko/core';
import type { Word } from '@mandarinko/core';

export function createWordRouter(store: DataStore): Router {
  const router = express.Router();

  const withIds = (words: Word[]) => {
    const dict = store.getManager().toJSON();
    const idMap = new Map<Word, string>();
    for (const [id, word] of Object.entries(dict)) {
      idMap.set(word, id);
    }
    return words.map((word) => ({
      ...word,
      id: idMap.get(word) ?? word.id,
    }));
  };

  // Ensure store loaded lazily
  router.use(async (_req, _res, next) => {
    const mgr = store.getManager();
    if (!mgr || mgr.getAll().length === 0) {
      try {
        await store.load();
      } catch (err) {
        // ignore load errors and continue with empty manager
      }
    }
    next();
  });

  router.get('/', (_req: Request, res: Response) => {
    const dict = store.getManager().toJSON();
    const results = Object.entries(dict).map(([id, w]) => ({ ...w, id }));
    res.json(results);
  });

  router.get('/search/definition', (req: Request, res: Response) => {
    const q = String(req.query.q ?? '');
    res.json(withIds(store.getManager().searchByDefinition(q)));
  });

  router.get('/search/spelling', (req: Request, res: Response) => {
    const q = String(req.query.q ?? '');
    const exact = req.query.exact === '1' || req.query.exact === 'true';
    res.json(
      withIds(
        exact ? store.getManager().searchBySpelling(q) : store.getManager().searchByPartialSpelling(q)
      )
    );
  });

  router.get('/:id', (req: Request, res: Response) => {
    const word = store.getManager().getById(req.params.id);
    if (!word) return res.status(404).json({ error: 'not found' });
    res.json({ ...word, id: req.params.id });
  });

  router.patch('/:id', async (req: Request, res: Response) => {
    const id = req.params.id;
    try {
      store.getManager().updateWord(id, req.body as Partial<Word>);
      await store.save();
      const updated = store.getManager().getById(id);
      res.json(updated);
    } catch (err: unknown) {
      let message = String(err);
      if (err instanceof Error) {
        message = err.message;
      }
      res.status(400).json({ error: message });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const word = req.body as Word;
    const errors = ValidationService.validateWord(word);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Invalid word', details: errors });
    }

    try {
      store.getManager().addWord(word);
      await store.save();
      res.status(201).json(word);
    } catch (err: unknown) {
      let message = String(err);
      if (err instanceof Error) {
        message = err.message;
      }
      res.status(400).json({ error: message });
    }
  });

  return router;
}

export default createWordRouter;
