import { useEffect, useMemo, useRef, useState } from 'react';
import type { Word } from '@mandarinko/core';
import {
  WordTraversalEngine,
  type EngineCallbacks,
  type ViewModel,
} from '../domain/wordTraversalEngine';

type UseWordTraversalParams = {
  isOpen: boolean;
  rootWordId: string | null;
  words: (Word & { id: string })[];
  callbacks: EngineCallbacks;
};

export function useWordTraversal({
  isOpen,
  rootWordId,
  words,
  callbacks,
}: UseWordTraversalParams) {
  const engineRef = useRef<WordTraversalEngine | null>(null);
  const [, forceUpdate] = useState(0);
  const openKeyRef = useRef<string | null>(null);

  if (!engineRef.current) {
    engineRef.current = new WordTraversalEngine(callbacks);
  }

  const engine = engineRef.current;

  useEffect(() => {
    engine.setCallbacks(callbacks);
  }, [engine, callbacks]);

  useEffect(() => {
    const unsubscribe = engine.subscribe(() => forceUpdate((prev) => prev + 1));
    return unsubscribe;
  }, [engine]);

  const initialMode = useMemo(() => (rootWordId ? 'view' : 'create'), [rootWordId]);

  useEffect(() => {
    if (!isOpen) {
      engine.reset();
      openKeyRef.current = null;
      return;
    }

    const nextKey = JSON.stringify({ rootWordId, initialMode });
    if (openKeyRef.current !== nextKey) {
      engine.open(rootWordId, words, initialMode);
      openKeyRef.current = nextKey;
      return;
    }

    engine.updateVocabulary(words);
  }, [engine, initialMode, isOpen, rootWordId, words]);

  const viewModel = engine.getViewModel() as ViewModel | null;

  return { viewModel };
}
