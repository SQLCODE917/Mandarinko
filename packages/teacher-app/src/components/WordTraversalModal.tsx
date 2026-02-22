import type { ReactNode } from 'react';
import type { Word } from '@mandarinko/core';
import { WordForm } from './WordForm';
import { useWordTraversal } from '../hooks/useWordTraversal';
import type {
  EngineCallbacks,
  NullWord,
  RelationViewModel,
  ViewModel,
} from '../domain/wordTraversalEngine';
import './WordTreeModal.css';

interface WordTraversalModalProps {
  isOpen: boolean;
  rootWordId: string | null;
  words: (Word & { id: string })[];
  callbacks: EngineCallbacks;
}

export function WordTraversalModal({
  isOpen,
  rootWordId,
  words,
  callbacks,
}: WordTraversalModalProps) {
  const { viewModel } = useWordTraversal({
    isOpen,
    rootWordId,
    words,
    callbacks,
  });

  if (!isOpen || !viewModel) return null;

  const { current, children, siblings } = viewModel;
  const isAuthoring = current.mode !== 'view';

  return (
    <div className="word-tree-modal" role="dialog" aria-modal="true">
      <div className="word-tree-backdrop" onClick={current.onClose} />
      <div className="word-tree-content">
        <div className="word-tree-header">
          <div className="word-tree-title">Word Details</div>
          <button type="button" className="word-tree-close" onClick={current.onClose}>
            Close
          </button>
        </div>
        <div className="word-tree-body">
          {isAuthoring ? (
            <WordAuthoringCard current={current} />
          ) : (
            <WordViewerCard
              word={current.word}
              showEdit
              onEdit={current.onEdit}
              showRemove={false}
            />
          )}

          {(siblings.length > 0 || children.length > 0) && (
            <div className="word-relations">
              {siblings.length > 0 && (
                <RelationGroup
                  title="Siblings"
                  items={siblings}
                  showRemove={isAuthoring}
                  showDescendants={false}
                />
              )}
              {children.length > 0 && (
                <RelationGroup
                  title="Children"
                  items={children}
                  showRemove={isAuthoring}
                  showDescendants
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type CurrentViewModel = ViewModel['current'];

function WordAuthoringCard({ current }: { current: CurrentViewModel }) {
  const word = current.word as Word & { id?: string };
  const canReuse = current.mode === 'create';

  return (
    <div className="word-node">
      <div className="word-card">
        <div className="word-card-header">
          <div>
            <div className="word-card-title">
              {word.spelling?.map((s) => s.text).join(' / ') || 'New Word'}
            </div>
            <div className="word-card-pronunciation">{word.pronunciation}</div>
          </div>
        </div>

        <WordForm
          initialWord={{ ...word, id: isNullWord(word) ? undefined : word.id }}
          onSubmit={(next) => current.onSave(next)}
          onCancel={() => {}}
          showCancel={false}
          resetKey={word.id ?? 'new'}
          onCreateChild={current.onAddChild}
          onCreateSibling={current.onAddSibling}
          enableReusePrompt={canReuse}
          onReuseExisting={(existing) => current.onReuseExisting(existing)}
          showRelationshipFields={false}
        />
      </div>
    </div>
  );
}

type RelationItem = {
  id: RelationViewModel['id'];
  word: RelationViewModel['word'];
  onEdit: RelationViewModel['onEdit'];
  onRemove: RelationViewModel['onRemove'];
  canRemove: RelationViewModel['canRemove'];
  children: RelationViewModel['children'];
};

function RelationGroup({
  title,
  items,
  showRemove,
  showDescendants,
}: {
  title: string;
  items: RelationItem[];
  showRemove: boolean;
  showDescendants: boolean;
}) {
  return (
    <div className="relation-group">
      <div className="relation-title">{title}</div>
      <div className="relation-grid">
        {items.map((item) => (
          <WordViewerCard
            key={item.id}
            word={item.word}
            showEdit
            onEdit={item.onEdit}
            showRemove={showRemove && item.canRemove}
            onRemove={item.onRemove}
          >
            {showDescendants && item.children.length > 0 && (
              <div className="word-relations">
                <RelationGroup
                  title="Children"
                  items={item.children}
                  showRemove={showRemove}
                  showDescendants
                />
              </div>
            )}
          </WordViewerCard>
        ))}
      </div>
    </div>
  );
}

function WordViewerCard({
  word,
  showEdit,
  onEdit,
  showRemove,
  onRemove,
  children,
}: {
  word: Word & { id?: string };
  showEdit?: boolean;
  onEdit?: () => void;
  showRemove?: boolean;
  onRemove?: () => Promise<void>;
  children?: ReactNode;
}) {
  return (
    <div className="word-node">
      <div className="word-card">
        <div className="word-card-header">
          <div>
            <div className="word-card-title">
              {word.spelling?.map((s) => s.text).join(' / ') || 'Word'}
            </div>
            <div className="word-card-pronunciation">{word.pronunciation}</div>
          </div>
          <div className="word-card-actions">
            {showEdit && (
              <button type="button" className="btn-secondary" onClick={onEdit}>
                Edit
              </button>
            )}
            {showRemove && (
              <button
                type="button"
                className="btn-remove-field"
                onClick={() => void onRemove?.()}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="word-card-body">
          {word.derivation && <div className="word-card-derivation">{word.derivation}</div>}
          <div className="word-card-definitions">
            {word.definition?.map((def, index) => (
              <div key={`${word.id ?? 'word'}-def-${index}`} className="word-card-definition">
                {def}
              </div>
            ))}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function isNullWord(word: Word & { id?: string }): word is NullWord {
  return Boolean((word as NullWord).isNull);
}
