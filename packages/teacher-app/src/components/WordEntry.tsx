import type { Word } from '@mandarinko/core';
import './WordEntry.css';

export function WordEntry({ word }: { word: Omit<Word, 'id'> }) {
  return (
    <span className="word-entry">
      <span className="word-entry-heading">
        <span className="word-entry-spellings">
          {word.spelling.map((spelling, index) => (
            <span key={`${spelling.language}-${spelling.text}`}>
              {index > 0 && <span className="word-entry-separator"> / </span>}
              <span lang={spelling.language} title={spelling.language}>
                {spelling.text || 'New word'}
              </span>
            </span>
          ))}
        </span>
        <span className="word-entry-pronunciation">{word.pronunciation}</span>
        {word.metadata?.hskLevel && (
          <span className="word-entry-level">HSK {word.metadata.hskLevel}</span>
        )}
        {word.metadata?.jlptLevel && (
          <span className="word-entry-level">JLPT {word.metadata.jlptLevel}</span>
        )}
      </span>
      {word.derivation && <span className="word-entry-derivation">{word.derivation}</span>}
      <span className="word-entry-definitions">{word.definition.join('; ')}</span>
    </span>
  );
}
