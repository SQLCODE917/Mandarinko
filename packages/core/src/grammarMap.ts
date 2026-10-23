import type { GrammarPattern } from './types.js';
import { isRecord } from './entryValidation.js';

export const relationshipTypes = [
  'taughtTogether',
  'introducedEarlier',
  'compared',
  'buildsOn',
] as const;
export type GrammarRelationshipType = (typeof relationshipTypes)[number];
export interface GrammarSource {
  id: string;
  title: string;
  url: string;
  edition: string;
  retrievedAt: string;
  curriculum: string;
  sha256?: string;
}
export interface GrammarUnit {
  id: string;
  sourceId: string;
  title: string;
  order: number;
  locator: string;
  instructional: boolean;
}
export interface GrammarSourceItem {
  id: string;
  unitId: string;
  position: number;
  form: string;
  meaning: string;
  locator: string;
  patternId?: string;
  status: 'resolved' | 'review' | 'backfill' | 'outOfScope';
}
export interface GrammarRelationship {
  id: string;
  fromId: string;
  toId: string;
  type: GrammarRelationshipType;
  unitId: string;
  itemIds: string[];
  basis: 'coOccurrence' | 'sequence' | 'explicit' | 'editorial';
  rationale: string;
}
export interface GrammarMapData {
  schemaVersion: 1;
  sources: GrammarSource[];
  units: GrammarUnit[];
  items: GrammarSourceItem[];
  relationships: GrammarRelationship[];
}
export interface GrammarMapEdge {
  id: string;
  fromId: string;
  toId: string;
  weight: number;
  assertions: GrammarRelationship[];
}
export interface GrammarMapNode {
  id: string;
  weight: number;
}
export interface GrammarGraph {
  nodes: GrammarMapNode[];
  edges: GrammarMapEdge[];
}
export const symmetricRelationship = (type: GrammarRelationshipType) =>
  type === 'taughtTogether' || type === 'compared';

export {
  normalizeGrammarForm,
  constructionKey,
  matchGrammarItem,
  suggestGrammarPatterns,
} from './grammarMatching.js';

