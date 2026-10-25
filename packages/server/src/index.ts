import path from 'node:path';
import { GrammarConnectionStore } from './grammarConnectionStore.js';
import { createGrammarMapRouter } from './grammarMapRouter.js';
import express, { Express } from 'express';
import cors from 'cors';
import createWordRouter from './wordRouter.js';
import DataStore from './dataStore.js';
import { GrammarStore } from './grammarStore.js';
import { createGrammarRouter } from './grammarRouter.js';

export function createApp(
  vocabPath?: string,
  grammarPath?: string,
  connectionDirectory?: string
): Readonly<{ app: Express; store: DataStore }> {
  const app = express();
  app.use(cors());
  app.use(express.json());
  const store = new DataStore(vocabPath);
  app.use('/api/words', createWordRouter(store));
  const grammar = new GrammarStore(grammarPath);
  const connections = new GrammarConnectionStore(
    grammar,
    connectionDirectory ?? path.dirname(grammarPath ?? path.resolve(process.cwd(), 'grammar.json'))
  );
  app.use('/api', createGrammarMapRouter(connections, grammar));
  app.use('/api/grammar', createGrammarRouter(grammar));
  return { app, store } as const;
}

export default createApp;
