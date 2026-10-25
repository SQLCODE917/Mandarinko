import { expect, it } from 'vitest';
import { layoutGrammarGraph } from './grammarGraphLayout';

it('keeps a large unconnected catalog close to the connected core', () => {
  const leaves = Array.from({ length: 12 }, (_, i) => ({ id: `leaf${i}`, weight: 1 }));
  const graph = {
    nodes: [
      { id: 'hub', weight: 12 },
      ...leaves,
      ...Array.from({ length: 100 }, (_, i) => ({ id: `isolate${i}`, weight: 0 })),
    ],
    edges: leaves.map((n) => ({
      id: n.id,
      fromId: 'hub',
      toId: n.id,
      weight: 1,
      relationships: [],
    })),
  };
  const { nodes } = layoutGrammarGraph(graph);
  const coreRadius = Math.max(
    ...nodes.filter((n) => n.weight > 0).map((n) => Math.hypot(n.x, n.y))
  );
  const unconnected = nodes.filter((n) => n.weight === 0);
  const averageRadius =
    unconnected.reduce((sum, n) => sum + Math.hypot(n.x, n.y), 0) / unconnected.length;
  // Leave room for the peripheral dots without a broad empty annulus around the core.
  expect(averageRadius - coreRadius).toBeLessThan(400);
  expect(unconnected).toHaveLength(100);
});

it('settles deterministically around the weighted centroid with a central hub', () => {
  const nodes = [
    { id: 'hub', weight: 12 },
    ...Array.from({ length: 12 }, (_, i) => ({ id: `leaf${i}`, weight: 1 })),
    { id: 'isolate', weight: 0 },
  ];
  const graph = {
    nodes,
    edges: nodes
      .slice(1, -1)
      .map((n) => ({ id: n.id, fromId: 'hub', toId: n.id, weight: 1, relationships: [] })),
  };
  const before = JSON.stringify(graph);
  const a = layoutGrammarGraph(graph),
    b = layoutGrammarGraph(graph);
  expect(a).toEqual(b);
  expect(JSON.stringify(graph)).toBe(before);
  expect(a.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
  expect(a.nodes).toHaveLength(nodes.length);
  const distance = (n: { x: number; y: number }) => Math.hypot(n.x, n.y);
  expect(distance(a.nodes[0])).toBeLessThan(
    a.nodes.slice(1, -1).reduce((s, n) => s + distance(n), 0) / 12
  );
  expect(a.nodes.reduce((s, n) => s + n.x * Math.max(0.1, n.weight), 0)).toBeCloseTo(0, 6);
  expect(a.nodes.reduce((s, n) => s + n.y * Math.max(0.1, n.weight), 0)).toBeCloseTo(0, 6);
});
