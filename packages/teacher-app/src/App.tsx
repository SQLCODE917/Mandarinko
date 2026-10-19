import { useMemo, useState } from 'react';
import { HomePage } from './pages/HomePage';
import type { Word } from '@mandarinko/core';
import * as api from './services/api';
import { useVocabulary } from './hooks/useVocabulary';
import { WordTraversalModal } from './components/WordTraversalModal';
import './App.css';

export function App() {
  const { words, loading, refetch } = useVocabulary();
  const [dialogSession, setDialogSession] = useState<{
    id: number;
    rootWordId: string | null;
  } | null>(null);

  const openWord = (rootWordId: string | null) => {
    setDialogSession((previous) => ({ id: (previous?.id ?? 0) + 1, rootWordId }));
  };

  const callbacks = useMemo(
    () => ({
      createWord: (word: Omit<Word, 'id'>) => api.createWord(word),
      updateWord: (id: string, updates: Partial<Word>) => api.updateWord(id, updates),
      refreshVocabulary: () => refetch(),
    }),
    [refetch]
  );

  return (
    <div className="app">
      <HomePage
        onCreateWord={() => openWord(null)}
        onOpenWord={openWord}
        words={words}
        loading={loading}
      />
      <WordTraversalModal
        key={dialogSession?.id ?? 0}
        isOpen={dialogSession !== null}
        rootWordId={dialogSession?.rootWordId ?? null}
        words={words}
        callbacks={callbacks}
      />
    </div>
  );
}
