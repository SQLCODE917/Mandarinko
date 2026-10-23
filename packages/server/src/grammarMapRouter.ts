import express, { type Router } from 'express';
import type { GrammarReferenceRepository } from './grammarReferenceStore.js';
import type { GrammarRepository } from './grammarStore.js';

export function createGrammarMapRouter(
  references: GrammarReferenceRepository,
  grammar: GrammarRepository
): Router {
  const router = express.Router();
  router.get('/grammar-map', async (_req, res) => {
    try {
      res.json(await references.read());
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  router.get('/grammar-comparisons', async (_req, res) => {
    try {
      res.json((await references.read()).relationships.filter((r) => r.type === 'compared'));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  router.put('/grammar/:id/comparisons', async (req, res) => {
    try {
      const patterns = (await grammar.read()).patterns;
      if (!patterns.some((p) => p.id === req.params.id)) {
        res.status(404).json({ error: 'Grammar pattern not found' });
        return;
      }
      const ids: unknown = req.body?.patternIds;
      if (
        !req.body ||
        Object.keys(req.body).length !== 1 ||
        !Array.isArray(ids) ||
        new Set(ids).size !== ids.length ||
        ids.some(
          (id) =>
            typeof id !== 'string' || id === req.params.id || !patterns.some((p) => p.id === id)
        )
      ) {
        res
          .status(400)
          .json({ error: 'patternIds must contain unique IDs of other existing grammar patterns' });
        return;
      }
      res.json(await references.replaceComparisons(req.params.id, ids));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  return router;
}
