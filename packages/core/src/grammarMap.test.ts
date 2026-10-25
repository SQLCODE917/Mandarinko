import { describe, expect, it } from 'vitest';
import {
  grammarOverview,
  grammarRelationshipId,
  parseGrammarMap,
  projectGrammarGraph,
  type GrammarMapData,
} from './grammarMap.js';
const patterns = ['a', 'b', 'c', 'isolated'].map((id) => ({
  id,
  title: id,
  spelling: [{ language: 'ja', text: 'で' }],
  definition: ['location'],
  examples: [],
}));
const data: GrammarMapData = {
  schemaVersion: 2,
  relationships: [
    { id: 'together', fromId: 'a', toId: 'b', type: 'taughtTogether' },
    {
      id: 'earlier',
      fromId: 'c',
      toId: 'b',
      type: 'introducedEarlier',
      rationale: 'Introduce c first.',
    },
  ],
};
describe('grammar relationship validation', () => {
  it('accepts relationships without provenance and preserves directed endpoints', () => {
    expect(parseGrammarMap(data, patterns)).toBe(data);
    expect(data.relationships[1]).toMatchObject({ fromId: 'c', toId: 'b' });
  });
  it('generates deterministic IDs with canonical symmetric endpoints', () => {
    expect(grammarRelationshipId('compared', 'b', 'a')).toBe(
      grammarRelationshipId('compared', 'a', 'b')
    );
    expect(grammarRelationshipId('buildsOn', 'b', 'a')).not.toBe(
      grammarRelationshipId('buildsOn', 'a', 'b')
    );
    expect(grammarRelationshipId('compared', 'a:b', 'c')).not.toBe(
      grammarRelationshipId('compared', 'a', 'b:c')
    );
  });
  it.each([
    [
      'old version',
      (d: any) => {
        d.schemaVersion = 1;
      },
      'schemaVersion',
    ],
    [
      'unknown table',
      (d: any) => {
        d.sources = [];
      },
      'sources',
    ],
    [
      'missing array',
      (d: any) => {
        delete d.relationships;
      },
      'relationships',
    ],
    [
      'malformed row',
      (d: any) => {
        d.relationships[0] = null;
      },
      'relationships[0]',
    ],
    [
      'blank ID',
      (d: any) => {
        d.relationships[0].id = ' ';
      },
      'relationships[0].id',
    ],
    [
      'duplicate ID',
      (d: any) => {
        d.relationships[1].id = 'together';
      },
      'relationships[1].id',
    ],
    [
      'missing endpoint',
      (d: any) => {
        d.relationships[0].toId = 'missing';
      },
      'relationships[0].toId',
    ],
    [
      'self edge',
      (d: any) => {
        d.relationships[0].toId = 'a';
      },
      'relationships[0].toId',
    ],
    [
      'unsupported type',
      (d: any) => {
        d.relationships[0].type = 'nearby';
      },
      'relationships[0].type',
    ],
    [
      'reversed symmetry',
      (d: any) => {
        Object.assign(d.relationships[0], { fromId: 'b', toId: 'a' });
      },
      'relationships[0].fromId',
    ],
    [
      'duplicate connection',
      (d: any) => {
        d.relationships.push({ ...d.relationships[0], id: 'duplicate' });
      },
      'relationships[2]',
    ],
    [
      'empty rationale',
      (d: any) => {
        d.relationships[0].rationale = ' ';
      },
      'relationships[0].rationale',
    ],
    [
      'malformed rationale',
      (d: any) => {
        d.relationships[0].rationale = 2;
      },
      'relationships[0].rationale',
    ],
    [
      'legacy provenance',
      (d: any) => {
        d.relationships[0].unitId = 'lesson';
      },
      'relationships[0].unitId',
    ],
  ])('rejects %s with a field-specific error', (_name, change, field) => {
    const input = structuredClone(data);
    change(input);
    expect(() => parseGrammarMap(input, patterns)).toThrow(`Invalid grammar map: ${field}:`);
  });
});
describe('concept graph projection', () => {
  it('uses equal conceptual contributions, excludes order, and keeps inputs immutable', () => {
    const input: GrammarMapData = {
      ...data,
      relationships: [
        ...data.relationships,
        { id: 'compare', fromId: 'a', toId: 'b', type: 'compared' },
        { id: 'build', fromId: 'b', toId: 'a', type: 'buildsOn' },
      ],
    };
    const before = JSON.stringify(input);
    const graph = projectGrammarGraph(patterns, input);
    expect(graph.edges.find((e) => e.fromId === 'a' && e.toId === 'b')?.weight).toBe(3);
    expect(graph.edges.find((e) => e.fromId === 'b' && e.toId === 'c')?.weight).toBe(0);
    expect(graph.nodes).toEqual([
      { id: 'a', weight: 3 },
      { id: 'b', weight: 3 },
      { id: 'c', weight: 0 },
      { id: 'isolated', weight: 0 },
    ]);
    expect(JSON.stringify(input)).toBe(before);
    expect(projectGrammarGraph(patterns, input)).toEqual(graph);
  });
  it('returns only real overview edges and spans each connected component', () => {
    const edges = projectGrammarGraph(patterns, data).edges;
    const overview = grammarOverview(edges);
    expect(overview).toHaveLength(2);
    expect(overview.every((e) => edges.includes(e))).toBe(true);
  });
});
