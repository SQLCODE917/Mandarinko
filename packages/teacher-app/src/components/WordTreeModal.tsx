import { useEffect, useMemo, useRef, useState } from 'react';
import type { Word } from '@mandarinko/core';
import { WordForm } from './WordForm';
import * as api from '../services/api';
import './WordTreeModal.css';

type WordInput = Omit<Word, 'id'> & { id?: string };
type NodeStatus = 'draft' | 'saved' | 'saving';

type TreeNode = {
  id: string;
  word: WordInput;
  status: NodeStatus;
  isEditing: boolean;
  error?: string;
};

interface WordTreeModalProps {
  isOpen: boolean;
  rootWordId: string | null;
  words: (Word & { id: string })[];
  onClose: () => void;
  onUpdated?: () => void;
}

const EMPTY_WORD: WordInput = {
  spelling: [{ language: 'zh-Hans', text: '' }],
  pronunciation: '',
  definition: [''],
};

const normalizeIds = (ids?: Array<string | number>) =>
  (ids ?? []).map((id) => String(id)).filter((id) => id.length > 0);

const normalizeWordInput = (word: WordInput): WordInput => ({
  ...word,
  spelling: word.spelling ?? [{ language: 'zh-Hans', text: '' }],
  pronunciation: word.pronunciation ?? '',
  definition: word.definition ?? [''],
  childrenIds: word.childrenIds ? normalizeIds(word.childrenIds) : undefined,
  siblingIds: word.siblingIds ? normalizeIds(word.siblingIds) : undefined,
});

const wordToNode = (word: Word & { id: string }): TreeNode => ({
  id: word.id,
  word: normalizeWordInput(word),
  status: 'saved',
  isEditing: false,
});

export function WordTreeModal({
  isOpen,
  rootWordId,
  words,
  onClose,
  onUpdated,
}: WordTreeModalProps) {
  const [nodes, setNodes] = useState<Map<string, TreeNode>>(new Map());
  const [rootId, setRootId] = useState<string | null>(null);
  const tempCounter = useRef(0);
  const initializedRef = useRef(false);

  const nextTempId = () => {
    tempCounter.current += 1;
    return `temp-${tempCounter.current}`;
  };

  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;
    const nextNodes = new Map<string, TreeNode>();
    words.forEach((word) => {
      nextNodes.set(word.id, wordToNode(word));
    });

    if (rootWordId && nextNodes.has(rootWordId)) {
      setRootId(rootWordId);
    } else {
      const tempId = nextTempId();
      nextNodes.set(tempId, {
        id: tempId,
        word: { ...EMPTY_WORD },
        status: 'draft',
        isEditing: true,
      });
      setRootId(tempId);
    }

    setNodes(nextNodes);
  }, [isOpen, rootWordId, words]);

  const rootNode = useMemo(() => {
    if (!rootId) return null;
    return nodes.get(rootId) ?? null;
  }, [nodes, rootId]);

  const resolveWordLabel = useMemo(
    () => (id: string) =>
      nodes
        .get(id)
        ?.word.spelling?.map((s) => s.text)
        .join(' / ') ?? id,
    [nodes]
  );

  const allNodesSaved = useMemo(() => {
    if (!rootId) return false;
    for (const node of nodes.values()) {
      if (node.id === rootId) continue;
      if (node.status !== 'saved') return false;
    }
    return true;
  }, [nodes, rootId]);

  const relationsSaved = (word: WordInput) => {
    const relationIds = [
      ...(word.childrenIds ?? []),
      ...(word.siblingIds ?? []),
    ].map((id) => String(id));
    return relationIds.every((id) => nodes.get(id)?.status === 'saved');
  };

  const updateNode = (id: string, updater: (node: TreeNode) => TreeNode) => {
    setNodes((prev) => {
      const next = new Map(prev);
      const current = next.get(id);
      if (!current) return prev;
      next.set(id, updater(current));
      return next;
    });
  };

  const replaceNodeId = (oldId: string, newId: string, updatedWord: Word) => {
    setNodes((prev) => {
      const next = new Map<string, TreeNode>();
      prev.forEach((node, id) => {
        const mappedId = id === oldId ? newId : id;
        const nextWord = normalizeWordInput({
          ...node.word,
          childrenIds: node.word.childrenIds?.map((rid) => (rid === oldId ? newId : rid)),
          siblingIds: node.word.siblingIds?.map((rid) => (rid === oldId ? newId : rid)),
        });
        next.set(mappedId, {
          ...node,
          id: mappedId,
          word: id === oldId ? normalizeWordInput(updatedWord) : nextWord,
          status: id === oldId ? 'saved' : node.status,
          isEditing: id === oldId ? false : node.isEditing,
          error: id === oldId ? undefined : node.error,
        });
      });
      return next;
    });
    if (rootId === oldId) setRootId(newId);
  };

  const addDraftNode = (seed?: Partial<WordInput>) => {
    const tempId = nextTempId();
    const node: TreeNode = {
      id: tempId,
      word: normalizeWordInput({ ...EMPTY_WORD, ...seed }),
      status: 'draft',
      isEditing: true,
    };
    setNodes((prev) => new Map(prev).set(tempId, node));
    return tempId;
  };

  const addChild = (parentId: string) => {
    const childId = addDraftNode();
    updateNode(parentId, (node) => ({
      ...node,
      word: {
        ...node.word,
        childrenIds: [...normalizeIds(node.word.childrenIds), childId],
      },
    }));
  };

  const addSibling = (nodeId: string) => {
    const siblingId = addDraftNode();
    updateNode(nodeId, (node) => ({
      ...node,
      word: {
        ...node.word,
        siblingIds: [...normalizeIds(node.word.siblingIds), siblingId],
      },
    }));
  };

  const handleSave = async (nodeId: string, payload: WordInput) => {
    const node = nodes.get(nodeId);
    if (!node) return;
    const normalized = normalizeWordInput(payload);
    if (!relationsSaved(normalized)) {
      updateNode(nodeId, (current) => ({
        ...current,
        error: 'Save related words first before saving this word.',
      }));
      return;
    }

    updateNode(nodeId, (current) => ({ ...current, status: 'saving', error: undefined }));

    try {
      if (node.status === 'saved') {
        const updated = await api.updateWord(nodeId, normalized as Word);
        updateNode(nodeId, (current) => ({
          ...current,
          status: 'saved',
          isEditing: false,
          word: normalizeWordInput(updated),
        }));
      } else {
        const { id: _ignored, ...createPayload } = normalized;
        const created = await api.createWord(createPayload);
        replaceNodeId(nodeId, created.id, created);
      }
      onUpdated?.();
    } catch (err) {
      updateNode(nodeId, (current) => ({
        ...current,
        status: node.status === 'saved' ? 'saved' : 'draft',
        error: err instanceof Error ? err.message : 'Failed to save word',
      }));
    }
  };

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
            onEdit={(id) => updateNode(id, (node) => ({ ...node, isEditing: true }))}
            onCancelEdit={(id) => updateNode(id, (node) => ({ ...node, isEditing: false }))}
            onSave={async (id, next) => handleSave(id, next)}
            onAddChild={addChild}
            onAddSibling={addSibling}
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
}

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
              <button type="button" className="btn-secondary" onClick={() => onAddSibling(node.id)}>
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
