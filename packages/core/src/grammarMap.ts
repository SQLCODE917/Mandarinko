import type { GrammarPattern } from './types.js';
import { isRecord } from './entryValidation.js';

export const relationshipTypes = [
  'taughtTogether',
  'introducedEarlier',
  'compared',
  'buildsOn',
] as const;
export type GrammarRelationshipType = (typeof relationshipTypes)[number];
export interface GrammarRelationship {
  id: string;
  fromId: string;
  toId: string;
  type: GrammarRelationshipType;
  rationale?: string;
}
export interface GrammarMapData {
  schemaVersion: 2;
  relationships: GrammarRelationship[];
}
export interface GrammarMapEdge {
  id: string;
  fromId: string;
  toId: string;
  weight: number;
  relationships: GrammarRelationship[];
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

/** Delimiters in pattern IDs are escaped to keep relationship identity unambiguous. */
export function grammarRelationshipId(
  type: GrammarRelationshipType,
  fromId: string,
  toId: string
): string {
  const endpoints = symmetricRelationship(type) ? [fromId, toId].sort() : [fromId, toId];
  return `${type}:${endpoints.map(encodeURIComponent).join(':')}`;
}

/** Runtime validation at the filesystem/HTTP boundary; no partially valid map. */
export function parseGrammarMap(input: unknown, patterns: GrammarPattern[]): GrammarMapData {
  const fail = (field: string, message: string): never => {
    throw new Error(`Invalid grammar map: ${field}: ${message}`);
  };
  if (!isRecord(input)) fail('schemaVersion', 'expected an object with schemaVersion 2');
  const record = input as Record<string, unknown>;
  if (record.schemaVersion !== 2) fail('schemaVersion', 'expected 2');
  for (const key of Object.keys(record))
    if (!['schemaVersion', 'relationships'].includes(key)) fail(key, 'unknown field');
  if (!Array.isArray(record.relationships)) fail('relationships', 'expected an array');
  const ids = new Set<string>();
  const connections = new Set<string>();
  const patternIds = new Set(patterns.map((p) => p.id));
  (record.relationships as unknown[]).forEach((row, i) => {
    const field = `relationships[${i}]`;
    if (!isRecord(row)) fail(field, 'expected object');
    const r = row as Record<string, unknown>;
    for (const key of Object.keys(r))
      if (!['id', 'fromId', 'toId', 'type', 'rationale'].includes(key))
        fail(`${field}.${key}`, 'unknown field');
    for (const key of ['id', 'fromId', 'toId', 'type'])
      if (typeof r[key] !== 'string' || !(r[key] as string).trim())
        fail(`${field}.${key}`, 'required string');
    if (ids.has(r.id as string)) fail(`${field}.id`, 'duplicate ID');
    ids.add(r.id as string);
    if (!relationshipTypes.includes(r.type as GrammarRelationshipType))
      fail(`${field}.type`, 'unknown relationship');
    if (!patternIds.has(r.fromId as string)) fail(`${field}.fromId`, 'missing pattern');
    if (!patternIds.has(r.toId as string)) fail(`${field}.toId`, 'missing pattern');
    if (r.fromId === r.toId) fail(`${field}.toId`, 'endpoints must be different');
    if (
      symmetricRelationship(r.type as GrammarRelationshipType) &&
      (r.fromId as string) > (r.toId as string)
    )
      fail(`${field}.fromId`, 'symmetric endpoints must be sorted');
    if ('rationale' in r && (typeof r.rationale !== 'string' || !r.rationale.trim()))
      fail(`${field}.rationale`, 'expected nonempty string');
    const key = grammarRelationshipId(
      r.type as GrammarRelationshipType,
      r.fromId as string,
      r.toId as string
    );
    if (connections.has(key)) fail(field, 'duplicate relationship');
    connections.add(key);
  });
  return input as GrammarMapData;
}

/** Each conceptual relationship contributes one; introduction order never affects layout. */
export function projectGrammarGraph(
  patterns: GrammarPattern[],
  data: GrammarMapData
): GrammarGraph {
  const edges = new Map<string, GrammarMapEdge>();
  for (const r of data.relationships) {
    const [fromId, toId] = [r.fromId, r.toId].sort();
    const id = JSON.stringify([fromId, toId]);
    const edge = edges.get(id) ?? { id, fromId, toId, weight: 0, relationships: [] };
    edge.relationships.push(r);
    if (r.type !== 'introducedEarlier') edge.weight += 1;
    edges.set(id, edge);
  }
  const weightById = new Map(patterns.map((p) => [p.id, 0]));
  for (const edge of edges.values())
    for (const id of [edge.fromId, edge.toId])
      weightById.set(id, (weightById.get(id) ?? 0) + edge.weight);
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
