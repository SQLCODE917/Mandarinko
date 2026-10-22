import { useSyncExternalStore } from 'react';

const navigationEvent = 'mandarinko:dictionary-navigation';
function subscribe(notify: () => void) {
  window.addEventListener('popstate', notify);
  window.addEventListener(navigationEvent, notify);
  return () => {
    window.removeEventListener('popstate', notify);
    window.removeEventListener(navigationEvent, notify);
  };
}
export const useBrowserLocation = () => useSyncExternalStore(subscribe, () => window.location.href);
export function navigateHref(href: string, replace = false) {
  if (new URL(href, window.location.href).href === window.location.href) return;
  if (replace) window.history.replaceState(null, '', href);
  else window.history.pushState(null, '', href);
  window.dispatchEvent(new Event(navigationEvent));
}
