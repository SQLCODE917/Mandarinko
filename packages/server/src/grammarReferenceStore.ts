import path from 'node:path';
import { parseGrammarMap, type GrammarMapData, type GrammarRelationship } from '@mandarinko/core';
import type { GrammarRepository } from './grammarStore.js';
import { JsonFile } from './jsonFile.js';

export interface GrammarReferenceRepository {
  read(): Promise<GrammarMapData>;
  replaceComparisons(patternId: string, otherIds: string[]): Promise<GrammarRelationship[]>;
}
export class GrammarReferenceStore implements GrammarReferenceRepository {
  private pending: Promise<void> = Promise.resolve();
  constructor(
    private readonly grammar: GrammarRepository,
    private readonly directory = process.cwd()
  ) {}
  async read() {
    const [sources, units, items, relationships, grammar] = await Promise.all([
      new JsonFile<unknown>(path.join(this.directory, 'grammar.sources.json')).read(),
      new JsonFile<unknown>(path.join(this.directory, 'grammar.units.json')).read(),
      new JsonFile<unknown>(path.join(this.directory, 'grammar.source-items.json')).read(),
      new JsonFile<unknown>(path.join(this.directory, 'grammar.relationships.json')).read(),
      this.grammar.read(),
    ]);
    const table = (input: unknown, key: string) => {
      if (
        !input ||
        typeof input !== 'object' ||
        !('schemaVersion' in input) ||
        input.schemaVersion !== 1
      )
        throw new Error(`Invalid grammar reference table: ${key}: expected schemaVersion 1`);
      return (input as Record<string, unknown>)[key];
    };
    return parseGrammarMap(
      {
        schemaVersion: 1,
        sources: table(sources, 'sources'),
        units: table(units, 'units'),
        items: table(items, 'items'),
        relationships: table(relationships, 'relationships'),
      },
      grammar.patterns
    );
  }
  async replaceComparisons(patternId: string, otherIds: string[]): Promise<GrammarRelationship[]> {
    let result: GrammarRelationship[] = [];
    const operation = this.pending.then(async () => {
      const data = await this.read();
      const relationships = data.relationships.filter(
        (r) => !(r.basis === 'editorial' && (r.fromId === patternId || r.toId === patternId))
      );
      for (const id of otherIds) {
        const [fromId, toId] = [patternId, id].sort();
        relationships.push({
          id: `editorial:${fromId}:${toId}`,
          fromId,
          toId,
          type: 'compared',
          unitId: 'editorial-comparisons',
          itemIds: [],
          basis: 'editorial',
          rationale: 'Comparison authored in Mandarinko; independent of curriculum evidence.',
        });
      }
      const next = parseGrammarMap(
        { ...data, relationships },
        (await this.grammar.read()).patterns
      );
      await new JsonFile(path.join(this.directory, 'grammar.relationships.json')).write({
        schemaVersion: 1,
        relationships: next.relationships,
      });
      result = next.relationships.filter((r) => r.type === 'compared');
    });
    this.pending = operation.catch(() => undefined);
    await operation;
    return result;
  }
}
