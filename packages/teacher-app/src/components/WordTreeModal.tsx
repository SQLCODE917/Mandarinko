import type { Word } from '@mandarinko/core';
import { WordForm } from './WordForm';
import { useWordTree, type TreeNode, type WordInput } from '../hooks/useWordTree';
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
  } = useWordTree({ isOpen, rootWordId, words, onUpdated });

  if (!isOpen || !rootNode) return null;

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
          <WordNode
            node={rootNode}
            nodes={nodes}
            rootId={rootId}
            allNodesSaved={allNodesSaved}
            resolveWordLabel={resolveWordLabel}
            onEdit={editNode}
            onCancelEdit={cancelEdit}
            onSave={saveNode}
            onAddChild={addChild}
            onAddSibling={addSibling}
            onReuseExisting={reuseExisting}
          />
        </div>
      </div>
    </div>
  );
}

interface WordNodeProps {
  node: TreeNode;
  nodes: Map<string, TreeNode>;
  rootId: string | null;
  allNodesSaved: boolean;
  resolveWordLabel: (id: string) => string;
  onEdit: (id: string) => void;
  onCancelEdit: (id: string) => void;
  onSave: (id: string, word: WordInput) => Promise<void>;
  onAddChild: (id: string) => void;
  onAddSibling: (id: string) => void;
  onReuseExisting: (nodeId: string, word: Word & { id: string }) => void;
}

const normalizeIds = (ids?: Array<string | number>) =>
  (ids ?? []).map((id) => String(id)).filter((id) => id.length > 0);

function WordNode({
  node,
  nodes,
  rootId,
  allNodesSaved,
  resolveWordLabel,
  onEdit,
  onCancelEdit,
  onSave,
  onAddChild,
  onAddSibling,
  onReuseExisting,
}: WordNodeProps) {
  const word = node.word;
  const siblingIds = normalizeIds(word.siblingIds).filter((id) => id !== node.id);
  const childIds = normalizeIds(word.childrenIds).filter((id) => id !== node.id);
  const siblings = siblingIds
    .map((id) => nodes.get(id))
    .filter((entry): entry is TreeNode => Boolean(entry));
  const children = childIds
    .map((id) => nodes.get(id))
    .filter((entry): entry is TreeNode => Boolean(entry));

  const rootBlocked = node.id === rootId && !allNodesSaved;

  return (
    <div className="word-node" data-testid={`word-node-${node.id}`}>
      <div className="word-card">
        <div className="word-card-header">
          <div>
            <div className="word-card-title">
              {word.spelling?.map((s) => s.text).join(' / ') || 'New Word'}
            </div>
            <div className="word-card-pronunciation">{word.pronunciation}</div>
          </div>
          {!node.isEditing && (
            <button type="button" className="btn-secondary" onClick={() => onEdit(node.id)}>
              Edit
            </button>
          )}
        </div>

        {node.error && <div className="field-error">{node.error}</div>}
        {rootBlocked && (
          <div className="word-card-subtle">Save all related words before saving the root.</div>
        )}

        {node.isEditing ? (
          <WordForm
            initialWord={{ ...word, id: node.status === 'saved' ? node.id : undefined }}
            resolveWordLabel={resolveWordLabel}
            onCreateChild={() => onAddChild(node.id)}
            onCreateSibling={() => onAddSibling(node.id)}
            submitDisabled={rootBlocked}
            onSubmit={(next) => onSave(node.id, next)}
            onCancel={() => onCancelEdit(node.id)}
            resetKey={node.id}
            enableReusePrompt
            onReuseExisting={(existing) => onReuseExisting(node.id, existing)}
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
              <button type="button" className="btn-secondary" onClick={() => onAddChild(node.id)}>
                Add Child
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onAddSibling(node.id)}
              >
                Add Sibling
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
                  <WordNode
                    key={sibling.id}
                    node={sibling}
                    nodes={nodes}
                    rootId={rootId}
                    allNodesSaved={allNodesSaved}
                    resolveWordLabel={resolveWordLabel}
                    onEdit={onEdit}
                    onCancelEdit={onCancelEdit}
                    onSave={onSave}
                    onAddChild={onAddChild}
                    onAddSibling={onAddSibling}
                    onReuseExisting={onReuseExisting}
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
                  <WordNode
                    key={child.id}
                    node={child}
                    nodes={nodes}
                    rootId={rootId}
                    allNodesSaved={allNodesSaved}
                    resolveWordLabel={resolveWordLabel}
                    onEdit={onEdit}
                    onCancelEdit={onCancelEdit}
                    onSave={onSave}
                    onAddChild={onAddChild}
                    onAddSibling={onAddSibling}
                    onReuseExisting={onReuseExisting}
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
