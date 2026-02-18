import type { Word } from '@mandarinko/core';
import './WordTreeModal.css';

interface WordViewerModalProps {
  isOpen: boolean;
  rootWordId: string | null;
  words: (Word & { id: string })[];
  onClose: () => void;
  onEdit?: (word: Word & { id: string }) => void;
}

const normalizeIds = (ids?: Array<string | number>) =>
  (ids ?? []).map((id) => String(id)).filter((id) => id.length > 0);

export function WordViewerModal({
  isOpen,
  rootWordId,
  words,
  onClose,
  onEdit,
}: WordViewerModalProps) {
  if (!isOpen || !rootWordId) return null;
  const wordMap = new Map(words.map((word) => [word.id, word]));
  const rootWord = wordMap.get(rootWordId);
  if (!rootWord) return null;

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
          <WordViewerNode
            word={rootWord}
            wordMap={wordMap}
            isRoot
            onEdit={onEdit}
          />
        </div>
      </div>
    </div>
  );
}

interface WordViewerNodeProps {
  word: Word & { id: string };
  wordMap: Map<string, Word & { id: string }>;
  isRoot?: boolean;
  onEdit?: (word: Word & { id: string }) => void;
}

function WordViewerNode({ word, wordMap, isRoot = false, onEdit }: WordViewerNodeProps) {
  const siblingIds = normalizeIds(word.siblingIds).filter((id) => id !== word.id);
  const childIds = normalizeIds(word.childrenIds).filter((id) => id !== word.id);
  const siblings = siblingIds
    .map((id) => wordMap.get(id))
    .filter((entry): entry is Word & { id: string } => Boolean(entry));
  const children = childIds
    .map((id) => wordMap.get(id))
    .filter((entry): entry is Word & { id: string } => Boolean(entry));

  return (
    <div className="word-node" data-testid={`word-node-${word.id}`}>
      <div className="word-card">
        <div className="word-card-header">
          <div>
            <div className="word-card-title">
              {word.spelling?.map((s) => s.text).join(' / ') || 'Word'}
            </div>
            <div className="word-card-pronunciation">{word.pronunciation}</div>
          </div>
          {isRoot && onEdit && (
            <button type="button" className="btn-secondary" onClick={() => onEdit(word)}>
              Edit
            </button>
          )}
        </div>

        <div className="word-card-body">
          {word.derivation && <div className="word-card-derivation">{word.derivation}</div>}
          <div className="word-card-definitions">
            {word.definition?.map((def, index) => (
              <div key={`${word.id}-def-${index}`} className="word-card-definition">
                {def}
              </div>
            ))}
          </div>
        </div>
      </div>

      {(siblings.length > 0 || children.length > 0) && (
        <div className="word-relations">
          {siblings.length > 0 && (
            <div className="relation-group">
              <div className="relation-title">Siblings</div>
              <div className="relation-grid">
                {siblings.map((sibling) => (
                  <WordViewerNode key={sibling.id} word={sibling} wordMap={wordMap} />
                ))}
              </div>
            </div>
          )}

          {children.length > 0 && (
            <div className="relation-group">
              <div className="relation-title">Children</div>
              <div className="relation-grid">
                {children.map((child) => (
                  <WordViewerNode key={child.id} word={child} wordMap={wordMap} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
