import { useState, useCallback } from 'react';
import type { Word } from '@mandarinko/core';
import { useSearch } from '../hooks/useSearch';
import './OmniSearch.css';

interface OmniSearchProps {
  onSelect: (word: Word & { id: string }) => void;
  placeholder?: string;
}

export function OmniSearch({ onSelect, placeholder = 'Search words...' }: OmniSearchProps) {
  const [query, setQuery] = useState('');
  const { results, loading, searchByDefinition, searchBySpelling, combineResults } = useSearch();

  const handleSearch = useCallback(
    async (value: string) => {
      setQuery(value);
      if (value.trim()) {
        // Perform all 3 searches simultaneously and combine results
        const [definitionResults, exactSpellingResults, partialSpellingResults] = await Promise.all(
          [searchByDefinition(value), searchBySpelling(value, true), searchBySpelling(value, false)]
        );
        combineResults([definitionResults, exactSpellingResults, partialSpellingResults]);
      } else {
        combineResults([]);
      }
    },
    [searchByDefinition, searchBySpelling, combineResults]
  );

  return (
    <div className="omni-search">
      <div className="search-controls">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="search-input"
        />
      </div>

      {loading && <div className="loading">Searching...</div>}

      {results.length > 0 && (
        <div className="search-results">
          {results.map((word) => (
            <div key={word.id} className="result-item" onClick={() => onSelect(word)}>
              <div className="result-spelling">{word.spelling.map((s) => s.text).join(' / ')}</div>
              <div className="result-definition">{word.definition.join('; ')}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && <div className="no-results">No results</div>}
    </div>
  );
}
