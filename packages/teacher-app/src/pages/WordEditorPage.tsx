import { useState } from 'react';
import { WordAuthoringTree } from '../components/WordAuthoringTree';
import type { Word } from '@mandarinko/core';
import './WordEditorPage.css';

interface WordEditorPageProps {
  onCreateWord: (word: Omit<Word, 'id'>) => Promise<Word & { id: string }>;
  onUpdateWord: (id: string, updates: Partial<Word>) => Promise<Word & { id: string }>;
  onCancel: () => void;
  onRootSaved?: (word: Word & { id: string }) => void;
  initialWord?: Word & { id: string };
  title: string;
}

export function WordEditorPage({
  onCreateWord,
  onUpdateWord,
  onCancel,
  onRootSaved,
  initialWord,
  title,
}: WordEditorPageProps) {
  const [error, setError] = useState<string | null>(null);

  const handleRootSaved = async (word: Word & { id: string }) => {
    try {
      setError(null);
      await onRootSaved?.(word);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="word-editor-page">
      <header className="page-header">
        <h1>{title}</h1>
      </header>
      {error && <div className="page-error">{error}</div>}
      <WordAuthoringTree
        rootWordId={initialWord?.id ?? null}
        words={initialWord ? [initialWord] : []}
        onCancel={onCancel}
        onRootSaved={handleRootSaved}
        createWord={onCreateWord}
        updateWord={onUpdateWord}
      />
    </div>
  );
}
