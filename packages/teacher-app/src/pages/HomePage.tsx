import { useVocabulary } from '../hooks/useVocabulary';
import { OmniSearch } from '../components/OmniSearch';
import { WordList } from '../components/WordList';
import { LCDText } from '../components/LCDText';
import './HomePage.css';

interface HomePageProps {
  onCreateWord: () => void;
}

export function HomePage({ onCreateWord }: HomePageProps) {
  const { words, loading } = useVocabulary();

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
          <OmniSearch onSelect={() => {}} placeholder="Search the dictionary..." />
        </div>

        <div className="words-section">
          <div className="section-header">
            <h2>All Words ({words.length})</h2>
            <button onClick={onCreateWord} className="btn-create">
              + Create New Word
            </button>
          </div>

          <WordList words={words} loading={loading} />
        </div>
      </div>
    </div>
  );
}
