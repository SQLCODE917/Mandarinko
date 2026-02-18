import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Word } from '@mandarinko/core';
import * as api from '../services/api';

export type WordInput = Omit<Word, 'id'> & { id?: string };
export type NodeStatus = 'draft' | 'saved' | 'saving';

export type TreeNode = {
  id: string;
  word: WordInput;
  status: NodeStatus;
  isEditing: boolean;
  error?: string;
  parentLinkId?: string;
  siblingLinkId?: string;
};

const createEmptyWord = (): WordInput => ({
  spelling: [{ language: 'zh-Hans', text: '' }],
  pronunciation: '',
  definition: [''],
});

const normalizeIds = (ids?: Array<string | number>) =>
  (ids ?? []).map((id) => String(id)).filter((id) => id.length > 0);

const normalizeWordInput = (word: WordInput): WordInput => ({
  ...word,
  spelling: (word.spelling ?? [{ language: 'zh-Hans', text: '' }]).map((spelling) => ({
    ...spelling,
  })),
  pronunciation: word.pronunciation ?? '',
  definition: (word.definition ?? ['']).map((definition) => definition),
  childrenIds: word.childrenIds ? normalizeIds(word.childrenIds) : undefined,
  siblingIds: word.siblingIds ? normalizeIds(word.siblingIds) : undefined,
});

const wordToNode = (word: Word & { id: string }): TreeNode => ({
  id: word.id,
  word: normalizeWordInput(word),
  status: 'saved',
  isEditing: false,
});

