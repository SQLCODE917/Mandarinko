import path from 'node:path';
import { parseGrammarData, type GrammarData } from '@mandarinko/core';
import { JsonFile } from './jsonFile.js';

export interface GrammarRepository {
  read(): Promise<GrammarData>;
  change(transform: (data: GrammarData) => GrammarData): Promise<void>;
}

export class GrammarStore implements GrammarRepository {
  private readonly file: JsonFile<unknown>;
  private pending: Promise<void> = Promise.resolve();

  constructor(filePath = path.resolve(process.cwd(), 'grammar.json')) {
    this.file = new JsonFile(filePath);
  }

  async read(): Promise<GrammarData> {
    return parseGrammarData(await this.file.read());
  }

  change(transform: (data: GrammarData) => GrammarData): Promise<void> {
    const operation = this.pending.then(async () => {
      const data = transform(await this.read());
      await this.file.write(parseGrammarData(data));
    });
    // Release the queue on failure; no write is retried or acknowledged here.
    this.pending = operation.catch(() => undefined);
    return operation;
  }
}
