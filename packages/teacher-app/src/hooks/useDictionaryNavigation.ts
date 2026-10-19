import { useCallback, useSyncExternalStore } from 'react';
import {
  dictionaryHref,
  readDictionaryLocation,
  type DictionaryDestination,
} from '../domain/dictionaryLocation';

const navigationEvent = 'mandarinko:dictionary-navigation';

function subscribe(notify: () => void) {
  window.addEventListener('popstate', notify);
  window.addEventListener(navigationEvent, notify);
  return () => {
    window.removeEventListener('popstate', notify);
    window.removeEventListener(navigationEvent, notify);
  };
}

const currentHref = () => window.location.href;

function navigate(destination: DictionaryDestination, replace = false) {
  const href = dictionaryHref(window.location.href, destination);
  if (new URL(href, window.location.href).href === window.location.href) return;
  if (replace) window.history.replaceState(null, '', href);
  else window.history.pushState(null, '', href);
  // pushState/replaceState do not dispatch popstate; notify React's location subscription.
  window.dispatchEvent(new Event(navigationEvent));
}

export function useDictionaryNavigation() {
  const href = useSyncExternalStore(subscribe, currentHref);
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
