export interface EditorDraftStore {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

// Resolve localStorage lazily: browsers may deny access or run out of quota.
export const browserEditorDrafts: EditorDraftStore = {
  read: (key) => window.localStorage.getItem(`mandarinko:editor:v1:${key}`),
  write: (key, value) => window.localStorage.setItem(`mandarinko:editor:v1:${key}`, value),
  remove: (key) => window.localStorage.removeItem(`mandarinko:editor:v1:${key}`),
};

/** Resolve a local deep link even when editing began from a related details card. */
export function findBrowserEditorWorkspace(workspaceId: string): string | undefined {
  const prefix = 'mandarinko:editor:v1:';
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      try {
        const saved = JSON.parse(window.localStorage.getItem(key) ?? 'null');
        if (saved?.version === 2 && saved.workspaceId === workspaceId)
          return key.slice(prefix.length);
      } catch {
        /* Other drafts may be unreadable; their own editor reports that. */
      }
    }
  } catch {
    /* Storage access failure is reported by the session. */
  }
}
