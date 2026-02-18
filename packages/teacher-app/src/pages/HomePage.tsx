import { useVocabulary } from '../hooks/useVocabulary';
import { useState } from 'react';
import { OmniSearch } from '../components/OmniSearch';
import { WordList } from '../components/WordList';
import { LCDText } from '../components/LCDText';
import { WordViewerModal } from '../components/WordViewerModal';
import './HomePage.css';
import type { Word } from '@mandarinko/core';

interface HomePageProps {
  onCreateWord: () => void;
  onEditWord: (word: Word & { id: string }) => void;
}

export function HomePage({ onCreateWord, onEditWord }: HomePageProps) {
  const { words, loading } = useVocabulary();
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);

  return (
    <div className="home-page">
      <header className="page-header">
        <LCDText className="logo">
          <span className="cartouche">&#22269;&#35821;&#12371;</span>
          <span className="logo-text">Mandarinko</span>
        </LCDText>
      </header>

      <div className="home-content">
        <div className="search-section">
          <OmniSearch
            onSelect={(word) => setSelectedWordId(word.id)}
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

          <WordList
            words={words}
            loading={loading}
            onSelectWord={(word) => setSelectedWordId(word.id)}
          />
        </div>
      </div>

      <WordViewerModal
        isOpen={Boolean(selectedWordId)}
        rootWordId={selectedWordId}
        words={words}
        onClose={() => setSelectedWordId(null)}
        onEdit={(word) => {
          setSelectedWordId(null);
          onEditWord(word);
        }}
      />
    </div>
  );
}
