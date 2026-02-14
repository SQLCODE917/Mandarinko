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
      const extraErrors = ValidationService.validateNoExtraFields(word);
      if (extraErrors.length > 0) {
        throw new Error(`Invalid word data for "${id}": ${extraErrors[0].message}`);
      }
      idMap.set(word, id);
    }
    return words.map((word) => ({
      ...word,
      id: idMap.get(word) ?? word.id,
    }));
  };

  const getWordMap = () => new Map(Object.entries(store.getManager().toJSON()));

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
    try {
      const dict = store.getManager().toJSON();
      const results = Object.entries(dict).map(([id, w]) => {
        const extraErrors = ValidationService.validateNoExtraFields(w);
        if (extraErrors.length > 0) {
          throw new Error(`Invalid word data for "${id}": ${extraErrors[0].message}`);
        }
        return { ...w, id };
      });
      res.json(results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });

  router.get('/search/definition', (req: Request, res: Response) => {
    try {
      const q = String(req.query.q ?? '');
      res.json(withIds(store.getManager().searchByDefinition(q)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });

  router.get('/search/spelling', (req: Request, res: Response) => {
    try {
      const q = String(req.query.q ?? '');
      const exact = req.query.exact === '1' || req.query.exact === 'true';
      res.json(
        withIds(
          exact
            ? store.getManager().searchBySpelling(q)
            : store.getManager().searchByPartialSpelling(q)
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    const word = store.getManager().getById(req.params.id);
    if (!word) return res.status(404).json({ error: 'not found' });
    const extraErrors = ValidationService.validateNoExtraFields(word);
    if (extraErrors.length > 0) {
      return res.status(500).json({ error: `Invalid word data for "${req.params.id}"` });
    }
    res.json({ ...word, id: req.params.id });
  });

  router.patch('/:id', async (req: Request, res: Response) => {
    const id = req.params.id;
    try {
      const existing = store.getManager().getById(id);
      if (!existing) {
        return res.status(404).json({ error: 'not found' });
      }
      const nextWord = { ...existing, ...(req.body as Partial<Word>), id };
      const errors = ValidationService.validateWord(nextWord);
      const extraErrors = ValidationService.validateNoExtraFields(nextWord);
      const refErrors = ValidationService.validateReferences(
        nextWord,
        new Map([...getWordMap(), [id, nextWord]])
      );
      if (errors.length > 0 || refErrors.length > 0 || extraErrors.length > 0) {
        return res
          .status(400)
          .json({ error: 'Invalid word', details: [...errors, ...extraErrors, ...refErrors] });
      }
      store.getManager().updateWord(id, req.body as Partial<Word>);
      await store.save();
      const saved = store.getManager().getById(id);
      res.json(saved);
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
    const extraErrors = ValidationService.validateNoExtraFields(word);
    const refErrors = ValidationService.validateReferences(word, getWordMap());
    if (errors.length > 0 || refErrors.length > 0 || extraErrors.length > 0) {
      return res
        .status(400)
        .json({ error: 'Invalid word', details: [...errors, ...extraErrors, ...refErrors] });
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
