import { useVocabulary } from '../hooks/useVocabulary';
import { useState } from 'react';
import { OmniSearch } from '../components/OmniSearch';
import { WordList } from '../components/WordList';
import { LCDText } from '../components/LCDText';
import { WordTreeModal } from '../components/WordTreeModal';
import './HomePage.css';

interface HomePageProps {
  onCreateWord: () => void;
}

export function HomePage({ onCreateWord }: HomePageProps) {
  const { words, loading, refetch } = useVocabulary();
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

      <WordTreeModal
        isOpen={Boolean(selectedWordId)}
        rootWordId={selectedWordId}
        words={words}
        onClose={() => setSelectedWordId(null)}
        onUpdated={refetch}
      />
    </div>
  );
}
