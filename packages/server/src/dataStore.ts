import fs from 'fs/promises';
import path from 'path';
import { VocabularyManager, VocabularyData } from '@mandarinko/core';

export class DataStore {
  private filePath: string;
  private manager: VocabularyManager;

  constructor(filePath?: string) {
    this.filePath = filePath ?? path.resolve(process.cwd(), 'vocabulary.json');
    this.manager = VocabularyManager.fromJSON({});
  }

  async load(): Promise<void> {
    const raw = await fs.readFile(this.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as VocabularyData;
    this.manager = VocabularyManager.fromJSON(parsed);
  }

  async save(): Promise<void> {
    const json = this.manager.toJSON();
    await fs.writeFile(this.filePath, JSON.stringify(json, null, 2), 'utf-8');
  }

  getManager(): VocabularyManager {
    return this.manager;
  }
}

export default DataStore;
