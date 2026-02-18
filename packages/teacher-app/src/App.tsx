import { useMemo, useState } from 'react';
import { HomePage } from './pages/HomePage';
import type { Word } from '@mandarinko/core';
import * as api from './services/api';
import { useVocabulary } from './hooks/useVocabulary';
import { WordTraversalModal } from './components/WordTraversalModal';
import './App.css';

export function App() {
  const { words, loading, refetch } = useVocabulary();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRootId, setModalRootId] = useState<string | null>(null);

  const openWord = (id: string) => {
    setModalRootId(id);
    setModalOpen(true);
  };

  const openCreate = () => {
    setModalRootId(null);
    setModalOpen(true);
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
        onCreateWord={openCreate}
        onOpenWord={openWord}
        words={words}
        loading={loading}
      />
      <WordTraversalModal
        isOpen={modalOpen}
        rootWordId={modalRootId}
        words={words}
        callbacks={callbacks}
      />
    </div>
  );
}
