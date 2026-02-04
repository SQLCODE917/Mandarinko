import express, { Express } from 'express';
import cors from 'cors';
import createWordRouter from './wordRouter.js';
import DataStore from './dataStore.js';

export function createApp(vocabPath?: string): Readonly<{ app: Express; store: DataStore }> {
  const app = express();
  app.use(cors());
  app.use(express.json());
  const store = new DataStore(vocabPath);
  app.use('/api/words', createWordRouter(store));
  return { app, store } as const;
}

export default createApp;
