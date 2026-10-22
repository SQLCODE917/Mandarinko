import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CatalogLayout } from '../components/CatalogLayout';
import { EntrySearch } from '../components/EntrySearch';
import { EntryList } from '../components/EntryList';
import { EntryDialog } from '../components/EntryDialog';
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
        const saved = await api.createGrammar(input, key);
        upsert(saved);
        return saved;
      },
      update: async (id, input) => {
        const saved = await api.updateGrammar(id, input);
        upsert(saved);
        return saved;
      },
      drafts: grammarDrafts,
      newKey: () => crypto.randomUUID(),
    }),
    [upsert]
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
      <CatalogLayout page="grammar">
        <div className="search-section">
          <EntrySearch
            entries={patterns}
            placeholder="Search grammar..."
            renderEntry={(pattern) => <GrammarEntry pattern={pattern} />}
            onSelect={(pattern) => open(pattern.id)}
          />
        </div>
        <div className="words-section">
          <div className="section-header">
            <h2>All Grammar Patterns ({patterns.length})</h2>
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
              onExit={exitEditor}
            />
          ) : pattern ? (
            <GrammarDetails pattern={pattern} onEdit={() => setEditingId(pattern.id)}>
              {Boolean(pattern.contrastIds?.length) && (
                <div className="grammar-contrast-links">
                  {pattern.contrastIds?.map((id) => (
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
