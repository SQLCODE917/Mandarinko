import { useEffect, useMemo, useState } from 'react';
import type { Word } from '@mandarinko/core';
import { WordForm } from './WordForm';
import * as api from '../services/api';
import './WordTreeModal.css';

interface WordTreeModalProps {
  isOpen: boolean;
  rootWordId: string | null;
  words: (Word & { id: string })[];
  onClose: () => void;
  onUpdated?: () => void;
}

export function WordTreeModal({
  isOpen,
  rootWordId,
  words,
  onClose,
  onUpdated,
}: WordTreeModalProps) {
  const [wordMap, setWordMap] = useState<Map<string, Word & { id: string }>>(new Map());

  useEffect(() => {
    if (!isOpen) return;
    setWordMap(new Map(words.map((word) => [word.id, word])));
  }, [isOpen, words]);

  const rootWord = useMemo(() => {
    if (!rootWordId) return null;
    return wordMap.get(rootWordId) ?? null;
  }, [rootWordId, wordMap]);

  const handleUpdate = async (word: Word) => {
    const updated = await api.updateWord(word.id, word);
    setWordMap((prev) => {
      const next = new Map(prev);
      next.set(updated.id, updated);
      return next;
    });
    onUpdated?.();
  };

  if (!isOpen || !rootWord) return null;

  return (
    <div className="word-tree-modal" role="dialog" aria-modal="true">
      <div className="word-tree-backdrop" onClick={onClose} />
      <div className="word-tree-content">
        <div className="word-tree-header">
          <div className="word-tree-title">Word Details</div>
          <button type="button" className="word-tree-close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="word-tree-body">
          <WordNode key={rootWord.id} word={rootWord} wordMap={wordMap} onUpdate={handleUpdate} />
        </div>
      </div>
    </div>
  );
}

interface WordNodeProps {
  word: Word & { id: string };
  wordMap: Map<string, Word & { id: string }>;
  onUpdate: (word: Word) => Promise<void>;
}

function WordNode({ word, wordMap, onUpdate }: WordNodeProps) {
  const [isEditing, setIsEditing] = useState(false);

  const siblingIds = (word.siblingIds ?? []).map((id) => String(id)).filter((id) => id !== word.id);
  const childIds = (word.childrenIds ?? []).map((id) => String(id)).filter((id) => id !== word.id);
  const siblings = siblingIds
    .map((id) => wordMap.get(id))
    .filter((entry): entry is Word & { id: string } => Boolean(entry));
  const children = childIds
    .map((id) => wordMap.get(id))
    .filter((entry): entry is Word & { id: string } => Boolean(entry));

  return (
    <div className="word-node">
      <div className="word-card">
        <div className="word-card-header">
          <div>
            <div className="word-card-title">{word.spelling.map((s) => s.text).join(' / ')}</div>
            <div className="word-card-pronunciation">{word.pronunciation}</div>
          </div>
          {!isEditing && (
            <button type="button" className="btn-secondary" onClick={() => setIsEditing(true)}>
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <WordForm
            initialWord={word}
            onSubmit={async (next) => {
              await onUpdate(next);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="word-card-body">
            {word.derivation && <div className="word-card-derivation">{word.derivation}</div>}
            <div className="word-card-definitions">
              {word.definition.map((def, index) => (
                <div key={`${word.id}-def-${index}`} className="word-card-definition">
                  {def}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isEditing && (siblings.length > 0 || children.length > 0) && (
        <div className="word-relations">
          {siblings.length > 0 && (
            <div className="relation-group">
              <div className="relation-title">Siblings</div>
              <div className="relation-grid">
                {siblings.map((sibling) => (
                  <WordNode key={sibling.id} word={sibling} wordMap={wordMap} onUpdate={onUpdate} />
                ))}
              </div>
            </div>
          )}

          {children.length > 0 && (
            <div className="relation-group">
              <div className="relation-title">Children</div>
              <div className="relation-grid">
                {children.map((child) => (
                  <WordNode key={child.id} word={child} wordMap={wordMap} onUpdate={onUpdate} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
