import { memo, useCallback } from 'react';
import { EntrySearch } from '../components/EntrySearch';
import { WordEntry } from '../components/WordEntry';
import { WordList } from '../components/WordList';
import { CatalogLayout } from '../components/CatalogLayout';
import './HomePage.css';
import type { Word } from '@mandarinko/core';

interface HomePageProps {
  onCreateWord: () => void;
  onOpenWord: (id: string) => void;
  words: (Word & { id: string })[];
  loading: boolean;
}

export const HomePage = memo(function HomePage({
  onCreateWord,
  onOpenWord,
  words,
  loading,
}: HomePageProps) {
  const selectWord = useCallback((word: Word) => onOpenWord(word.id), [onOpenWord]);
  return (
    <CatalogLayout page="dictionary">
      <div className="search-section">
        <EntrySearch
          entries={words}
          renderEntry={(word) => <WordEntry word={word} />}
          onSelect={selectWord}
          placeholder="Search the dictionary..."
        />
      </div>

      <div className="words-section">
        <div className="section-header">
          <h2>All Words ({words.length})</h2>
          <button onClick={onCreateWord} className="btn-create">
            + Create New Word
          </button>
        </div>

        <WordList words={words} loading={loading} onSelectWord={selectWord} />
      </div>
    </CatalogLayout>
  );
});
