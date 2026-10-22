import express, { Express } from 'express';
import cors from 'cors';
import createWordRouter from './wordRouter.js';
import DataStore from './dataStore.js';
import { GrammarStore } from './grammarStore.js';
import { createGrammarRouter } from './grammarRouter.js';

export function createApp(
  vocabPath?: string,
  grammarPath?: string
): Readonly<{ app: Express; store: DataStore }> {
  const app = express();
  app.use(cors());
  app.use(express.json());
  const store = new DataStore(vocabPath);
  app.use('/api/words', createWordRouter(store));
  app.use('/api/grammar', createGrammarRouter(new GrammarStore(grammarPath)));
  return { app, store } as const;
}

export default createApp;
