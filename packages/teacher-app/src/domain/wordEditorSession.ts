import { ValidationService, type Word } from '@mandarinko/core';
import type { EngineCallbacks } from './wordTraversalEngine';

export type EditorRow = {
  key: number;
  relation: 'root' | 'child' | 'sibling';
  id?: string;
  word: Omit<Word, 'id'>;
  saved: string;
  committed?: Omit<Word, 'id'>;
  message: string;
  matches: Word[];
};

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const input = ({ id: _id, ...word }: Word): Omit<Word, 'id'> => copy(word);
const empty = (): Omit<Word, 'id'> => ({
  spelling: [{ language: 'zh-Hans', text: '' }],
  pronunciation: '',
  definition: [''],
});
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Editor-owned drafts and a single ordered write queue. Server responses never replace active text. */
export class WordEditorSession {
  rows: EditorRow[] = [];
  error = '';
  saving = false;
  private listeners = new Set<() => void>();
  private sequence = 0;
  private unlinked = new Set<number>();
  private queue: Promise<void> = Promise.resolve();
  private vocabulary: Map<string, Word>;
  private linked = { childrenIds: [] as string[], siblingIds: [] as string[] };

  constructor(
    word: Word | undefined,
    words: Word[],
    private api: EngineCallbacks
  ) {
    this.vocabulary = new Map(words.map((entry) => [entry.id, copy(entry)]));
    this.addRow('root', word);
    if (word) this.loadRelations(word);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  private loadRelations(word: Word) {
    this.linked = {
      childrenIds: [...(word.childrenIds ?? [])],
      siblingIds: [...(word.siblingIds ?? [])],
    };
    for (const [relation, ids] of [
      ['child', word.childrenIds],
      ['sibling', word.siblingIds],
    ] as const) {
      for (const id of ids ?? []) {
        const entry = this.vocabulary.get(id);
        if (
          entry &&
          id !== word.id &&
          !this.rows.some((row) => row.relation === relation && row.id === id)
        )
          this.addRow(relation, entry);
      }
    }
  }

  addRow(relation: EditorRow['relation'], word?: Word) {
    const value = word ? input(word) : empty();
    const row: EditorRow = {
      key: ++this.sequence,
      relation,
      id: word?.id,
      word: value,
      saved: word ? JSON.stringify(value) : '',
      message: '',
      matches: [],
    };
    this.rows.push(row);
    this.emit();
    return row;
  }

  change(row: EditorRow, patch: Partial<Omit<Word, 'id'>>) {
    for (const other of this.rows) {
      if (other === row || (row.id && other.id === row.id)) {
        other.word = { ...other.word, ...copy(patch) };
      }
    }
    row.message = '';
    row.matches = [];
    this.emit();
  }

  reuse(row: EditorRow, word: Word) {
    if (
      this.rows.some(
        (other) =>
          other !== row &&
          other.id === word.id &&
          (row.relation === 'root' || other.relation === 'root' || other.relation === row.relation)
      )
    ) {
      row.message = 'This word is already here. Remove this draft or enter another character.';
      this.emit();
      return false;
    }
    const shared = this.rows.find((other) => other !== row && other.id === word.id);
    row.id = word.id;
    row.word = shared ? copy(shared.word) : input(word);
    row.saved = shared ? shared.saved : JSON.stringify(row.word);
    row.message = 'Existing word reused';
    row.matches = [];
    if (row.relation === 'root') this.loadRelations(word);
    this.emit();
    return true;
  }

  commit(row: EditorRow, resolve = false) {
    if (resolve && !row.id) {
      const text = row.word.spelling[0]?.text.trim();
      const matches = text
        ? [...this.vocabulary.values()].filter((word) =>
            word.spelling.some((spelling) => spelling.text === text)
          )
        : [];
      if (matches.length === 1 && !this.reuse(row, matches[0])) return this.queue;
      if (matches.length > 1) {
        row.matches = matches;
        row.message = 'Multiple entries match. Choose the word to reuse.';
        this.emit();
        return this.queue;
      }
    }
    row.committed = copy(row.word);
    if (row.id)
      for (const other of this.rows) {
        if (other.id === row.id) other.committed = copy(row.word);
      }
    return this.enqueue();
  }

  private enqueue() {
    this.queue = this.queue.then(async () => {
      if (this.error) return; // Fail visibly; retry only after an explicit user action.
      this.saving = true;
      this.emit();
      try {
        for (const row of this.rows) {
          const value = row.committed;
          if (!value || JSON.stringify(value) === row.saved) continue;
          if (row.matches.length) continue;
          const errors = ValidationService.validateWordInput(value);
          if (errors.length) {
            row.message = errors.map((error) => error.message).join('. ');
            continue;
          }
          const spelling = value.spelling.map((entry) => entry.text.trim());
          if (
            !row.id &&
            [...this.vocabulary.values()].some((word) =>
              word.spelling.some((entry) => spelling.includes(entry.text))
            )
          ) {
            row.message = 'An existing word matches. Leave the character field to reuse it.';
            continue;
          }
          const saved = row.id
            ? await this.api.updateWord(row.id, value)
            : await this.api.createWord(value);
          row.id = saved.id;
          row.saved = JSON.stringify(value);
          for (const other of this.rows) {
            if (other.id === saved.id) other.saved = row.saved;
          }
          this.vocabulary.set(saved.id, copy(saved));
          row.message = '';
        }
        const root = this.rows[0];
        if (root.id) {
          const links = {
            childrenIds: [...this.linked.childrenIds],
            siblingIds: [...this.linked.siblingIds],
          };
          for (const row of this.rows.slice(1)) {
            const ids = row.relation === 'child' ? links.childrenIds : links.siblingIds;
            if (row.id && !ids.includes(row.id)) ids.push(row.id);
          }
          for (const row of this.rows.filter((entry) => this.unlinked.has(entry.key))) {
            const field = row.relation === 'child' ? 'childrenIds' : 'siblingIds';
            links[field] = links[field].filter((id) => id !== row.id);
          }
          if (!same(links, this.linked)) {
            await this.api.updateWord(root.id, links);
            this.linked = links;
            // Relationship writes must also survive the next field save.
            root.word = { ...root.word, ...links };
            if (root.committed) root.committed = { ...root.committed, ...links };
            if (root.saved) root.saved = JSON.stringify({ ...JSON.parse(root.saved), ...links });
          }
        }
        this.rows = this.rows.filter((row) => !this.unlinked.has(row.key));
        this.unlinked.clear();
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not save changes';
      } finally {
        this.saving = false;
        this.emit();
      }
    });
    return this.queue;
  }

  retry() {
    this.error = '';
    return this.enqueue();
  }

  removeDraft(row: EditorRow) {
    if (row.id || this.saving) return;
    this.rows = this.rows.filter((entry) => entry !== row);
    this.emit();
  }

  unlink(row: EditorRow) {
    this.unlinked.add(row.key);
    return this.enqueue();
  }

  async discardUnsaved() {
    await this.queue;
    this.error = '';
    this.unlinked.clear();
    this.rows = this.rows.filter(
      (row) =>
        row.relation === 'root' ||
        (row.id &&
          (row.relation === 'child' ? this.linked.childrenIds : this.linked.siblingIds).includes(
            row.id
          ))
    );
    for (const row of this.rows) {
      row.word = row.saved ? JSON.parse(row.saved) : empty();
      row.committed = undefined;
      row.message = '';
      row.matches = [];
    }
    this.emit();
  }

  get dirty() {
    return this.rows.some(
      (row) => JSON.stringify(row.word) !== row.saved && (row.id || !same(row.word, empty()))
    );
  }

  async finish() {
    for (const row of this.rows) {
      if (!row.id && same(row.word, empty())) continue;
      await this.commit(row, true);
    }
    await this.queue;
    return !this.error && !this.dirty;
  }
}
