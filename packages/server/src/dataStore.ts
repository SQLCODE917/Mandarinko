import path from 'path';
import { VocabularyManager, VocabularyData } from '@mandarinko/core';
import { JsonFile } from './jsonFile.js';

export class DataStore {
  private file: JsonFile<VocabularyData>;
  private manager: VocabularyManager;
  private lastLoadedMtimeMs?: number;

  constructor(filePath?: string) {
    this.file = new JsonFile(filePath ?? path.resolve(process.cwd(), 'vocabulary.json'));
    this.manager = VocabularyManager.fromJSON({});
  }

  async load(): Promise<void> {
    const mtime = await this.file.mtime();
    const parsed = await this.file.read();
    this.manager = VocabularyManager.fromJSON(parsed);
    this.lastLoadedMtimeMs = mtime;
  }

  async loadIfUpdated(): Promise<void> {
    try {
      const mtime = await this.file.mtime();
      if (!this.lastLoadedMtimeMs || mtime > this.lastLoadedMtimeMs) {
        await this.load();
      }
    } catch (err) {
      // ignore stat/load errors and keep current manager
    }
  }

  async save(): Promise<void> {
    const json = this.manager.toJSON();
    await this.file.write(json);
  }

  getManager(): VocabularyManager {
    return this.manager;
  }
}

export default DataStore;
