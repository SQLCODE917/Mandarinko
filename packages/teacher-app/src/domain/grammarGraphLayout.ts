import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceRadial,
  type SimulationNodeDatum,
} from 'd3-force';
import type { GrammarGraph } from '@mandarinko/core';
export interface PositionedGrammarNode extends SimulationNodeDatum {
  id: string;
  weight: number;
  x: number;
  y: number;
  radius: number;
}
export interface GrammarGraphLayout {
  nodes: PositionedGrammarNode[];
  width: number;
  height: number;
  connectedWidth: number;
  connectedHeight: number;
}

/** Deterministic settled adapter: D3 mutates copies, never domain records. */
export function layoutGrammarGraph(graph: GrammarGraph): GrammarGraphLayout {
  let seed = 42;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const max = Math.max(1, ...graph.nodes.map((n) => n.weight));
  const extent = Math.max(
    260,
    Math.sqrt(Math.max(1, graph.nodes.filter((n) => n.weight > 0).length)) * 34
  );
  const score = (weight: number) => Math.log1p(weight) / Math.log1p(max);
  const peripheralRadius = extent * 1.1;
  const nodes: PositionedGrammarNode[] = graph.nodes.map((n, index) => {
    const angle = index * 2.399963229728653;
    const r =
      n.weight > 0 ? extent * (1 - score(n.weight) * 0.8) : peripheralRadius + random() * 120;
    return {
      ...n,
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      radius: 8 + score(n.weight) * 12,
    };
  });
  const links = graph.edges
    .filter((e) => e.weight > 0)
    .map((e) => ({ source: e.fromId, target: e.toId, weight: e.weight }));
  const simulation = forceSimulation(nodes)
    .stop()
    .randomSource(random)
    .force(
      'link',
      forceLink<PositionedGrammarNode, (typeof links)[number]>(links)
        .id((n) => n.id)
        .distance((l) => 100 - 25 * Math.min(1, l.weight))
        .strength((l) => Math.min(0.3, l.weight * 0.15))
    )
    .force(
      'repulsion',
      forceManyBody<PositionedGrammarNode>().strength((n) => (n.weight > 0 ? -130 : -15))
    )
    .force('collision', forceCollide<PositionedGrammarNode>((n) => n.radius + 12).iterations(2))
    .force(
      'radial',
      forceRadial<PositionedGrammarNode>((n) =>
        n.weight > 0 ? extent * (1 - score(n.weight)) * 0.5 : peripheralRadius
      ).strength((n) => (n.weight > 0 ? 0.02 + score(n.weight) * 0.12 : 0.12))
    );
  simulation.tick(420);
  simulation.stop();
  // Weighted centroid is the visual origin. Isolates retain their own positions.
  const mass = nodes.reduce((sum, n) => sum + Math.max(0.1, n.weight), 0) || 1;
  const cx = nodes.reduce((sum, n) => sum + n.x * Math.max(0.1, n.weight), 0) / mass;
  const cy = nodes.reduce((sum, n) => sum + n.y * Math.max(0.1, n.weight), 0) / mass;
  nodes.forEach((n) => {
    n.x -= cx;
    n.y -= cy;
  });
  const width = Math.max(600, ...nodes.map((n) => Math.abs(n.x) * 2 + 180));
  const height = Math.max(500, ...nodes.map((n) => Math.abs(n.y) * 2 + 120));
  const connected = nodes.filter((n) => n.weight > 0);
  const connectedWidth = connected.length
    ? Math.max(600, ...connected.map((n) => Math.abs(n.x) * 2 + 240))
    : width;
  const connectedHeight = connected.length
    ? Math.max(500, ...connected.map((n) => Math.abs(n.y) * 2 + 160))
    : height;
  return { nodes, width, height, connectedWidth, connectedHeight };
}
