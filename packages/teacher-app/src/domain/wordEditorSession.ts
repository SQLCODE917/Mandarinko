import { ValidationService, VocabularySearch, type Word } from '@mandarinko/core';
import { browserEditorDrafts, type EditorDraftStore } from './editorDraftStore';
import {
  transitionEditor,
  type EditorLifecycle,
  type LifecycleEvent,
  type SaveAction,
} from './editorLifecycle';

type WordInput = Omit<Word, 'id'>;
export type EditorCallbacks = {
  createWord: (word: WordInput, requestKey?: string) => Promise<Word>;
  updateWord: (id: string, updates: Partial<Word>) => Promise<Word>;
};
export type EditorRow = {
  key: number;
  relation: 'root' | 'child' | 'sibling';
  id?: string;
  requestKey: string;
  word: WordInput;
  saved?: WordInput;
  committed?: WordInput;
  creation?: WordInput;
  message: string;
  messageKind?: 'status' | 'error';
  matches: Word[];
};
type Links = { childrenIds: string[]; siblingIds: string[] };
type Snapshot = {
  version: 1;
  rows: EditorRow[];
  linked: Links;
  unlinked: number[];
  publish: number[];
  resume?: SaveAction;
  error: string;
};
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const input = ({ id: _id, ...word }: Word): WordInput => copy(word);
const empty = (): WordInput => ({
  spelling: [{ language: 'zh-Hans', text: '' }],
  pronunciation: '',
  definition: [''],
});
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
export const hasWordContent = (word: WordInput) =>
  word.spelling.some((s) => s.text.trim()) ||
  Boolean(word.pronunciation.trim()) ||
  word.definition.some((d) => d.trim()) ||
  Boolean(word.derivation?.trim()) ||
  Object.values(word.metadata ?? {}).some((value) => value !== undefined);
const valid = (word: WordInput) => ValidationService.validateWordInput(word).length === 0;
const diff = (word: WordInput, baseline: WordInput): Partial<Word> =>
  Object.fromEntries(
    Object.entries(word).filter(([key, value]) => !same(value, baseline[key as keyof WordInput]))
  );
function isInput(value: unknown): value is WordInput {
  if (!value || typeof value !== 'object') return false;
  const w = value as WordInput;
  return (
    Array.isArray(w.spelling) &&
    w.spelling.length > 0 &&
    w.spelling.every((s) => s && typeof s.text === 'string' && typeof s.language === 'string') &&
    typeof w.pronunciation === 'string' &&
    Array.isArray(w.definition) &&
    w.definition.every((d) => typeof d === 'string') &&
    (w.derivation === undefined || typeof w.derivation === 'string') &&
    [w.childrenIds, w.siblingIds].every(
      (ids) =>
        ids === undefined || (Array.isArray(ids) && ids.every((id) => typeof id === 'string'))
    ) &&
    (w.metadata === undefined ||
      (w.metadata !== null && typeof w.metadata === 'object' && !Array.isArray(w.metadata))) &&
    ValidationService.validateNoExtraFields(w).length === 0
  );
}
function decode(raw: string): Snapshot {
  const s = JSON.parse(raw) as Snapshot;
  if (
    s?.version !== 1 ||
    !Array.isArray(s.rows) ||
    !s.rows.length ||
    s.rows[0].relation !== 'root' ||
    !s.rows.every(
      (r, i) =>
        Number.isSafeInteger(r.key) &&
        r.key > 0 &&
        (i === 0 || r.relation === 'child' || r.relation === 'sibling') &&
        (r.id === undefined || (typeof r.id === 'string' && r.id.length > 0 && isInput(r.saved))) &&
        typeof r.requestKey === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          r.requestKey
        ) &&
        isInput(r.word) &&
        (r.saved === undefined || isInput(r.saved)) &&
        (r.committed === undefined || isInput(r.committed)) &&
        (r.creation === undefined || (isInput(r.creation) && valid(r.creation)))
    ) ||
    new Set(s.rows.map((r) => r.key)).size !== s.rows.length ||
    !s.linked ||
    ![s.linked.childrenIds, s.linked.siblingIds].every(
      (ids) => Array.isArray(ids) && ids.every((id) => typeof id === 'string')
    ) ||
    ![s.publish, s.unlinked].every(
      (keys) =>
        Array.isArray(keys) &&
        keys.every((key) => Number.isSafeInteger(key) && s.rows.some((r) => r.key === key))
    ) ||
    (s.resume !== undefined && !['autosave', 'finish', 'next'].includes(s.resume)) ||
    typeof s.error !== 'string'
  ) {
    throw new Error('Saved draft is unreadable. Discard it to start again.');
  }
  return s;
}