export function useWordTree({
  isOpen,
  rootWordId,
  words,
  onUpdated,
  onRootSaved,
  createWord = api.createWord,
  updateWord = api.updateWord,
}: {
  isOpen: boolean;
  rootWordId: string | null;
  words: (Word & { id: string })[];
  onUpdated?: () => void;
  onRootSaved?: (word: Word & { id: string }) => void;
  createWord?: (word: Omit<Word, 'id'>) => Promise<Word & { id: string }>;
  updateWord?: (id: string, updates: Partial<Word>) => Promise<Word & { id: string }>;
}) {
  const [nodes, setNodes] = useState<Map<string, TreeNode>>(new Map());
  const [rootId, setRootId] = useState<string | null>(null);
  const tempCounter = useRef(0);
  const initKeyRef = useRef<string | null>(null);
  const nodesRef = useRef(nodes);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const nextTempId = useCallback(() => {
    tempCounter.current += 1;
    return `temp-${tempCounter.current}`;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      initKeyRef.current = null;
      tempCounter.current = 0;
      setNodes(new Map());
      setRootId(null);
      return;
    }

    const nextKey = JSON.stringify({
      rootWordId,
      wordIds: words.map((word) => word.id),
    });

    if (initKeyRef.current === nextKey) return;
    initKeyRef.current = nextKey;
    tempCounter.current = 0;

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
        word: createEmptyWord(),
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

  const relationsSaved = useCallback((word: WordInput) => {
    const relationIds = [
      ...(word.childrenIds ?? []),
      ...(word.siblingIds ?? []),
    ].map((id) => String(id));
    return relationIds.every((id) => nodesRef.current.get(id)?.status === 'saved');
  }, []);

  const updateNode = useCallback((id: string, updater: (node: TreeNode) => TreeNode) => {
    setNodes((prev) => {
      const next = new Map(prev);
      const current = next.get(id);
      if (!current) return prev;
      next.set(id, updater(current));
      return next;
    });
  }, []);

  const replaceNodeId = useCallback((oldId: string, newId: string, updatedWord: Word) => {
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
  }, [rootId]);

  const addDraftNode = useCallback((
    seed?: Partial<WordInput>,
    links?: { parentLinkId?: string; siblingLinkId?: string }
  ) => {
    const tempId = nextTempId();
    const node: TreeNode = {
      id: tempId,
      word: normalizeWordInput({ ...createEmptyWord(), ...seed }),
      status: 'draft',
      isEditing: true,
      parentLinkId: links?.parentLinkId,
      siblingLinkId: links?.siblingLinkId,
    };
    setNodes((prev) => new Map(prev).set(tempId, node));
    return tempId;
  }, [nextTempId]);

  const addChild = useCallback((parentId: string) => {
    const childId = addDraftNode(undefined, { parentLinkId: parentId });
    updateNode(parentId, (node) => ({
      ...node,
      word: {
        ...node.word,
        childrenIds: [...normalizeIds(node.word.childrenIds), childId],
      },
    }));
  }, [addDraftNode, updateNode]);

  const addSibling = useCallback((nodeId: string) => {
    const siblingId = addDraftNode(undefined, { siblingLinkId: nodeId });
    updateNode(nodeId, (node) => ({
      ...node,
      word: {
        ...node.word,
        siblingIds: [...normalizeIds(node.word.siblingIds), siblingId],
      },
    }));
  }, [addDraftNode, updateNode]);

  const replaceRelationId = (ids: string[] | undefined, oldId: string, newId: string) => {
    const next = (ids ?? []).map((id) => (id === oldId ? newId : id));
    return Array.from(new Set(next));
  };

  const updateRelationIds = useCallback(async (
    parentId: string,
    field: 'childrenIds' | 'siblingIds',
    oldId: string,
    newId: string
  ) => {
    const parentNode = nodesRef.current.get(parentId);
    if (!parentNode) return;
    const currentIds =
      field === 'childrenIds'
        ? normalizeIds(parentNode.word.childrenIds)
        : normalizeIds(parentNode.word.siblingIds);
    const nextIds = replaceRelationId(currentIds, oldId, newId);

    updateNode(parentId, (node) => ({
      ...node,
      word: {
        ...node.word,
        [field]: nextIds,
      },
    }));

    if (parentNode.status !== 'saved') return;

    try {
      const updated = await updateWord(parentId, { [field]: nextIds } as Partial<Word>);
      updateNode(parentId, (node) => ({
        ...node,
        word: normalizeWordInput(updated),
        error: undefined,
      }));
      onUpdated?.();
    } catch (err) {
      updateNode(parentId, (node) => ({
        ...node,
        error: err instanceof Error ? err.message : 'Failed to update relation',
      }));
    }
  }, [onUpdated, updateNode, updateWord]);

  const reuseExisting = useCallback((nodeId: string, existing: Word & { id: string }) => {
    const node = nodesRef.current.get(nodeId);
    if (!node) return;

    if (node.parentLinkId) {
      void updateRelationIds(node.parentLinkId, 'childrenIds', nodeId, existing.id);
    }

    if (node.siblingLinkId) {
      void updateRelationIds(node.siblingLinkId, 'siblingIds', nodeId, existing.id);
    }

    setNodes((prev) => {
      const next = new Map(prev);
      next.delete(nodeId);
      if (!next.has(existing.id)) {
        next.set(existing.id, wordToNode(existing));
      }
      return next;
    });
  }, [updateRelationIds]);

  const saveNode = useCallback(async (nodeId: string, payload: WordInput) => {
    const node = nodesRef.current.get(nodeId);
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
      const isRoot = nodeId === rootId;
      if (node.status === 'saved') {
        const updated = await updateWord(nodeId, normalized as Word);
        updateNode(nodeId, (current) => ({
          ...current,
          status: 'saved',
          isEditing: false,
          word: normalizeWordInput(updated),
        }));
        if (isRoot) {
          onRootSaved?.(updated);
        }
      } else {
        const { id: _ignored, ...createPayload } = normalized;
        const created = await createWord(createPayload);
        replaceNodeId(nodeId, created.id, created);
        if (node.parentLinkId) {
          await updateRelationIds(node.parentLinkId, 'childrenIds', nodeId, created.id);
        }
        if (isRoot) {
          onRootSaved?.(created);
        }
      }
      onUpdated?.();
    } catch (err) {
      updateNode(nodeId, (current) => ({
        ...current,
        status: node.status === 'saved' ? 'saved' : 'draft',
        error: err instanceof Error ? err.message : 'Failed to save word',
      }));
    }
  }, [
    createWord,
    onRootSaved,
    onUpdated,
    relationsSaved,
    replaceNodeId,
    rootId,
    updateNode,
    updateRelationIds,
    updateWord,
  ]);

  const editNode = useCallback(
    (id: string) => updateNode(id, (node) => ({ ...node, isEditing: true })),
    [updateNode]
  );
  const cancelEdit = useCallback(
    (id: string) => updateNode(id, (node) => ({ ...node, isEditing: false })),
    [updateNode]
  );

  return {
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
  };
}
