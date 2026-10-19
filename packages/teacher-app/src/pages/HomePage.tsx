import { OmniSearch } from '../components/OmniSearch';
import { WordList } from '../components/WordList';
import { CRTText } from '../components/CRTText';
import './HomePage.css';
import type { Word } from '@mandarinko/core';

interface HomePageProps {
  onCreateWord: () => void;
  onOpenWord: (id: string) => void;
  words: (Word & { id: string })[];
  loading: boolean;
}

export function HomePage({ onCreateWord, onOpenWord, words, loading }: HomePageProps) {
  return (
    <div className="home-page">
      <header className="page-header crt-screen">
        <div className="logo">
          <span className="crt-badge">&#22269;&#35821;&#12371;</span>
          <CRTText>Mandarinko</CRTText>
        </div>
      </header>

      <div className="home-content">
        <div className="search-section">
          <OmniSearch
            onSelect={(word) => onOpenWord(word.id)}
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

          <WordList words={words} loading={loading} onSelectWord={(word) => onOpenWord(word.id)} />
        </div>
      </div>
    </div>
  );
}
