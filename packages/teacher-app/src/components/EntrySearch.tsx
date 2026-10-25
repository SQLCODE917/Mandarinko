import { useMemo, useState, type ReactNode } from 'react';
import { createEntrySearch } from '@mandarinko/core';
import './OmniSearch.css';

/** In-memory catalog search shares core matching across dictionary and grammar. */
export function EntrySearch<T extends { id: string }>({
  entries,
  placeholder,
  renderEntry,
  onSelect,
  onQueryChange,
}: {
  entries: T[];
  placeholder: string;
  renderEntry: (entry: T) => ReactNode;
  onSelect: (entry: T) => void;
  onQueryChange?: (query: string) => void;
}) {
  const [query, setQuery] = useState('');
  const search = useMemo(() => createEntrySearch(entries), [entries]);
  const results = useMemo(() => (query.trim() ? search(query) : []), [search, query]);
  return (
    <div className="omni-search">
      <div className="search-controls">
        <input
          type="search"
          className="search-input"
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onQueryChange?.(event.target.value);
          }}
        />
      </div>
      {results.length > 0 && (
        <div className="search-results">
          {results.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="result-item"
              onClick={() => onSelect(entry)}
            >
              {renderEntry(entry)}
            </button>
          ))}
        </div>
      )}
      {query.trim() && !results.length && (
        <div className="no-results" role="status">
          No results
        </div>
      )}
    </div>
  );
}
