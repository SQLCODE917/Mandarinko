import type { Word } from '@mandarinko/core';
import './WordList.css';

interface WordListProps {
  words: (Word & { id: string })[];
  loading?: boolean;
  onSelectWord?: (word: Word & { id: string }) => void;
}

export function WordList({ words, loading, onSelectWord }: WordListProps) {
  if (loading) {
    return <div className="word-list-loading">Loading vocabulary...</div>;
  }

  if (words.length === 0) {
    return <div className="word-list-empty">No words found</div>;
  }

  return (
    <div className="word-list">
      {words.map((word) => (
        <div
          key={word.id}
          className="word-item"
          onClick={() => onSelectWord?.(word)}
          role={onSelectWord ? 'button' : undefined}
          tabIndex={onSelectWord ? 0 : undefined}
        >
          <div className="word-id">{word.id}</div>
          <div className="word-spellings">
            {word.spelling.map((s) => (
              <span key={`${s.language}-${s.text}`} className="spelling">
                {s.text} <span className="lang">({s.language})</span>
              </span>
            ))}
          </div>
          <div className="word-pronunciation">{word.pronunciation}</div>
          <div className="word-definitions">
            {word.definition.map((def, idx) => (
              <div key={idx} className="definition">
                {def}
              </div>
            ))}
          </div>
          {word.metadata && (
            <div className="word-metadata">
              {word.metadata.hskLevel && (
                <span className="badge">HSK {word.metadata.hskLevel}</span>
              )}
              {word.metadata.jlptLevel && (
                <span className="badge">JLPT {word.metadata.jlptLevel}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
