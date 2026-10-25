import { memo } from 'react';
import type { Word } from '@mandarinko/core';
import { WordEntry } from './WordEntry';
import { EntryList } from './EntryList';

interface WordListProps {
  words: (Word & { id: string })[];
  loading?: boolean;
  onSelectWord?: (word: Word & { id: string }) => void;
}

export const WordList = memo(function WordList({ words, loading, onSelectWord }: WordListProps) {
  return (
    <EntryList
      entries={words}
      loading={loading}
      loadingLabel="Loading vocabulary..."
      emptyLabel="No words found"
      renderEntry={(word) => <WordEntry word={word} />}
      onSelect={onSelectWord}
    />
  );
});
