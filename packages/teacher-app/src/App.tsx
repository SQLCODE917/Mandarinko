import { useState } from 'react';
import { HomePage } from './pages/HomePage';
import { WordEditorPage } from './pages/WordEditorPage';
import type { Word } from '@mandarinko/core';
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

  return (
    <div className="app">
      {currentPage === 'home' && <HomePage onCreateWord={handleCreateClick} />}
      {currentPage === 'create' && <WordEditorPage onSaved={handleSaved} onCancel={handleCancel} />}
      {currentPage === 'edit' && selectedWord && (
        <WordEditorPage initialWord={selectedWord} onSaved={handleSaved} onCancel={handleCancel} />
      )}
    </div>
  );
}
