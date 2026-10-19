import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { Word } from '@mandarinko/core';
import { WordEditor, type WordEditorHandle } from './WordEditor';
import { WordEntry } from './WordEntry';
import type { DerivationNavigation } from './DerivationText';
import type { DictionaryLocation } from '../domain/dictionaryLocation';
import { useWordTraversal } from '../hooks/useWordTraversal';
import type { EngineCallbacks, NullWord, RelationViewModel } from '../domain/wordTraversalEngine';
import './WordTreeModal.css';

interface WordTraversalModalProps {
  location: DictionaryLocation;
  loading: boolean;
  words: (Word & { id: string })[];
  callbacks: EngineCallbacks;
  navigation: DerivationNavigation;
  onDismiss: () => void;
  onCreated: (wordId: string) => void;
}

export function WordTraversalModal({
  location,
  loading,
  words,
  callbacks,
  navigation,
  onDismiss,
  onCreated,
}: WordTraversalModalProps) {
  const rootWordId = location.kind === 'word' ? location.wordId : null;
  const knownWord = location.kind === 'word' && words.some((word) => word.id === rootWordId);
  const ready = location.kind === 'create' || Boolean(knownWord);
  const isOpen = location.kind !== 'closed';
  const editorRef = useRef<WordEditorHandle>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const { viewModel } = useWordTraversal({ isOpen: ready, rootWordId, words, callbacks });
  const current = viewModel?.current;
  const isAuthoring = Boolean(current && current.mode !== 'view');

  useLayoutEffect(() => {
    if (isOpen && !isAuthoring) titleRef.current?.focus({ preventScroll: true });
  }, [isOpen, rootWordId, isAuthoring]);

  if (!isOpen) return null;

  const close = async () => {
    if (isAuthoring && editorRef.current) {
      const editor = editorRef.current;
      const savedId = await editor.finish();
      if (editorRef.current !== editor) return;
      if (savedId === false) return;
      if (location.kind === 'create' && savedId) onCreated(savedId);
      else if (current?.mode === 'edit') current.onClose();
      else onDismiss();
    } else onDismiss();
  };
  const error =
    location.kind === 'invalid'
      ? location.message
      : location.kind === 'word' && !knownWord && !loading
        ? `No dictionary entry exists for word ID “${location.wordId}”.`
        : null;
  const links = isAuthoring ? undefined : navigation;

  return (
    <div
      className="word-tree-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-tree-title"
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          void close();
        }
        if (event.key === 'Tab') {
          const fields = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), textarea, input, select, summary, a[href]'
            ),
          ].filter((element) => element.getClientRects().length > 0);
          const first = fields[0];
          const last = fields[fields.length - 1];
          if (
            (!event.shiftKey && document.activeElement === last) ||
            (event.shiftKey &&
              (document.activeElement === first || document.activeElement === titleRef.current))
          ) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
          }
        }
      }}
    >
      <div className="word-tree-backdrop" onClick={() => void close()} />
      <div className={`word-tree-content${isAuthoring ? ' is-authoring' : ''}`}>
        <div className="word-tree-header">
          <div className="word-tree-title" id="word-tree-title" tabIndex={-1} ref={titleRef}>
            {isAuthoring ? 'Word editor' : 'Word details'}
          </div>
          <button type="button" className="word-tree-close" onClick={() => void close()}>
            Close
          </button>
        </div>
        <div className="word-tree-body">
          {error ? (
            <p role="alert">{error}</p>
          ) : !viewModel ? (
            <p role="status">Loading vocabulary…</p>
          ) : (
            <>
              {isAuthoring ? (
                <WordEditor
                  ref={editorRef}
                  words={words}
                  callbacks={callbacks}
                  word={isNullWord(viewModel.current.word) ? undefined : viewModel.current.word}
                />
              ) : (
                <WordViewerCard
                  word={viewModel.current.word}
                  navigation={links}
                  showEdit
                  onEdit={viewModel.current.onEdit}
                  showRemove={false}
                />
              )}
              {!isAuthoring && (viewModel.siblings.length > 0 || viewModel.children.length > 0) && (
                <div className="word-relations">
                  {viewModel.siblings.length > 0 && (
                    <RelationGroup
                      title="Siblings"
                      items={viewModel.siblings}
                      navigation={links}
                      showRemove={isAuthoring}
                      showDescendants={false}
                    />
                  )}
                  {viewModel.children.length > 0 && (
                    <RelationGroup
                      title="Children"
                      items={viewModel.children}
                      navigation={links}
                      showRemove={isAuthoring}
                      showDescendants
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
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
  navigation,
  showRemove,
  showDescendants,
}: {
  title: string;
  items: RelationItem[];
  navigation?: DerivationNavigation;
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
            navigation={navigation}
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
                  navigation={navigation}
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
  navigation,
  showEdit,
  onEdit,
  showRemove,
  onRemove,
  children,
}: {
  word: Word & { id?: string };
  navigation?: DerivationNavigation;
  showEdit?: boolean;
  onEdit?: () => void;
  showRemove?: boolean;
  onRemove?: () => Promise<void>;
  children?: ReactNode;
}) {
  return (
    <div className="word-node">
      <div className="word-card">
        <WordEntry word={word} navigation={navigation} />
        <div className="word-card-actions">
          {showEdit && (
            <button type="button" className="btn-secondary" onClick={onEdit}>
              Edit
            </button>
          )}
          {showRemove && (
            <button type="button" className="btn-remove-field" onClick={() => void onRemove?.()}>
              Remove
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function isNullWord(word: Word & { id?: string }): word is NullWord {
  return Boolean((word as NullWord).isNull);
}
