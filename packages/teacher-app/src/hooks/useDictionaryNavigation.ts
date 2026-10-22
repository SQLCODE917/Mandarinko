import { useCallback } from 'react';
import { navigateHref, useBrowserLocation } from './useBrowserLocation';
import {
  dictionaryHref,
  readDictionaryLocation,
  type DictionaryDestination,
} from '../domain/dictionaryLocation';

function navigate(destination: DictionaryDestination, replace = false) {
  const href = dictionaryHref(window.location.href, destination);
  navigateHref(href, replace);
}

export function useDictionaryNavigation() {
  const href = useBrowserLocation();
  const openWord = useCallback((wordId: string) => navigate({ kind: 'word', wordId }), []);
  const openCreate = useCallback(() => navigate({ kind: 'create' }), []);
  const close = useCallback(() => navigate({ kind: 'closed' }), []);
  const replaceWord = useCallback((wordId: string) => navigate({ kind: 'word', wordId }, true), []);
  const hrefForWord = useCallback(
    (wordId: string) => dictionaryHref(href, { kind: 'word', wordId }),
    [href]
  );
  return {
    location: readDictionaryLocation(href),
    openWord,
    openCreate,
    close,
    replaceWord,
    hrefForWord,
  };
}
