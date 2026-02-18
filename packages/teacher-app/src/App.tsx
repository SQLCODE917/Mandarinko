import { useState } from 'react';
import { HomePage } from './pages/HomePage';
import { WordEditorPage } from './pages/WordEditorPage';
import type { Word } from '@mandarinko/core';
import * as api from './services/api';
import './App.css';

type PageType = 'home' | 'create' | 'edit';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [selectedWord, setSelectedWord] = useState<(Word & { id: string }) | undefined>();

  const handleCreateClick = () => {
    setCurrentPage('create');
    setSelectedWord(undefined);
  };

  const handleSaved = (): void => {
    setCurrentPage('home');
    setSelectedWord(undefined);
  };

  const handleCancel = () => {
    setCurrentPage('home');
    setSelectedWord(undefined);
  };

  const handleEditWord = (word: Word & { id: string }) => {
    setSelectedWord(word);
    setCurrentPage('edit');
  };

  const handleCreateWord = async (word: Omit<Word, 'id'>) => {
    return api.createWord(word);
  };

  const handleUpdateWord = async (id: string, updates: Partial<Word>) => {
    return api.updateWord(id, updates);
  };

  return (
    <div className="app">
      {currentPage === 'home' && (
        <HomePage onCreateWord={handleCreateClick} onEditWord={handleEditWord} />
      )}
      {currentPage === 'create' && (
        <WordEditorPage
          key="create-word"
          title="Create New Word"
          onCreateWord={handleCreateWord}
          onUpdateWord={handleUpdateWord}
          onRootSaved={handleSaved}
          onCancel={handleCancel}
        />
      )}
      {currentPage === 'edit' && selectedWord && (
        <WordEditorPage
          key={selectedWord.id}
          title="Edit Word"
          initialWord={selectedWord}
          onCreateWord={handleCreateWord}
          onUpdateWord={handleUpdateWord}
          onRootSaved={handleSaved}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
