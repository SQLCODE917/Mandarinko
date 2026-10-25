import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GrammarGraph } from '../components/GrammarGraph';
import { matchesEntry, type GrammarMapData } from '@mandarinko/core';
import { CatalogLayout } from '../components/CatalogLayout';
import { EntrySearch } from '../components/EntrySearch';
import { EntryList } from '../components/EntryList';
import { EntryDialog } from '@mandarinko/ui';
import { GrammarEntry } from '../components/GrammarEntry';
import { GrammarDetails } from '../components/GrammarDetails';
import { GrammarEditor, type GrammarEditorHandle } from '../components/GrammarEditor';
import { useEntries } from '../hooks/useEntries';
import { navigateHref, useBrowserLocation } from '../hooks/useBrowserLocation';
import { grammarHref, readGrammarLocation } from '../domain/grammarLocation';
import { grammarDrafts } from '../services/grammarDrafts';
import * as api from '../services/api';
import type { GrammarPattern } from '@mandarinko/core';
import type { GrammarEditorPorts } from '../domain/grammarEditorSession';

export function GrammarPage() {
  const { entries: patterns, loading, error, upsert, refetch } = useEntries(api.fetchGrammar);
  const href = useBrowserLocation();
  const location = readGrammarLocation(href);
  const graphView = new URL(href).searchParams.get('view') === 'graph';
  const [query, setQuery] = useState('');
  const [mapData, setMapData] = useState<GrammarMapData | null>(null);
  const [mapError, setMapError] = useState('');
  const [mapLoading, setMapLoading] = useState(false);
  const comparisons = useEntries(api.fetchGrammarComparisons);
  const loadMap = useCallback(async () => {
    setMapLoading(true);
    setMapError('');
    try {
      setMapData(await api.fetchGrammarMap());
    } catch (error) {
      setMapError(error instanceof Error ? error.message : String(error));
    } finally {
      setMapLoading(false);
    }
  }, []);
  useEffect(() => {
    if (graphView && !loading && !mapData && !mapError && !mapLoading) void loadMap();
  }, [graphView, loading, mapData, mapError, mapLoading, loadMap]);
  const switchView = (view: 'grid' | 'graph') => {
    const url = new URL(href);
    if (view === 'graph') url.searchParams.set('view', 'graph');
    else url.searchParams.delete('view');
    navigateHref(`${url.pathname}${url.search}${url.hash}`);
  };
  const comparisonIds = (id: string) => [
    ...new Set(
      comparisons.entries
        .filter((r) => r.type === 'compared' && (r.fromId === id || r.toId === id))
        .map((r) => (r.fromId === id ? r.toId : r.fromId))
    ),
  ];
  const pattern =
    location.kind === 'pattern'
      ? patterns.find((pattern) => pattern.id === location.id)
      : undefined;
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = location.kind === 'create' || Boolean(pattern && editingId === pattern.id);
  const titleRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<GrammarEditorHandle>(null);
  const close = useCallback(() => {
    setEditingId(null);
    navigateHref(grammarHref(window.location.href, { kind: 'closed' }));
  }, []);
  const open = (id: string) => {
    setEditingId(null);
    navigateHref(grammarHref(href, { kind: 'pattern', id }));
  };
  useLayoutEffect(() => {
    setEditingId(null);
  }, [href]);
  useLayoutEffect(() => {
    if (!editing) titleRef.current?.focus();
  }, [href, editing]);
  const ports = useMemo<GrammarEditorPorts>(
    () => ({
      create: async (input, key) => {
        const { comparisonIds, ...content } = input;
        const saved = await api.createGrammar(content, key);
        if (comparisonIds?.length) await api.updateGrammarComparisons(saved.id, comparisonIds);
        await comparisons.refetch().catch(() => undefined);
        setMapData(null);
        upsert(saved);
        return saved;
      },
      update: async (id, input) => {
        const { comparisonIds, ...content } = input;
        const saved = await api.updateGrammar(id, content);
        if (comparisonIds) await api.updateGrammarComparisons(id, comparisonIds);
        await comparisons.refetch().catch(() => undefined);
        setMapData(null);
        upsert(saved);
        return saved;
      },
      drafts: grammarDrafts,
      newKey: () => crypto.randomUUID(),
    }),
    [upsert, comparisons.refetch]
  );
  const exitEditor = useCallback(
    (saved?: GrammarPattern) => {
      setEditingId(null);
      if (saved)
        navigateHref(grammarHref(window.location.href, { kind: 'pattern', id: saved.id }), true);
      else if (readGrammarLocation(window.location.href).kind === 'create') close();
    },
    [close]
  );
  const locationError =
    location.kind === 'invalid'
      ? location.message
      : location.kind === 'pattern' && !pattern && !loading
        ? `No grammar pattern exists for ID “${location.id}”.`
        : null;
  return (
    <>
      <CatalogLayout page="grammar" wide={graphView}>
        <div className="search-section">
          <EntrySearch
            entries={patterns}
            onQueryChange={setQuery}
            placeholder="Search grammar..."
            renderEntry={(pattern) => <GrammarEntry pattern={pattern} />}
            onSelect={(pattern) => open(pattern.id)}
          />
        </div>
        <div className="words-section">
          <div className="section-header">
            <h2>All Grammar Patterns ({patterns.length})</h2>
            <div className="grammar-view-toggle" role="radiogroup" aria-label="Grammar view">
              {(['grid', 'graph'] as const).map((view) => (
                <label key={view}>
                  <input
                    type="radio"
                    name="grammar-view"
                    value={view}
                    checked={view === 'graph' ? graphView : !graphView}
                    onChange={() => switchView(view)}
                  />
                  <span>{view === 'grid' ? 'Grid' : 'Graph'}</span>
                </label>
              ))}
            </div>
            <button
              className="btn-create"
              onClick={() => navigateHref(grammarHref(href, { kind: 'create' }))}
            >
              + Create New Grammar Pattern
            </button>
          </div>
          {error ? (
            <div role="alert">
              {error}{' '}
              <button
                type="button"
                onClick={() => {
                  void refetch().catch(() => undefined);
                }}
              >
                Reload grammar
              </button>
            </div>
          ) : (
            <>
              <div className="grammar-graph-view" hidden={!graphView}>
                {mapError ? (
                  <p role="alert">
                    {mapError}{' '}
                    <button type="button" onClick={() => void loadMap()}>
                      Reload map
                    </button>
                  </p>
                ) : mapData ? (
                  <GrammarGraph
                    patterns={patterns}
                    data={mapData}
                    matches={
                      new Set(patterns.filter((p) => matchesEntry(p, query)).map((p) => p.id))
                    }
                    searching={Boolean(query.trim())}
                    onOpen={open}
                  />
                ) : graphView ? (
                  <p role="status">Loading grammar map…</p>
                ) : null}
              </div>
              {!graphView && (
                <EntryList
                  className="grammar-list"
                  entries={patterns}
                  loading={loading}
                  loadingLabel="Loading grammar..."
                  emptyLabel="No grammar patterns found"
                  renderEntry={(pattern) => <GrammarEntry pattern={pattern} />}
                  onSelect={(pattern) => open(pattern.id)}
                />
              )}
            </>
          )}
        </div>
      </CatalogLayout>
      {location.kind !== 'closed' && (
        <EntryDialog
          title={editing ? 'Grammar pattern editor' : 'Grammar pattern details'}
          titleRef={titleRef}
          authoring={editing}
          className={editing ? undefined : 'grammar-details-dialog'}
          onClose={() => {
            if (editing && editorRef.current) editorRef.current.close();
            else close();
          }}
        >
          {locationError || error ? (
            <p role="alert">{locationError ?? error}</p>
          ) : editing ? (
            <GrammarEditor
              key={pattern?.id ?? 'new'}
              ref={editorRef}
              pattern={pattern}
              patterns={patterns}
              ports={ports}
              comparisonIds={
                pattern
                  ? comparisons.loading || comparisons.error
                    ? undefined
                    : comparisonIds(pattern.id)
                  : []
              }
              onExit={exitEditor}
            />
          ) : pattern ? (
            <GrammarDetails pattern={pattern} onEdit={() => setEditingId(pattern.id)}>
              {comparisons.error ? (
                <p role="alert">
                  {comparisons.error}{' '}
                  <button
                    type="button"
                    onClick={() => void comparisons.refetch().catch(() => undefined)}
                  >
                    Reload comparisons
                  </button>
                </p>
              ) : (
                Boolean(comparisonIds(pattern.id).length) && (
                  <div className="grammar-contrast-links">
                    {comparisonIds(pattern.id).map((id) => (
                      <a
                        href={grammarHref(href, { kind: 'pattern', id })}
                        key={id}
                        onClick={(event) => {
                          if (
                            event.button === 0 &&
                            !event.ctrlKey &&
                            !event.metaKey &&
                            !event.shiftKey &&
                            !event.altKey
                          ) {
                            event.preventDefault();
                            open(id);
                          }
                        }}
                      >
                        {patterns.find((other) => other.id === id)?.title ?? id}
                      </a>
                    ))}
                  </div>
                )
              )}
            </GrammarDetails>
          ) : (
            <p role="status">Loading grammar…</p>
          )}
        </EntryDialog>
      )}
    </>
  );
}
