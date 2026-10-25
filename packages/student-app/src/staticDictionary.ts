import type { Word } from '@mandarinko/core';
import type { DictionaryRepository } from './dictionary';
/** Cache a successful snapshot for this page lifetime; failures require explicit retry. */
export class StaticDictionaryRepository implements DictionaryRepository {
  private pending?: Promise<Word[]>;
  constructor(
    private readonly url: string,
    private readonly request: typeof fetch = fetch
  ) {}
  load() {
    const request = this.request;
    if (!this.pending)
      this.pending = request(this.url)
        .then(async (response) => {
          if (!response.ok) throw Error('Dictionary could not be loaded.');
          const words: unknown = await response.json();
          if (
            !Array.isArray(words) ||
            words.some(
              (w) =>
                !w ||
                typeof w.id !== 'string' ||
                !Array.isArray(w.spelling) ||
                !Array.isArray(w.definition)
            )
          )
            throw Error('Invalid dictionary snapshot.');
          return words as Word[];
        })
        .catch((error) => {
          this.pending = undefined;
          throw error;
        });
    return this.pending;
  }
}
