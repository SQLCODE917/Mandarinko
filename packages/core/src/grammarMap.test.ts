import { describe, expect, it } from 'vitest';
import {
  grammarCoverage,
  grammarOverview,
  matchGrammarItem,
  normalizeGrammarForm,
  parseGrammarMap,
  projectGrammarGraph,
  type GrammarMapData,
} from './grammarMap.js';
const pattern = {
  id: 'de',
  title: 'Location',
  spelling: [{ language: 'ja', text: 'で' }],
  definition: ['location'],
  examples: [],
};
export const mapPatterns = ['a', 'b', 'c', 'isolated'].map((id) => ({ ...pattern, id }));
export const reference: GrammarMapData = {
  schemaVersion: 1,
  sources: [
    {
      id: 'book',
      title: 'Book',
      url: 'https://example.com',
      edition: '1',
      retrievedAt: '2026-10-23',
      curriculum: 'book',
    },
  ],
  units: [
    {
      id: 'lesson1',
      sourceId: 'book',
      title: 'Lesson 1',
      order: 1,
      locator: 'p.1',
      instructional: true,
    },
    {
      id: 'lesson2',
      sourceId: 'book',
      title: 'Lesson 2',
      order: 2,
      locator: 'p.2',
      instructional: true,
    },
  ],
  items: [
    {
      id: 'ia',
      unitId: 'lesson1',
      position: 1,
      form: 'で',
      meaning: 'location',
      locator: 'p.1',
      patternId: 'a',
      status: 'resolved',
    },
    {
      id: 'ib',
      unitId: 'lesson1',
      position: 2,
      form: 'に',
      meaning: 'destination',
      locator: 'p.1',
      patternId: 'b',
      status: 'resolved',
    },
    {
      id: 'ic',
      unitId: 'lesson2',
      position: 1,
      form: 'から',
      meaning: 'from',
      locator: 'p.2',
      patternId: 'c',
      status: 'resolved',
    },
  ],
  relationships: [
    {
      id: 'together',
      fromId: 'a',
      toId: 'b',
      type: 'taughtTogether',
      unitId: 'lesson1',
      itemIds: ['ia', 'ib'],
      basis: 'coOccurrence',
      rationale: 'Same lesson.',
    },
    {
      id: 'earlier',
      fromId: 'b',
      toId: 'c',
      type: 'introducedEarlier',
      unitId: 'lesson2',
      itemIds: ['ib', 'ic'],
      basis: 'sequence',
      rationale: 'Earlier introduction.',
    },
  ],
};
const clone = () => structuredClone(reference);
describe('grammar reference boundaries', () => {
  it('accepts normalized evidence and accounts for all items', () => {
    expect(parseGrammarMap(reference, mapPatterns)).toBe(reference);
    expect(grammarCoverage(mapPatterns, reference)).toMatchObject({
      matchedPatterns: 3,
      unmatchedPatternIds: ['isolated'],
      resolved: 3,
    });
  });
  it.each([
    [
      'version',
      (d: GrammarMapData) => {
        d.schemaVersion = 2 as 1;
      },
      'schemaVersion',
    ],
    [
      'unit foreign key',
      (d: GrammarMapData) => {
        d.units[0].sourceId = 'missing';
      },
      'units[0].sourceId',
    ],
    [
      'missing pattern',
      (d: GrammarMapData) => {
        d.items[0].patternId = 'missing';
      },
      'items[0].patternId',
    ],
    [
      'unresolved reference',
      (d: GrammarMapData) => {
        d.items[0].status = 'review';
      },
      'items[0].patternId',
    ],
    [
      'duplicate item position',
      (d: GrammarMapData) => {
        d.items[1].position = 1;
      },
      'items[1].position',
    ],
    [
      'self relationship',
      (d: GrammarMapData) => {
        d.relationships[0].toId = 'a';
      },
      'endpoints',
    ],
    [
      'unknown type',
      (d: GrammarMapData) => {
        d.relationships[0].type = 'nearby' as 'compared';
      },
      'type',
    ],
    [
      'missing evidence',
      (d: GrammarMapData) => {
        d.relationships[0].itemIds = [];
      },
      'evidence',
    ],
    [
      'reversed symmetry',
      (d: GrammarMapData) => {
        d.relationships[0].fromId = 'b';
        d.relationships[0].toId = 'a';
      },
      'sorted',
    ],
    [
      'duplicate assertion',
      (d: GrammarMapData) => {
        d.relationships.push({ ...d.relationships[0], id: 'duplicate' });
      },
      'duplicate source assertion',
    ],
    [
      'reverse sequence',
      (d: GrammarMapData) => {
        d.relationships[1].fromId = 'c';
        d.relationships[1].toId = 'b';
      },
      'precede',
    ],
    [
      'unsupported dependency',
      (d: GrammarMapData) => {
        d.relationships[0].type = 'buildsOn';
      },
      'explicit',
    ],
  ])('rejects %s without partial data', (_name, change, message) => {
    const d = clone();
    change(d);
    expect(() => parseGrammarMap(d, mapPatterns)).toThrow(message);
  });
});
describe('concept graph projection', () => {
  it('excludes source order from weights, retains isolates, and leaves input immutable', () => {
    const before = JSON.stringify(reference);
    const graph = projectGrammarGraph(mapPatterns, reference);
    expect(graph.nodes).toContainEqual({ id: 'c', weight: 0 });
    expect(graph.nodes).toContainEqual({ id: 'isolated', weight: 0 });
    expect(graph.edges.find((e) => e.fromId === 'b' && e.toId === 'c')?.weight).toBe(0);
    expect(JSON.stringify(reference)).toBe(before);
  });
  it('does not count repeated mentions or school adoption as independent support', () => {
    const d = clone();
    d.sources.push({ ...d.sources[0], id: 'school' });
    d.units.push({ ...d.units[0], id: 'school1', sourceId: 'school' });
    d.relationships.push({ ...d.relationships[0], id: 'adoption', unitId: 'school1' });
    expect(projectGrammarGraph(mapPatterns, d).edges[0].weight).toBe(1);
  });
  it('returns only real edges and spans each connected component', () => {
    const edges = projectGrammarGraph(mapPatterns, reference).edges;
    const overview = grammarOverview(edges);
    expect(overview).toHaveLength(2);
    expect(overview.every((e) => edges.includes(e))).toBe(true);
  });
});
describe('conservative forms and senses', () => {
  it('normalizes typography without removing negation or conjugation', () => {
    expect(normalizeGrammarForm('～ てください')).toBe(normalizeGrammarForm('〜てください'));
    expect(normalizeGrammarForm('Vない + ことがある')).not.toBe(
      normalizeGrammarForm('Vた + ことがある')
    );
  });
  it('requires sense evidence and never picks a homograph arbitrarily', () => {
    expect(matchGrammarItem({ form: 'で', meaning: 'location' }, [pattern]).patternId).toBe('de');
    expect(
      matchGrammarItem({ form: 'で', meaning: 'unrelated' }, [pattern]).patternId
    ).toBeUndefined();
    expect(
      matchGrammarItem({ form: 'で', meaning: 'location' }, [pattern, { ...pattern, id: 'other' }])
        .patternId
    ).toBeUndefined();
  });
});

it('compares Japanese sense annotations without merging their identities', () => {
  const patterns = [
    { ...pattern, id: 'listing', spelling: [{ language: 'ja', text: '〜とか（列挙）' }] },
    { ...pattern, id: 'hearsay', spelling: [{ language: 'ja', text: '〜とか（伝聞）' }] },
  ];
  expect(matchGrammarItem({ form: '〜とか', meaning: '' }, patterns).patternId).toBeUndefined();
});
