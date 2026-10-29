import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { Word } from '@mandarinko/core';
import { wordRelations } from '@mandarinko/core';
import { EntryDialog, WordEntry } from '@mandarinko/ui';
import '@mandarinko/ui/crt.css';
import './style.css';
import { RelationList } from './RelationList';
import {
  readLocation,
  searchDictionary,
  type DictionaryBoot,
  type DictionaryRepository,
} from './dictionary';
export function App({
  boot,
  repository,
}: {
  boot: DictionaryBoot;
  repository?: DictionaryRepository;
}) {
  const [words, setWords] = useState(boot.words);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const composing = useRef(false);
  const title = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchWords = useMemo(() => searchDictionary(words), [words]);
  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
  const location = readLocation(search);
  const matches = useMemo(() => searchWords(location.query), [searchWords, location.query]);
  const total = loaded ? matches.length : boot.total;
  const word = location.wordId ? byId.get(location.wordId) : undefined;
  const load = () => {
    setError('');
    void repository
      ?.load()
      .then((next) => {
        setWords(next);
        setLoaded(true);
      })
      .catch(() => setError('Dictionary could not be loaded. Please retry.'));
  };
  useEffect(() => {
    const sync = () => {
      setSearch(window.location.search);
      setDraft(readLocation(window.location.search).query);
    };
    sync();
    window.addEventListener('popstate', sync);
    load();
    return () => window.removeEventListener('popstate', sync);
  }, []);
  useEffect(() => {
    if (location.wordId) title.current?.focus();
  }, [location.wordId, loaded]);
  const navigate = useCallback((updates: Record<string, string | null>, replace = false) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(updates))
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    window.history[replace ? 'replaceState' : 'pushState'](null, '', url.pathname + url.search);
    setSearch(url.search);
    setDraft(readLocation(url.search).query);
  }, []);
  const query = (value: string) => navigate({ q: value || null, page: null, word: null }, true);
  const open = useCallback((id: string) => navigate({ word: id }), [navigate]);
  const close = () => {
    navigate({ word: null });
    requestAnimationFrame(() => {
      (
        document.querySelector(
          `[data-word-id="${CSS.escape(location.wordId ?? '')}"]`
        ) as HTMLElement | null
      )?.focus();
      if (!document.activeElement || document.activeElement === document.body)
        searchInput.current?.focus();
    });
  };
  const hrefForWord = (id: string) => {
    const p = new URLSearchParams(search);
    p.set('word', id);
    return `?${p}`;
  };
  const navigation = { words, hrefForWord, onNavigate: open };
  const relations = word ? wordRelations(word, byId) : null;
  return (
    <div className="student-page">
      <header className="crt-screen">
        <h1>
          <span className="crt-badge">国语こ</span> <span className="crt-text">Mandarinko</span>
        </h1>
      </header>
      <main>
        <label className="search-label" htmlFor="dictionary-search">
          Search the dictionary
        </label>
        <input
          id="dictionary-search"
          ref={searchInput}
          type="search"
          value={draft}
          placeholder="Spelling, pronunciation or meaning…"
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={(e) => {
            composing.current = false;
            query(e.currentTarget.value);
          }}
          onChange={(e) => {
            setDraft(e.target.value);
            if (!composing.current) query(e.target.value);
          }}
        />
        <div className="catalog-heading">
          <h2>
            {location.query ? 'Search results' : 'All Words'} ({total})
          </h2>
          {!loaded && !error && <span role="status">Loading dictionary…</span>}
        </div>
        {error && (
          <p role="alert">
            {error} <button onClick={load}>Retry</button>
          </p>
        )}
        {loaded && matches.length === 0 && <p role="status">No results</p>}
        <DictionaryCards words={words} matches={matches} onOpen={open} />
      </main>
      {location.wordId && (
        <StudentDialog titleRef={title} onClose={close} wordId={location.wordId}>
          {word ? (
            <>
              <WordEntry word={word} navigation={navigation} />
              {relations!.children.length > 0 && (
                <section aria-label="Components">
                  <h3>Components</h3>
                  <RelationList
                    key={word.id}
                    nodes={relations!.children}
                    collapsible
                    navigation={navigation}
                  />
                </section>
              )}
              {relations!.siblings.length > 0 && (
                <section aria-label="Related words">
                  <h3>Related words</h3>
                  <RelationList key={word.id} nodes={relations!.siblings} navigation={navigation} />
                </section>
              )}
            </>
          ) : (
            <p role="status">
              {loaded
                ? 'Word not found.'
                : error
                  ? 'Dictionary unavailable. Close this window to retry.'
                  : 'Loading word…'}
            </p>
          )}
        </StudentDialog>
      )}
    </div>
  );
}
function StudentDialog({
  children,
  titleRef,
  onClose,
  wordId,
}: {
  children: ReactNode;
  titleRef: RefObject<HTMLDivElement>;
  onClose: () => void;
  wordId: string;
}) {
  useLayoutEffect(() => {
    titleRef.current?.focus();
    const prior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prior;
    };
  }, [wordId]);
  return (
    <EntryDialog
      title="Word details"
      titleRef={titleRef}
      onClose={onClose}
      className="student-details"
    >
      {children}
    </EntryDialog>
  );
}

// Keep entry content mounted: filtering changes visibility rather than rebuilding the catalog.
const CardContent = memo(WordEntry);
const DictionaryCard = memo(function DictionaryCard({
  word,
  hidden,
  onOpen,
}: {
  word: Word;
  hidden: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      data-word-id={word.id}
      className="dictionary-card"
      hidden={hidden}
      onClick={() => onOpen(word.id)}
    >
      <CardContent word={word} />
    </button>
  );
});
const DictionaryCards = memo(function DictionaryCards({
  words,
  matches,
  onOpen,
}: {
  words: Word[];
  matches: Word[];
  onOpen: (id: string) => void;
}) {
  const ids = new Set(matches.map((word) => word.id));
  return (
    <div className="student-grid">
      {words.map((word) => (
        <DictionaryCard key={word.id} word={word} hidden={!ids.has(word.id)} onOpen={onOpen} />
      ))}
    </div>
  );
});
