import { useMemo } from 'react';
import { HomePage } from './pages/HomePage';
import type { Word } from '@mandarinko/core';
import * as api from './services/api';
import { useVocabulary } from './hooks/useVocabulary';
import { useDictionaryNavigation } from './hooks/useDictionaryNavigation';
import { WordTraversalModal } from './components/WordTraversalModal';
import './App.css';

export function App() {
  const { words, loading, refetch } = useVocabulary();
  const navigation = useDictionaryNavigation();
  const derivationNavigation = {
    words,
    hrefForWord: navigation.hrefForWord,
    onNavigate: navigation.openWord,
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