/** Owns all draft, persistence and exit decisions; React only dispatches user intent. */
export class WordEditorSession {
  rows: EditorRow[] = [];
  lifecycle: EditorLifecycle = { kind: 'open' };
  error = '';
  storageError = '';
  validation = false;
  focusRevision = 0;
  restored = false;
  readonly slot: string;
  readonly isNew: boolean;
  private sequence = 0;
  private listeners = new Set<() => void>();
  private vocabulary: Map<string, Word>;
  private linked: Links = { childrenIds: [], siblingIds: [] };
  private unlinked = new Set<number>();
  private publish = new Set<number>();
  private resume?: SaveAction;
  private unreadable = false;
  private lastStored: string | null = null;
  private work: Promise<void> = Promise.resolve();

  constructor(
    word: Word | undefined,
    words: Word[],
    private api: EditorCallbacks,
    private store: EditorDraftStore = browserEditorDrafts,
    private uuid: () => string = () => crypto.randomUUID()
  ) {
    this.slot = word ? `word:${word.id}` : 'new';
    this.isNew = !word;
    this.vocabulary = new Map(words.map((entry) => [entry.id, copy(entry)]));
    this.add('root', word);
    if (word) this.loadRelations(word);
    try {
      const raw = this.store.read(this.slot);
      this.lastStored = raw;
      if (raw) {
        const draft = decode(raw);
        this.rows = draft.rows.map((row) => ({ ...row, message: '', matches: [] }));
        this.linked = draft.linked;
        this.unlinked = new Set(draft.unlinked);
        this.publish = new Set(draft.publish);
        this.resume = draft.resume;
        this.error = draft.error;
        this.sequence = Math.max(...this.rows.map((row) => row.key));
        this.restored = true;
        // Rebase untouched fields onto freshly loaded words, retaining only local edits.
        for (const row of this.rows) {
          const current = row.id ? this.vocabulary.get(row.id) : undefined;
          if (current && row.saved) {
            row.word = { ...input(current), ...diff(row.word, row.saved) };
            if (row.committed)
              row.committed = { ...input(current), ...diff(row.committed, row.saved) };
            row.saved = input(current);
          }
        }
        if (this.resume) {
          this.error ||= 'A save was interrupted. Retry to finish it safely.';
          this.lifecycle = { kind: 'failed', action: this.resume, message: this.error };
        }
      }
    } catch (error) {
      this.unreadable = true;
      this.storageError =
        error instanceof Error ? error.message : 'Could not read the saved draft.';
    }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  updateDependencies(words: Word[], api: EditorCallbacks) {
    this.vocabulary = new Map(words.map((word) => [word.id, copy(word)]));
    this.api = api;
  }
  private emit() {
    this.listeners.forEach((listener) => listener());
  }
  get saving() {
    return this.lifecycle.kind === 'working';
  }
  get publishing() {
    return this.lifecycle.kind === 'working' && this.lifecycle.action !== 'autosave';
  }
  get editable() {
    return (
      this.lifecycle.kind === 'open' ||
      this.lifecycle.kind === 'failed' ||
      (this.lifecycle.kind === 'working' && !this.publishing && this.lifecycle.exit === 'stay')
    );
  }
  get hasNewWords() {
    return this.rows.some(
      (row) => !row.id && (row.relation === 'root' || hasWordContent(row.word))
    );
  }
  private add(relation: EditorRow['relation'], word?: Word) {
    const row: EditorRow = {
      key: ++this.sequence,
      relation,
      id: word?.id,
      requestKey: this.uuid(),
      word: word ? input(word) : empty(),
      saved: word ? input(word) : undefined,
      message: '',
      matches: [],
    };
    this.rows.push(row);
    return row;
  }
  addRow(relation: 'child' | 'sibling') {
    if (!this.editable) return undefined;
    const row = this.add(relation);
    this.changed();
    return row;
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
          !this.rows.some((row) => row.id === id && row.relation === relation)
        )
          this.add(relation, entry);
      }
    }
  }
  change(row: EditorRow, patch: Partial<WordInput>) {
    if (!this.editable) return;
    for (const other of this.rows)
      if (other === row || (row.id && other.id === row.id)) {
        other.word = { ...other.word, ...copy(patch) };
        other.message = '';
        other.matches = [];
      }
    this.validation = false;
    this.changed();
  }
  reuse(row: EditorRow, word: Word) {
    if (!this.editable || row.creation) return false;
    if (
      this.rows.some(
        (other) =>
          other !== row &&
          other.id === word.id &&
          (row.relation === 'root' || other.relation === 'root' || other.relation === row.relation)
      )
    ) {
      row.message = 'This word is already here. Enter another character or discard this draft.';
      row.messageKind = 'error';
      this.changed();
      return false;
    }
    const shared = this.rows.find((other) => other !== row && other.id === word.id);
    row.id = word.id;
    row.word = shared ? copy(shared.word) : input(word);
    row.saved = shared?.saved ? copy(shared.saved) : input(word);
    row.message = 'Existing word reused. Changes edit this shared dictionary entry.';
    row.messageKind = 'status';
    row.matches = [];
    if (row.relation === 'root') this.loadRelations(word);
    this.changed();
    return true;
  }
  private resolve(row: EditorRow) {
    if (row.id || row.creation) return true;
    const text = row.word.spelling[0]?.text.trim();
    const matches = text
      ? [...this.vocabulary.values()].filter(VocabularySearch.bySpelling(text))
      : [];
    if (matches.length === 1) return this.reuse(row, matches[0]);
    if (matches.length > 1) {
      row.matches = matches;
      row.message = 'Multiple entries match. Choose the word to reuse.';
      row.messageKind = 'status';
      return false;
    }
    return true;
  }
  commit(row: EditorRow, resolve = false) {
    if (!this.editable) return this.work;
    if (resolve) this.resolve(row);
    if (row.id && valid(row.word)) {
      for (const other of this.rows) if (other.id === row.id) other.committed = copy(row.word);
    }
    this.changed();
    if (this.lifecycle.kind === 'open' && this.needsSave())
      this.send({ type: 'START', action: 'autosave' });
    return this.work;
  }

  private desiredLinks(): Links {
    const links = copy(this.linked);
    for (const row of this.rows.slice(1)) {
      const field = row.relation === 'child' ? 'childrenIds' : 'siblingIds';
      if (this.unlinked.has(row.key)) links[field] = links[field].filter((id) => id !== row.id);
      else if (row.id && !links[field].includes(row.id)) links[field].push(row.id);
    }
    return links;
  }
  get dirty() {
    return (
      this.unreadable ||
      this.rows.some((row) =>
        row.id ? !same(row.word, row.saved) : Boolean(hasWordContent(row.word))
      ) ||
      !same(this.desiredLinks(), this.linked) ||
      this.publish.size > 0
    );
  }
  private needsSave() {
    return (
      this.rows.some(
        (row) => row.id && row.committed && !same(row.committed, row.saved) && valid(row.committed)
      ) || Boolean(this.rows[0].id && !same(this.desiredLinks(), this.linked))
    );
  }
  private snapshot(): Snapshot {
    return {
      version: 1,
      rows: this.rows,
      linked: this.linked,
      unlinked: [...this.unlinked],
      publish: [...this.publish],
      resume: this.resume,
      error: this.error,
    };
  }
  private persist() {
    if (this.unreadable) return false;
    try {
      if (this.store.read(this.slot) !== this.lastStored) {
        this.storageError =
          'This draft changed in another tab. Your input is kept here; the other draft has not been overwritten.';
        return false;
      }
      if (this.dirty || this.resume || this.error) {
        const raw = JSON.stringify(this.snapshot());
        this.store.write(this.slot, raw);
        this.lastStored = raw;
      } else {
        this.store.remove(this.slot);
        this.lastStored = null;
      }
      this.storageError = '';
      return true;
    } catch {
      this.storageError =
        'The draft could not be saved in this browser. Keep this editor open until storage is available.';
      return false;
    }
  }
  private changed() {
    if (this.lifecycle.kind !== 'closed') this.persist();
    this.emit();
  }
  private send(event: LifecycleEvent) {
    const previous = this.lifecycle;
    const transition = transitionEditor(previous, event);
    this.lifecycle = transition.state;
    if (this.lifecycle.kind === 'working') this.resume = this.lifecycle.action;
    else if (this.lifecycle.kind === 'open' || (this.lifecycle.kind === 'closed' && !this.error))
      this.resume = undefined;
    for (const effect of transition.effects) {
      if (
        effect === 'discard' &&
        !this.discard(
          previous.kind === 'confirm-discard'
            ? previous.rowKey
            : event.type === 'DISCARD'
              ? event.rowKey
              : undefined
        )
      ) {
        this.lifecycle = previous;
        this.emit();
        return;
      }
      if (effect === 'reset') this.reset();
    }
    this.changed();
    if (transition.effects.includes('save')) this.work = this.save();
  }

  private acknowledge(row: EditorRow, snapshot: WordInput, saved: Word) {
    const baseline = input(saved);
    for (const other of this.rows)
      if (other === row || other.id === saved.id) {
        const edits = diff(other.word, snapshot);
        other.id = saved.id;
        other.word = { ...baseline, ...edits };
        other.saved = copy(baseline);
        other.creation = undefined;
        other.message = '';
        // Keep committed snapshots comparable when the server supplies optional fields.
        if (other.committed && same(other.committed, snapshot)) other.committed = copy(baseline);
      }
    this.vocabulary.set(saved.id, copy(saved));
    this.publish.delete(row.key);
    this.changed();
  }
  private async save() {
    try {
      while (true) {
        const row = this.rows.find(
          (entry) =>
            entry.creation ||
            (!entry.id && this.publish.has(entry.key)) ||
            (entry.id &&
              entry.committed &&
              valid(entry.committed) &&
              !same(entry.committed, entry.saved))
        );
        if (row) {
          const value = copy(row.creation ?? row.committed ?? row.word);
          if (!row.id) row.creation = value;
          if (!this.persist()) throw new Error(this.storageError);
          const saved = row.id
            ? await this.api.updateWord(row.id, diff(value, row.saved!))
            : await this.api.createWord(value, row.requestKey);
          this.acknowledge(row, value, saved);
          continue;
        }
        const root = this.rows[0];
        const links = this.desiredLinks();
        if (root.id && !same(links, this.linked)) {
          if (!this.persist()) throw new Error(this.storageError);
          await this.api.updateWord(root.id, links);
          this.linked = links;
          root.word = { ...root.word, ...links };
          if (root.saved) root.saved = { ...root.saved, ...links };
          if (root.committed) root.committed = { ...root.committed, ...links };
          this.rows = this.rows.filter((entry) => !this.unlinked.has(entry.key));
          this.unlinked.clear();
          this.changed();
          continue;
        }
        this.error = '';
        this.resume = undefined;
        if (
          this.dirty &&
          this.lifecycle.kind === 'working' &&
          this.lifecycle.action !== 'autosave'
        ) {
          this.validation = true;
          for (const entry of this.rows) {
            const errors = ValidationService.validateWordInput(entry.word);
            if (errors.length && (entry.relation === 'root' || hasWordContent(entry.word))) {
              entry.message = errors.map((error) => error.message).join('. ');
              entry.messageKind = 'error';
            }
          }
          this.send({ type: 'NEEDS_INPUT', stored: this.persist() });
          return;
        }
        this.send({ type: 'COMPLETE', stored: this.persist(), hasDraft: this.dirty });
        return;
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not save changes.';
      this.send({ type: 'FAIL', message: this.error, stored: this.persist() });
    }
  }

  finish(next = false) {
    if (
      this.lifecycle.kind !== 'open' &&
      !(
        this.lifecycle.kind === 'working' &&
        this.lifecycle.action === 'autosave' &&
        this.lifecycle.exit === 'stay'
      )
    )
      return this.work;
    let allowed = true;
    for (const row of this.rows) {
      if (row.relation !== 'root' && !row.id && !hasWordContent(row.word)) continue;
      if (!this.resolve(row)) {
        allowed = false;
        continue;
      }
      const errors = ValidationService.validateWordInput(row.word);
      if (
        !row.id &&
        this.rows.some(
          (other) =>
            other !== row &&
            !other.id &&
            other.word.spelling.some(
              (a) => a.text.trim() && row.word.spelling.some((b) => b.text.trim() === a.text.trim())
            )
        )
      ) {
        row.message =
          'This spelling is already in another draft. Use that row or enter another character.';
        row.messageKind = 'error';
        allowed = false;
      }
      if (errors.length) {
        row.message = errors.map((e) => e.message).join('. ');
        row.messageKind = 'error';
        allowed = false;
      }
    }
    if (!allowed) {
      this.validation = true;
      this.changed();
      return this.work;
    }
    for (const row of this.rows)
      if (row.id || hasWordContent(row.word)) {
        row.committed = copy(row.word);
        if (!row.id) this.publish.add(row.key);
      }
    this.validation = false;
    this.send({ type: 'START', action: next ? 'next' : 'finish' });
    return this.work;
  }
  close() {
    // Closing never validates or promotes a draft. Flush only valid edits to existing words.
    if (this.lifecycle.kind === 'open')
      for (const row of this.rows) if (row.id && valid(row.word)) row.committed = copy(row.word);
    this.send({ type: 'CLOSE', needsSave: this.needsSave(), stored: this.persist() });
    return this.work;
  }
  retry() {
    if (this.lifecycle.kind !== 'failed') return this.work;
    for (const row of this.rows) if (valid(row.word)) row.committed = copy(row.word);
    this.error = '';
    this.send({ type: 'RETRY' });
    return this.work;
  }
  requestDiscard(row?: EditorRow) {
    if (row?.id || (row && this.lifecycle.kind === 'failed')) return;
    this.send({
      type: 'DISCARD',
      hasDraft: row ? Boolean(hasWordContent(row.word)) : this.dirty || Boolean(this.error),
      rowKey: row?.key,
    });
  }
  confirmDiscard() {
    this.send({ type: 'CONFIRM_DISCARD' });
  }
  cancelDiscard() {
    this.send({ type: 'CANCEL' });
  }
  leaveWithoutDraft() {
    this.send({ type: 'LEAVE_WITHOUT_DRAFT' });
  }
  private discard(rowKey?: number) {
    if (rowKey !== undefined) {
      this.rows = this.rows.filter((row) => row.key !== rowKey);
      this.publish.delete(rowKey);
    } else {
      try {
        // Discard only this session's record, preserving another tab's newer draft.
        if (this.store.read(this.slot) === this.lastStored) this.store.remove(this.slot);
        this.lastStored = this.store.read(this.slot);
      } catch {
        this.storageError = 'The saved draft could not be removed from this browser.';
        return false;
      }
      this.rows = this.rows.filter(
        (row) =>
          row.relation === 'root' ||
          (row.id &&
            (row.relation === 'child' ? this.linked.childrenIds : this.linked.siblingIds).includes(
              row.id
            ))
      );
      for (const row of this.rows) {
        row.word = row.saved ? copy(row.saved) : empty();
        row.committed = undefined;
        row.creation = undefined;
        row.message = '';
        row.matches = [];
      }
      this.error = '';
      this.resume = undefined;
      this.publish.clear();
      this.unlinked.clear();
      this.validation = false;
      this.unreadable = false;
      this.storageError = '';
    }
    this.focusRevision++;
    return true;
  }
  unlink(row: EditorRow) {
    if (!this.editable) return this.work;
    this.unlinked.add(row.key);
    this.changed();
    if (this.lifecycle.kind === 'open' && this.needsSave())
      this.send({ type: 'START', action: 'autosave' });
    return this.work;
  }
  private reset() {
    this.rows = [];
    this.linked = { childrenIds: [], siblingIds: [] };
    this.unlinked.clear();
    this.publish.clear();
    this.error = '';
    this.resume = undefined;
    this.restored = false;
    this.add('root');
    this.focusRevision++;
  }

  checkpoint() {
    if (this.lifecycle.kind === 'open')
      for (const row of this.rows) {
        if (row.id && valid(row.word)) row.committed = copy(row.word);
      }
    this.changed();
    if (this.lifecycle.kind === 'open' && this.needsSave())
      this.send({ type: 'START', action: 'autosave' });
  }
}