/** Runtime validation at the filesystem/HTTP boundary; no partially valid map. */
export function parseGrammarMap(input: unknown, patterns: GrammarPattern[]): GrammarMapData {
  const fail = (field: string, message: string): never => {
    throw new Error(`Invalid grammar map: ${field}: ${message}`);
  };
  if (!isRecord(input) || input.schemaVersion !== 1) fail('schemaVersion', 'expected 1');
  for (const key of Object.keys(input as Record<string, unknown>)) {
    if (!['schemaVersion', 'sources', 'units', 'items', 'relationships'].includes(key))
      fail(key, 'unknown field');
  }
  const data = input as unknown as GrammarMapData;
  const fields = {
    sources: ['id', 'title', 'url', 'edition', 'retrievedAt', 'curriculum'],
    units: ['id', 'sourceId', 'title', 'locator'],
    items: ['id', 'unitId', 'form', 'locator'],
    relationships: ['id', 'fromId', 'toId', 'type', 'unitId', 'basis', 'rationale'],
  } as const;
  for (const [table, required] of Object.entries(fields)) {
    const rows = (data as unknown as Record<string, unknown>)[table];
    if (!Array.isArray(rows)) fail(table, 'expected an array');
    const ids = new Set<string>();
    (rows as unknown[]).forEach((row, i) => {
      if (!isRecord(row)) fail(`${table}[${i}]`, 'expected object');
      for (const field of required) {
        const value = (row as Record<string, unknown>)[field];
        if (typeof value !== 'string' || !value.trim())
          fail(`${table}[${i}].${field}`, 'required string');
      }
      const optional: Record<string, string[]> = {
        sources: ['sha256'],
        units: ['order', 'instructional'],
        items: ['position', 'meaning', 'patternId', 'status'],
        relationships: ['itemIds'],
      };
      for (const field of Object.keys(row as Record<string, unknown>)) {
        if (!([...required, ...optional[table]] as string[]).includes(field))
          fail(`${table}[${i}].${field}`, 'unknown field');
      }
      const id = (row as Record<string, unknown>).id as string;
      if (ids.has(id)) fail(`${table}[${i}].id`, 'duplicate ID');
      ids.add(id);
    });
  }
  const sourceById = new Map(data.sources.map((s) => [s.id, s]));
  const unitById = new Map(data.units.map((u) => [u.id, u]));
  const itemById = new Map(data.items.map((i) => [i.id, i]));
  const patternIds = new Set(patterns.map((p) => p.id));
  for (const [i, source] of data.sources.entries()) {
    if (!/^https?:\/\//.test(source.url) && source.id !== 'editorial')
      fail(`sources[${i}].url`, 'expected HTTP URL');
    if (source.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(source.sha256))
      fail(`sources[${i}].sha256`, 'expected SHA-256');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.retrievedAt))
      fail(`sources[${i}].retrievedAt`, 'expected ISO date');
  }
  const positions = new Set<string>();
  for (const [i, unit] of data.units.entries()) {
    if (!sourceById.has(unit.sourceId)) fail(`units[${i}].sourceId`, 'missing source');
    if (!Number.isInteger(unit.order) || unit.order < 0)
      fail(`units[${i}].order`, 'expected nonnegative integer');
    if (typeof unit.instructional !== 'boolean')
      fail(`units[${i}].instructional`, 'expected boolean');
    const position = `${unit.sourceId}:${unit.order}`;
    if (positions.has(position)) fail(`units[${i}].order`, 'duplicate source unit order');
    positions.add(position);
  }
  const itemPositions = new Set<string>();
  for (const [i, item] of data.items.entries()) {
    if (!unitById.has(item.unitId)) fail(`items[${i}].unitId`, 'missing unit');
    if (typeof item.meaning !== 'string') fail(`items[${i}].meaning`, 'expected string');
    if (!Number.isInteger(item.position) || item.position < 0)
      fail(`items[${i}].position`, 'expected nonnegative integer');
    const position = `${item.unitId}:${item.position}`;
    if (itemPositions.has(position)) fail(`items[${i}].position`, 'duplicate unit item position');
    itemPositions.add(position);
    if (!['resolved', 'review', 'backfill', 'outOfScope'].includes(item.status))
      fail(`items[${i}].status`, 'unknown status');
    if (
      item.status === 'resolved'
        ? !item.patternId || !patternIds.has(item.patternId)
        : item.patternId !== undefined
    )
      fail(`items[${i}].patternId`, 'only resolved items must reference an existing pattern');
  }
  const assertions = new Set<string>();
  for (const [i, r] of data.relationships.entries()) {
    const field = `relationships[${i}]`;
    if (!relationshipTypes.includes(r.type)) fail(`${field}.type`, 'unknown relationship');
    if (!patternIds.has(r.fromId) || !patternIds.has(r.toId) || r.fromId === r.toId)
      fail(field, 'endpoints must be different existing patterns');
    if (!unitById.has(r.unitId)) fail(`${field}.unitId`, 'missing evidence unit');
    if (!['coOccurrence', 'sequence', 'explicit', 'editorial'].includes(r.basis))
      fail(`${field}.basis`, 'unknown evidence basis');
    if (
      !Array.isArray(r.itemIds) ||
      new Set(r.itemIds).size !== r.itemIds.length ||
      r.itemIds.some((id) => !itemById.has(id))
    )
      fail(`${field}.itemIds`, 'expected unique existing item IDs');
    if (symmetricRelationship(r.type) && r.fromId > r.toId)
      fail(field, 'symmetric endpoints must be sorted');
    if (r.basis === 'editorial') {
      if (
        r.type !== 'compared' ||
        unitById.get(r.unitId)?.sourceId !== 'editorial' ||
        r.itemIds.length
      )
        fail(field, 'editorial assertions must be comparisons in the editorial unit');
    } else {
      const items = r.itemIds.map((id) => itemById.get(id)!);
      if (
        items.length < 2 ||
        !items.some((item) => item.patternId === r.fromId) ||
        !items.some((item) => item.patternId === r.toId)
      )
        fail(`${field}.itemIds`, 'evidence must include both resolved endpoints');
      const unit = unitById.get(r.unitId)!;
      if (items.some((item) => unitById.get(item.unitId)?.sourceId !== unit.sourceId))
        fail(field, 'evidence must belong to the assertion source');
      if (
        r.type === 'taughtTogether' &&
        (r.basis !== 'coOccurrence' ||
          !unit.instructional ||
          items.some((item) => item.unitId !== r.unitId))
      )
        fail(field, 'co-teaching requires one instructional unit');
      if ((r.type === 'compared' || r.type === 'buildsOn') && r.basis !== 'explicit')
        fail(field, 'requires explicit evidence');
      if (r.type === 'introducedEarlier') {
        const from = items.find((item) => item.patternId === r.fromId)!;
        const to = items.find((item) => item.patternId === r.toId)!;
        if (
          r.basis !== 'sequence' ||
          !unit.instructional ||
          to.unitId !== r.unitId ||
          !unitById.get(from.unitId)!.instructional ||
          unitById.get(from.unitId)!.order >= unitById.get(to.unitId)!.order
        )
          fail(field, 'earlier endpoint must precede later endpoint');
      }
    }
    const key = `${r.type}:${r.fromId}:${r.toId}:${r.unitId}`;
    if (assertions.has(key)) fail(field, 'duplicate source assertion');
    assertions.add(key);
  }
  return data;
}

