import { useEffect, useMemo, useRef, useState } from 'react';
import {
  grammarOverview,
  projectGrammarGraph,
  relationshipTypes,
  type GrammarMapData,
  type GrammarMapEdge,
  type GrammarPattern,
  type GrammarRelationshipType,
} from '@mandarinko/core';
import { layoutGrammarGraph } from '../domain/grammarGraphLayout';
import './GrammarGraph.css';

export const relationshipLabels: Record<GrammarRelationshipType, string> = {
  taughtTogether: 'Taught together',
  introducedEarlier: 'Introduced earlier',
  compared: 'Explicitly compared',
  buildsOn: 'Explicitly builds on',
};
export function GrammarGraph({
  patterns,
  data,
  matches,
  searching,
  onOpen,
}: {
  patterns: GrammarPattern[];
  data: GrammarMapData;
  matches: Set<string>;
  searching: boolean;
  onOpen: (id: string) => void;
}) {
  const graph = useMemo(() => projectGrammarGraph(patterns, data), [patterns, data]);
  const layout = useMemo(() => layoutGrammarGraph(graph), [graph]);
  const positions = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout]);
  const entries = useMemo(() => new Map(patterns.map((p) => [p.id, p])), [patterns]);
  const [enabled, setEnabled] = useState<GrammarRelationshipType[]>([
    'taughtTogether',
    'compared',
    'buildsOn',
  ]);
  const [showAll, setShowAll] = useState(false);
  const [fitAll, setFitAll] = useState(false);
  const [viewport, setViewport] = useState({ width: 1000, height: 600 });
  const width = fitAll ? layout.width : layout.connectedWidth;
  const height = fitAll ? layout.height : layout.connectedHeight;
  const [edgeId, setEdgeId] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; cameraX: number; cameraY: number } | null>(null);
  const filtered = useMemo(
    () =>
      graph.edges
        .map((e) => ({ ...e, assertions: e.assertions.filter((r) => enabled.includes(r.type)) }))
        .filter((e) => e.assertions.length),
    [graph, enabled]
  );
  const visible = useMemo(
    () => (showAll ? filtered : grammarOverview(filtered)),
    [filtered, showAll]
  );
  const edge = filtered.find((e) => e.id === edgeId);
  const highest = Math.max(1, ...layout.nodes.map((n) => n.weight));
  const unitById = new Map(data.units.map((u) => [u.id, u]));
  const sourceById = new Map(data.sources.map((s) => [s.id, s]));
  useEffect(() => {
    const canvas = svg.current;
    if (!canvas) return;
    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) setViewport({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const canvas = svg.current;
    const wheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      event.preventDefault();
      setCamera((c) => ({
        ...c,
        zoom: Math.min(8, Math.max(0.5, c.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1))),
      }));
    };
    canvas?.addEventListener('wheel', wheel, { passive: false });
    return () => canvas?.removeEventListener('wheel', wheel);
  }, []);
  const changeZoom = (factor: number) =>
    setCamera((c) => ({ ...c, zoom: Math.min(8, Math.max(0.5, c.zoom * factor)) }));
  const openNode = (id: string) => {
    setFocused(id);
    onOpen(id);
  };
  const inspect = (e: GrammarMapEdge) => setEdgeId(e.id);
  const screenScale = Math.min(viewport.width / width, viewport.height / height);
  const labelSize = Math.max(16 / (screenScale * camera.zoom), 28 / Math.max(1, camera.zoom * 0.6));
  const labels = new Map<string, { text: string; x: number }>();
  const occupied: { x: number; y: number; width: number; height: number }[] = [];
  const priority = (id: string, weight: number) =>
    (focused === id ? 10000 : searching && matches.has(id) ? 1000 : 0) + weight;
  for (const node of [...layout.nodes].sort(
    (a, b) => priority(b.id, b.weight) - priority(a.id, a.weight) || a.id.localeCompare(b.id)
  )) {
    const highlight = searching && matches.has(node.id);
    if (node.weight < highest * 0.38 && camera.zoom < 2 && focused !== node.id && !highlight)
      continue;
    const pattern = entries.get(node.id)!;
    const raw = pattern.spelling.find((s) => s.language === 'ja')?.text ?? pattern.title;
    const limit = viewport.width < 500 ? 12 : 18;
    const text = raw.length > limit ? raw.slice(0, limit - 1) + '…' : raw;
    const box = {
      x: node.x + node.radius + 5,
      y: node.y - labelSize,
      width:
        [...text].reduce((sum, char) => sum + (/^[\u0020-\u007e]$/u.test(char) ? 0.6 : 1), 0) *
        labelSize,
      height: labelSize * 1.4,
    };
    const leftBoundary = (-width / 2 - camera.x) / camera.zoom;
    const rightBoundary = (width / 2 - camera.x) / camera.zoom;
    if (box.x + box.width > rightBoundary - 10) box.x = node.x - node.radius - 5 - box.width;
    box.x = Math.max(leftBoundary + 10, Math.min(box.x, rightBoundary - box.width - 10));
    const overlaps = occupied.some(
      (b) =>
        box.x < b.x + b.width + 8 &&
        box.x + box.width + 8 > b.x &&
        box.y < b.y + b.height + 8 &&
        box.y + box.height + 8 > b.y
    );
    if (overlaps && focused !== node.id) continue;
    labels.set(node.id, { text, x: box.x });
    occupied.push(box);
  }
  return (
    <section className="grammar-map" aria-label="Grammar concept map">
      <div className="grammar-map-toolbar">
        <div role="group" aria-label="Relationship filters">
          {relationshipTypes.map((type) => (
            <label key={type}>
              <input
                type="checkbox"
                checked={enabled.includes(type)}
                onChange={(event) =>
                  setEnabled((types) =>
                    event.target.checked ? [...types, type] : types.filter((t) => t !== type)
                  )
                }
              />
              {relationshipLabels[type]}
            </label>
          ))}
        </div>
        <div className="grammar-map-actions">
          <button type="button" onClick={() => changeZoom(1.4)} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => changeZoom(1 / 1.4)} aria-label="Zoom out">
            −
          </button>
          <button
            type="button"
            onClick={() => {
              setFitAll(false);
              setCamera({ x: 0, y: 0, zoom: 1 });
            }}
          >
            Fit map
          </button>
          <button
            type="button"
            onClick={() => {
              setFitAll(true);
              setCamera({ x: 0, y: 0, zoom: 1 });
            }}
          >
            Fit all patterns
          </button>
          <label>
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            Show all connections
          </label>
        </div>
      </div>
      <div className={`grammar-map-workspace${edge ? ' has-evidence' : ''}`}>
        <svg
          ref={svg}
          className="grammar-map-canvas"
          aria-label="Interactive grammar map"
          viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}
          onPointerDown={(e) => {
            if (e.button !== 0 || e.target !== e.currentTarget) return;
            drag.current = { x: e.clientX, y: e.clientY, cameraX: camera.x, cameraY: camera.y };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const scale = 1 / (svg.current?.getScreenCTM()?.a || 1);
            setCamera((c) => ({
              ...c,
              x: drag.current!.cameraX + (e.clientX - drag.current!.x) * scale,
              y: drag.current!.cameraY + (e.clientY - drag.current!.y) * scale,
            }));
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
            {visible.map((e) => {
              const a = positions.get(e.fromId)!,
                b = positions.get(e.toId)!;
              const active = e.id === edgeId;
              return (
                <g
                  key={e.id}
                  className={`grammar-map-edge${active ? ' selected' : ''}${e.weight === 0 ? ' sequence' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect connections: ${entries.get(e.fromId)?.title} and ${entries.get(e.toId)?.title}`}
                  onClick={() => inspect(e)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      inspect(e);
                    }
                  }}
                >
                  <title>
                    {e.assertions
                      .map((r) => relationshipLabels[r.type])
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .join(', ')}
                  </title>
                  <path
                    d={`M${a.x},${a.y} Q${(a.x + b.x) / 2 + (b.y - a.y) * 0.04},${(a.y + b.y) / 2 - (b.x - a.x) * 0.04} ${b.x},${b.y}`}
                    fill="none"
                    strokeWidth={
                      active ? 5 : 1 + Math.min(3, e.weight) + Math.min(a.weight, b.weight) * 0.4
                    }
                  />
                  <path
                    className="grammar-map-edge-hit"
                    d={`M${a.x},${a.y} L${b.x},${b.y}`}
                    fill="none"
                    strokeWidth={16}
                  />
                </g>
              );
            })}
            {layout.nodes.map((n) => {
              const p = entries.get(n.id)!;
              const highlight = searching && matches.has(n.id);
              return (
                <g
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  className={`grammar-map-node${highlight ? ' match' : ''}${focused === n.id ? ' focused' : ''}${searching && !matches.has(n.id) ? ' muted' : ''}`}
                  aria-label={p.title}
                  data-pattern-id={p.id}
                  onClick={(event) => {
                    event.currentTarget.focus();
                    openNode(n.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openNode(n.id);
                    }
                  }}
                  onFocus={() => setFocused(n.id)}
                  onMouseEnter={() => setFocused(n.id)}
                >
                  <title>
                    {p.title}
                    {n.weight === 0 ? ' — no sourced conceptual connections' : ''}
                  </title>
                  <circle cx={n.x} cy={n.y} r={n.radius} />
                  {labels.has(n.id) && (
                    <text x={labels.get(n.id)!.x} y={n.y + 5} lang="ja" fontSize={labelSize}>
                      {labels.get(n.id)!.text}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        {edge && (
          <aside className="grammar-map-evidence" aria-label="Connection evidence">
            <button
              type="button"
              className="grammar-map-evidence-close"
              onClick={() => setEdgeId(null)}
            >
              Close evidence
            </button>
            <h3>Connection evidence</h3>
            <div>
              {[edge.fromId, edge.toId].map((id) => (
                <button type="button" key={id} onClick={() => openNode(id)}>
                  {entries.get(id)?.title}
                </button>
              ))}
            </div>
            {edge.assertions.map((r) => {
              const u = unitById.get(r.unitId)!;
              const s = sourceById.get(u.sourceId)!;
              return (
                <article key={r.id}>
                  <h4>{relationshipLabels[r.type]}</h4>
                  {(r.type === 'buildsOn' || r.type === 'introducedEarlier') && (
                    <p>
                      {entries.get(r.fromId)?.title} → {entries.get(r.toId)?.title}
                    </p>
                  )}
                  <p>{r.rationale}</p>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title}
                  </a>
                  <p>
                    {[
                      u.locator,
                      ...r.itemIds.map((id) => data.items.find((item) => item.id === id)?.locator),
                    ]
                      .filter((value, index, all) => value && all.indexOf(value) === index)
                      .join(' · ')}{' '}
                    · {s.edition}
                  </p>
                </article>
              );
            })}
          </aside>
        )}
      </div>
      <details className="grammar-map-accessible">
        <summary>Browse patterns and connections as a list</summary>
        <ul>
          {patterns
            .filter((p) => !searching || matches.has(p.id))
            .map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => openNode(p.id)}>
                  {p.title}
                </button>
                <ul>
                  {filtered
                    .filter((e) => e.fromId === p.id || e.toId === p.id)
                    .map((e) => (
                      <li key={e.id}>
                        <button type="button" onClick={() => inspect(e)}>
                          {entries.get(e.fromId === p.id ? e.toId : e.fromId)?.title} —{' '}
                          {[...new Set(e.assertions.map((r) => relationshipLabels[r.type]))].join(
                            ', '
                          )}
                        </button>
                      </li>
                    ))}
                </ul>
              </li>
            ))}
        </ul>
      </details>
    </section>
  );
}
