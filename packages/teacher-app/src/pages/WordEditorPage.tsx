import { useState } from 'react';
import { WordForm } from '../components/WordForm';
import * as api from '../services/api';
import type { Word } from '@mandarinko/core';
import './WordEditorPage.css';

interface WordEditorPageProps {
  onSaved: (word: Word & { id: string }) => void;
  onCancel: () => void;
  initialWord?: Word & { id: string };
}

export function WordEditorPage({ onSaved, onCancel, initialWord }: WordEditorPageProps) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (word: Word) => {
    try {
      setError(null);
      let saved: Word & { id: string };

      if (initialWord) {
        saved = await api.updateWord(initialWord.id, word);
      } else {
        saved = await api.createWord(word);
      }

      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="word-editor-page">
      <header className="page-header">
        <h1>{initialWord ? 'Edit Word' : 'Create New Word'}</h1>
        <p>Define all properties of the word</p>
      </header>

      {error && <div className="page-error">{error}</div>}

      <WordForm initialWord={initialWord} onSubmit={handleSubmit} onCancel={onCancel} />
    </div>
  );
}
