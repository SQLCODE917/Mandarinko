import path from 'node:path';
import {
  grammarRelationshipId,
  parseGrammarMap,
  type GrammarMapData,
  type GrammarRelationship,
} from '@mandarinko/core';
import type { GrammarRepository } from './grammarStore.js';
import { JsonFile } from './jsonFile.js';

export interface GrammarConnectionRepository {
  read(): Promise<GrammarMapData>;
  replaceComparisons(patternId: string, otherIds: string[]): Promise<GrammarRelationship[]>;
}
export class GrammarConnectionStore implements GrammarConnectionRepository {
  private pending: Promise<void> = Promise.resolve();
  constructor(
    private readonly grammar: GrammarRepository,
    private readonly directory = process.cwd()
  ) {}
  async read() {
    const [data, grammar] = await Promise.all([
      new JsonFile<unknown>(path.join(this.directory, 'grammar.relationships.json')).read(),
      this.grammar.read(),
    ]);
    return parseGrammarMap(data, grammar.patterns);
  }
  async replaceComparisons(patternId: string, otherIds: string[]): Promise<GrammarRelationship[]> {
    let result: GrammarRelationship[] = [];
    const operation = this.pending.then(async () => {
      const data = await this.read();
      const previous = data.relationships.filter(
        (r) => r.type === 'compared' && (r.fromId === patternId || r.toId === patternId)
      );
      const relationships = data.relationships.filter(
        (r) => !(r.type === 'compared' && (r.fromId === patternId || r.toId === patternId))
      );
      for (const id of otherIds) {
        const [fromId, toId] = [patternId, id].sort();
        relationships.push(
          previous.find((r) => r.fromId === fromId && r.toId === toId) ?? {
            id: grammarRelationshipId('compared', fromId, toId),
            fromId,
            toId,
            type: 'compared',
          }
        );
      }
      const next = parseGrammarMap(
        { schemaVersion: 2, relationships },
        (await this.grammar.read()).patterns
      );
      await new JsonFile(path.join(this.directory, 'grammar.relationships.json')).write(next);
      result = next.relationships.filter((r) => r.type === 'compared');
    });
    this.pending = operation.catch(() => undefined);
    await operation;
    return result;
  }
}
