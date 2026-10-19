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
