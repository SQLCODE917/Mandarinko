import type { Word } from '@mandarinko/core';
import { WordForm } from './WordForm';
import { useWordTree, type TreeNode, type WordInput } from '../hooks/useWordTree';
import './WordTreeModal.css';

interface WordAuthoringTreeProps {
  rootWordId: string | null;
  words: (Word & { id: string })[];
  onCancel: () => void;
  onRootSaved?: (word: Word & { id: string }) => void;
  onUpdated?: () => void;
  createWord: (word: Omit<Word, 'id'>) => Promise<Word & { id: string }>;
  updateWord: (id: string, updates: Partial<Word>) => Promise<Word & { id: string }>;
}

export function WordAuthoringTree({
  rootWordId,
  words,
  onCancel,
  onRootSaved,
  onUpdated,
  createWord,
  updateWord,
}: WordAuthoringTreeProps) {
  const {
    nodes,
    rootId,
    rootNode,
    resolveWordLabel,
    allNodesSaved,
    addChild,
    addSibling,
    reuseExisting,
    saveNode,
    editNode,
    cancelEdit,
  } = useWordTree({
    isOpen: true,
    rootWordId,
    words,
    onUpdated,
    onRootSaved,
    createWord,
    updateWord,
  });

  if (!rootNode) return null;

  return (
    <div className="word-tree-body">
      <WordAuthoringNode
        node={rootNode}
        nodes={nodes}
        rootId={rootId}
        allNodesSaved={allNodesSaved}
        resolveWordLabel={resolveWordLabel}
        onSave={saveNode}
        onAddChild={addChild}
        onAddSibling={addSibling}
        onReuseExisting={reuseExisting}
        onEdit={editNode}
        onCancelEdit={cancelEdit}
        onCancel={onCancel}
      />
    </div>
  );
}

interface WordAuthoringNodeProps {
  node: TreeNode;
  nodes: Map<string, TreeNode>;
  rootId: string | null;
  allNodesSaved: boolean;
  resolveWordLabel: (id: string) => string;
  onSave: (id: string, word: WordInput) => Promise<void>;
  onAddChild: (id: string) => void;
  onAddSibling: (id: string) => void;
  onReuseExisting: (nodeId: string, word: Word & { id: string }) => void;
  onEdit: (id: string) => void;
  onCancelEdit: (id: string) => void;
  onCancel: () => void;
}

const normalizeIds = (ids?: Array<string | number>) =>
  (ids ?? []).map((id) => String(id)).filter((id) => id.length > 0);

function WordAuthoringNode({
  node,
  nodes,
  rootId,
  allNodesSaved,
  resolveWordLabel,
  onSave,
  onAddChild,
  onAddSibling,
  onReuseExisting,
  onEdit,
  onCancelEdit,
  onCancel,
}: WordAuthoringNodeProps) {
  const word = node.word;
  const siblingIds = normalizeIds(word.siblingIds).filter((id) => id !== node.id);
  const childIds = normalizeIds(word.childrenIds).filter((id) => id !== node.id);
  const siblings = siblingIds
    .map((id) => nodes.get(id))
    .filter((entry): entry is TreeNode => Boolean(entry));
  const children = childIds
    .map((id) => nodes.get(id))
    .filter((entry): entry is TreeNode => Boolean(entry));

  const isRoot = node.id === rootId;
  const rootBlocked = isRoot && !allNodesSaved;
  const shouldEdit = isRoot || node.status === 'draft' || node.isEditing;
  const allowCancel = isRoot || node.status === 'saved';

  return (
    <div className="word-node" data-testid={`authoring-node-${node.id}`}>
      <div className="word-card">
        <div className="word-card-header">
          <div>
            <div className="word-card-title">
              {word.spelling?.map((s) => s.text).join(' / ') || 'New Word'}
            </div>
            <div className="word-card-pronunciation">{word.pronunciation}</div>
          </div>
        </div>

        {node.error && <div className="field-error">{node.error}</div>}
        {rootBlocked && (
          <div className="word-card-subtle">Save all related words before saving the root.</div>
        )}

        {shouldEdit ? (
          <WordForm
            initialWord={{ ...word, id: node.status === 'saved' ? node.id : undefined }}
            resolveWordLabel={resolveWordLabel}
            onCreateChild={() => onAddChild(node.id)}
            onCreateSibling={() => onAddSibling(node.id)}
            submitDisabled={rootBlocked}
            onSubmit={(next) => onSave(node.id, next)}
            onCancel={
              isRoot
                ? onCancel
                : () => {
                    onCancelEdit(node.id);
                  }
            }
            showCancel={allowCancel}
            resetKey={node.id}
            enableReusePrompt
            onReuseExisting={(existing) => onReuseExisting(node.id, existing)}
            showRelationshipFields={false}
          />
        ) : (
          <div className="word-card-body">
            {word.derivation && <div className="word-card-derivation">{word.derivation}</div>}
            <div className="word-card-definitions">
              {word.definition?.map((def, index) => (
                <div key={`${node.id}-def-${index}`} className="word-card-definition">
                  {def}
                </div>
              ))}
            </div>
            <div className="word-card-actions">
              <button type="button" className="btn-secondary" onClick={() => onEdit(node.id)}>
                Edit
              </button>
            </div>
          </div>
        )}
      </div>

      {(siblings.length > 0 || children.length > 0) && (
        <div className="word-relations">
          {siblings.length > 0 && (
            <div className="relation-group">
              <div className="relation-title">Siblings</div>
              <div className="relation-grid">
                {siblings.map((sibling) => (
                  <WordAuthoringNode
                    key={sibling.id}
                    node={sibling}
                    nodes={nodes}
                    rootId={rootId}
                    allNodesSaved={allNodesSaved}
                    resolveWordLabel={resolveWordLabel}
                    onSave={onSave}
                    onAddChild={onAddChild}
                    onAddSibling={onAddSibling}
                    onReuseExisting={onReuseExisting}
                    onEdit={onEdit}
                    onCancelEdit={onCancelEdit}
                    onCancel={onCancel}
                  />
                ))}
              </div>
            </div>
          )}

          {children.length > 0 && (
            <div className="relation-group">
              <div className="relation-title">Children</div>
              <div className="relation-grid">
                {children.map((child) => (
                  <WordAuthoringNode
                    key={child.id}
                    node={child}
                    nodes={nodes}
                    rootId={rootId}
                    allNodesSaved={allNodesSaved}
                    resolveWordLabel={resolveWordLabel}
                    onSave={onSave}
                    onAddChild={onAddChild}
                    onAddSibling={onAddSibling}
                    onReuseExisting={onReuseExisting}
                    onEdit={onEdit}
                    onCancelEdit={onCancelEdit}
                    onCancel={onCancel}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
