import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

/** Filesystem adapter shared by both catalogs. A failed write leaves the old file intact. */
export class JsonFile<T> {
  constructor(readonly path: string) {}

  async read(): Promise<T> {
    return JSON.parse(await fs.readFile(this.path, 'utf8')) as T;
  }

  async mtime(): Promise<number> {
    return (await fs.stat(this.path)).mtimeMs;
  }

  async write(data: T): Promise<void> {
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(data, null, 2), 'utf8');
      await fs.rename(temporary, this.path);
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }
}
