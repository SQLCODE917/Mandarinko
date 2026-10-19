import { useLayoutEffect, useReducer, useState } from 'react';
import type { Word } from '@mandarinko/core';
import { WordTraversalEngine, type EngineCallbacks } from '../domain/wordTraversalEngine';

type UseWordTraversalParams = {
  isOpen: boolean;
  rootWordId: string | null;
  words: (Word & { id: string })[];
  callbacks: EngineCallbacks;
};

function createSession({ isOpen, rootWordId, words, callbacks }: UseWordTraversalParams) {
  const engine = new WordTraversalEngine(callbacks);
  if (isOpen) engine.open(rootWordId, words);
  return { isOpen, rootWordId, engine };
}

export function useWordTraversal(params: UseWordTraversalParams) {
  const { isOpen, rootWordId, words, callbacks } = params;
  const [session, setSession] = useState(() => createSession(params));
  const [, forceUpdate] = useReducer((revision: number) => revision + 1, 0);

  // React restarts this render before committing. The dialog DOM stays mounted and
  // never paints the previous selection (or a blank frame) for a new URL.
  if (session.isOpen !== isOpen || session.rootWordId !== rootWordId) {
    setSession(createSession(params));
  }
  const { engine } = session;

  useLayoutEffect(() => engine.subscribe(forceUpdate), [engine]);
  useLayoutEffect(() => {
    engine.setCallbacks(callbacks);
    engine.updateVocabulary(words);
  }, [engine, callbacks, words]);

  return { viewModel: engine.getViewModel() };
}