/** In-memory reference projection. Coordinates and UI filtering are not domain data. */
export function projectGrammarGraph(
  patterns: GrammarPattern[],
  data: GrammarMapData
): GrammarGraph {
  const sources = new Map(data.sources.map((s) => [s.id, s.curriculum]));
  const units = new Map(data.units.map((u) => [u.id, u]));
  const unitSize = new Map<string, number>();
  for (const u of data.units)
    unitSize.set(
      u.id,
      new Set(data.items.filter((i) => i.unitId === u.id && i.patternId).map((i) => i.patternId))
        .size
    );
  const edges = new Map<string, GrammarMapEdge>();
  for (const r of data.relationships) {
    const [fromId, toId] = [r.fromId, r.toId].sort();
    const id = `${fromId}::${toId}`;
    const edge = edges.get(id) ?? { id, fromId, toId, weight: 0, assertions: [] };
    edge.assertions.push(r);
    edges.set(id, edge);
  }
  const weightById = new Map(patterns.map((p) => [p.id, 0]));
  for (const edge of edges.values()) {
    const support = new Map<string, number>();
    for (const r of edge.assertions) {
      if (r.type === 'introducedEarlier') continue;
      const curriculum = sources.get(units.get(r.unitId)!.sourceId)!;
      const key = `${curriculum}:${r.type}`;
      const contribution =
        r.type === 'taughtTogether' ? 1 / Math.max(1, (unitSize.get(r.unitId) ?? 2) - 1) : 1;
      support.set(key, Math.max(support.get(key) ?? 0, contribution));
    }
    edge.weight = Math.min(
      3,
      [...support.values()].reduce((a, b) => a + b, 0)
    );
    for (const id of [edge.fromId, edge.toId])
      weightById.set(id, (weightById.get(id) ?? 0) + edge.weight);
  }
  return {
    nodes: [...weightById]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, weight]) => ({ id, weight })),
    edges: [...edges.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

/** Presentation subset: maximum spanning forest and two extra incident links per node. */
export function grammarOverview(edges: GrammarMapEdge[]): GrammarMapEdge[] {
  const sorted = [...edges].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
  const parents = new Map<string, string>();
  const root = (id: string): string => {
    const parent = parents.get(id);
    return parent ? root(parent) : id;
  };
  const keep = new Set<string>();
  for (const edge of sorted) {
    const a = root(edge.fromId),
      b = root(edge.toId);
    if (a !== b) {
      parents.set(a, b);
      keep.add(edge.id);
    }
  }
  const extras = new Map<string, number>();
  for (const edge of sorted) {
    if (keep.has(edge.id)) continue;
    if ((extras.get(edge.fromId) ?? 0) < 2 || (extras.get(edge.toId) ?? 0) < 2) {
      keep.add(edge.id);
      for (const id of [edge.fromId, edge.toId]) extras.set(id, (extras.get(id) ?? 0) + 1);
    }
  }
  return edges.filter((edge) => keep.has(edge.id));
}

export function grammarCoverage(patterns: GrammarPattern[], data: GrammarMapData) {
  const matched = new Set(data.items.flatMap((i) => (i.patternId ? [i.patternId] : [])));
  return {
    totalPatterns: patterns.length,
    matchedPatterns: matched.size,
    unmatchedPatternIds: patterns.filter((p) => !matched.has(p.id)).map((p) => p.id),
    resolved: data.items.filter((i) => i.status === 'resolved').length,
    review: data.items.filter((i) => i.status === 'review').length,
    backfill: data.items.filter((i) => i.status === 'backfill').length,
    outOfScope: data.items.filter((i) => i.status === 'outOfScope').length,
  };
}
