import type { Word } from '@mandarinko/core';
import { WordEntry } from './WordEntry';
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
      {words.map((word) =>
        onSelectWord ? (
          <button
            key={word.id}
            type="button"
            className="word-item"
            onClick={() => onSelectWord(word)}
          >
            <WordEntry word={word} />
          </button>
        ) : (
          <div key={word.id} className="word-item">
            <WordEntry word={word} />
          </div>
        )
      )}
    </div>
  );
}
