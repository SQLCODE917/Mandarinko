import { useMemo } from 'react';
import { HomePage } from './pages/HomePage';
import type { Word } from '@mandarinko/core';
import * as api from './services/api';
import { useVocabulary } from './hooks/useVocabulary';
import { useDictionaryNavigation } from './hooks/useDictionaryNavigation';
import { WordTraversalModal } from './components/WordTraversalModal';
import './App.css';

export function App() {
  const { words, loading, refetch, upsertWord } = useVocabulary();
  const navigation = useDictionaryNavigation();
  const derivationNavigation = {
    words,
    hrefForWord: navigation.hrefForWord,
    onNavigate: navigation.openWord,
  };

  const callbacks = useMemo(
    () => ({
      createWord: async (word: Omit<Word, 'id'>, requestKey?: string) => {
        const saved = await api.createWord(word, requestKey);
        upsertWord(saved);
        return saved;
      },
      updateWord: async (id: string, updates: Partial<Word>) => {
        const saved = await api.updateWord(id, updates);
        upsertWord(saved);
        return saved;
      },
      refreshVocabulary: () => refetch(),
    }),
    [refetch, upsertWord]
  );

  return (
    <div className="app">
      <HomePage
        onCreateWord={navigation.openCreate}
        onOpenWord={navigation.openWord}
        words={words}
        loading={loading}
      />
      <WordTraversalModal
        location={navigation.location}
        loading={loading}
        onDismiss={navigation.close}
        onCreated={navigation.replaceWord}
        navigation={derivationNavigation}
        words={words}
        callbacks={callbacks}
      />
    </div>
  );
}
