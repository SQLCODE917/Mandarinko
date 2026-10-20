import { ValidationService, type Word } from '@mandarinko/core';
import { componentSpellings, spellingMatches, parseEntryPaste } from './entryParsing';
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
  refreshVocabulary?: () => Promise<Word[]>;
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
const input = ({
  id: _id,
  childrenIds: _children,
  siblingIds: _siblings,
  ...word
}: Word): WordInput => copy(word);
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

export type EntryDefaults = {
  name: string;
  language: string;
  hskLevel?: number;
  jlptLevel?: number;
};
export type EditorView = { label?: string; start?: number; end?: number; scroll: number };
type Node = EditorRow & {
  edges: { child: number[]; sibling: number[] };
  linked: Links;
  staged?: boolean;
  provided?: Partial<WordInput>;
};
type GraphSnapshot = {
  version: 2;
  aliases?: [number, number][];
  workspaceId: string;
  nodes: Node[];
  roots: number[];
  selected: number[];
  path: number[];
  views: [number, EditorView][];
  defaults: EntryDefaults;
  publish: number[];
  resume?: SaveAction;
  error: string;
  batch: boolean;
  previewChanges?: { key: number; before?: WordInput; provided: Partial<WordInput> }[];
};
const applyProvided = (base: WordInput, patch: Partial<WordInput>): WordInput => ({
  ...base,
  ...patch,
  spelling: [
    ...base.spelling,
    ...(patch.spelling ?? []).filter(
      (s) => !base.spelling.some((t) => s.language === t.language && s.text === t.text)
    ),
  ],
  ...(patch.metadata ? { metadata: { ...base.metadata, ...patch.metadata } } : {}),
});
const noLinks = (): Links => ({ childrenIds: [], siblingIds: [] });
const defaultSettings = (): EntryDefaults => ({ name: '', language: 'zh-Hans' });
const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function readGraph(raw: string): GraphSnapshot {
  const s = JSON.parse(raw) as GraphSnapshot;
  const keys = new Set(s?.nodes?.map?.((n) => n.key));
  if (
    s?.version !== 2 ||
    !isUuid(s.workspaceId) ||
    !Array.isArray(s.nodes) ||
    !s.nodes.length ||
    keys.size !== s.nodes.length ||
    !s.nodes.every(
      (n) =>
        Number.isSafeInteger(n.key) &&
        n.key > 0 &&
        isUuid(n.requestKey) &&
        isInput(n.word) &&
        (!n.id || (typeof n.id === 'string' && isInput(n.saved))) &&
        (!n.committed || isInput(n.committed)) &&
        (!n.creation || (isInput(n.creation) && valid(n.creation))) &&
        n.edges &&
        ['child', 'sibling'].every(
          (r) =>
            Array.isArray(n.edges[r as 'child']) && n.edges[r as 'child'].every((k) => keys.has(k))
        ) &&
        n.linked &&
        Object.values(n.linked).every(
          (v) => Array.isArray(v) && v.every((id) => typeof id === 'string')
        )
    ) ||
    ![s.roots, s.selected, s.path, s.publish].every(
      (v) => Array.isArray(v) && v.every((k) => keys.has(k))
    ) ||
    !s.roots.length ||
    !s.path.length ||
    !s.defaults ||
    typeof s.defaults.name !== 'string' ||
    typeof s.defaults.language !== 'string' ||
    !Array.isArray(s.views) ||
    !s.views.every(
      (v) =>
        Array.isArray(v) &&
        v.length === 2 &&
        keys.has(v[0]) &&
        v[1] &&
        Number.isFinite(v[1].scroll) &&
        (v[1].label === undefined || typeof v[1].label === 'string') &&
        [v[1].start, v[1].end].every((n) => n === undefined || (Number.isSafeInteger(n) && n >= 0))
    ) ||
    (s.aliases !== undefined &&
      (!Array.isArray(s.aliases) ||
        !s.aliases.every(
          (v) =>
            Array.isArray(v) &&
            v.length === 2 &&
            Number.isSafeInteger(v[0]) &&
            keys.has(v[1]) &&
            !keys.has(v[0])
        ))) ||
    typeof s.error !== 'string' ||
    (s.resume !== undefined && !['autosave', 'finish', 'next'].includes(s.resume))
  )
    throw new Error('Saved draft is unreadable. Discard it to start again.');
  return s;
}

/** A normalized authoring graph and its single ordered persistence worker. */
export class WordEditorSession {
  lifecycle: EditorLifecycle = { kind: 'open' };
  error = '';
  storageError = '';
  validation = false;
  focusRevision = 0;
  restored = false;
  readonly slot: string;
  readonly isNew: boolean;
  workspaceId: string;
  defaults = defaultSettings();
  batch = false;
  previewChanges: { key: number; before?: WordInput; provided: Partial<WordInput> }[] = [];
  private nodes = new Map<number, Node>();
  private aliases = new Map<number, number>();
  private proxies = new Map<string, EditorRow>();
  private roots: number[] = [];
  private selected = new Set<number>();
  private path: number[] = [];
  private views = new Map<number, EditorView>();
  private sequence = 0;
  private listeners = new Set<() => void>();
  private vocabulary: Map<string, Word>;
  private publish = new Set<number>();
  private batchRefreshing = false;
  private batchValidated = false;
  private resume?: SaveAction;
  private unreadable = false;
  private lastStored: string | null = null;
  private work: Promise<void> = Promise.resolve();
  private pinned = false;
  onNavigate?: (replace?: boolean) => void;

  constructor(
    word: Word | undefined,
    words: Word[],
    private api: EditorCallbacks,
    private store: EditorDraftStore = browserEditorDrafts,
    private uuid: () => string = () => crypto.randomUUID()
  ) {
    this.slot = word ? `word:${word.id}` : 'new';
    this.isNew = !word;
    this.workspaceId = this.uuid();
    this.vocabulary = new Map(words.map((entry) => [entry.id, copy(entry)]));
    try {
      const config = JSON.parse(this.store.read('entry-session') ?? 'null') as EntryDefaults | null;
      if (config && typeof config.name === 'string' && typeof config.language === 'string')
        this.defaults = config;
    } catch {
      /* The workspace's own read below reports unavailable storage. */
    }
    const activeDefaults = copy(this.defaults);
    const root = word ? this.ensure(word) : this.addNode(true);
    this.roots = [root.key];
    this.selected.add(root.key);
    this.path = [root.key];
    try {
      const raw = this.store.read(this.slot);
      this.lastStored = raw;
      if (raw) {
        if ((JSON.parse(raw) as { version: number }).version === 1) this.convert(decode(raw));
        else this.restore(readGraph(raw));
        if (this.store.read('entry-session')) this.defaults = activeDefaults;
        this.restored = true;
        for (const node of this.nodes.values()) {
          const current = node.id ? this.vocabulary.get(node.id) : undefined;
          if (current && node.saved) {
            const edits = diff(node.word, node.saved);
            node.word = { ...input(current), ...edits };
            if (node.committed)
              node.committed = { ...input(current), ...diff(node.committed, node.saved) };
            node.saved = input(current);
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
  private restore(s: GraphSnapshot) {
    this.workspaceId = s.workspaceId;
    this.aliases = new Map(s.aliases ?? []);
    this.nodes = new Map(s.nodes.map((n) => [n.key, { ...n, message: '', matches: [] }]));
    this.sequence = Math.max(...this.nodes.keys());
    this.roots = s.roots;
    this.selected = new Set(s.selected);
    this.path = s.path;
    this.views = new Map(s.views);
    this.defaults = s.defaults;
    this.publish = new Set(s.publish);
    this.resume = s.resume;
    this.error = s.error;
    this.batch = s.batch;
    this.previewChanges = s.previewChanges ?? [];
  }
  private convert(s: Snapshot) {
    this.nodes.clear();
    this.sequence = 0;
    for (const r of s.rows) {
      const n: Node = {
        ...r,
        word: input({ ...r.word, id: r.id ?? '' }),
        saved: r.saved ? input({ ...r.saved, id: r.id ?? '' }) : undefined,
        committed: r.committed ? input({ ...r.committed, id: r.id ?? '' }) : undefined,
        edges: { child: [], sibling: [] },
        linked: noLinks(),
      };
      this.nodes.set(n.key, n);
      this.sequence = Math.max(this.sequence, n.key);
    }
    const root = this.nodes.get(s.rows[0].key)!;
    root.linked = s.linked;
    for (const r of s.rows.slice(1))
      if (!s.unlinked.includes(r.key))
        root.edges[r.relation === 'child' ? 'child' : 'sibling'].push(r.key);
    const identities = new Map<string, Node>();
    for (const node of [...this.nodes.values()])
      if (node.id) {
        const canonical = identities.get(node.id);
        if (!canonical) {
          identities.set(node.id, node);
          continue;
        }
        canonical.word = {
          ...canonical.word,
          ...(node.saved ? diff(node.word, node.saved) : node.word),
        };
        if (node.committed)
          canonical.committed = {
            ...(canonical.committed ?? canonical.word),
            ...(node.saved ? diff(node.committed, node.saved) : node.committed),
          };
        canonical.creation ??= node.creation;
        this.aliases.set(node.key, canonical.key);
        this.nodes.delete(node.key);
      }
    for (const node of this.nodes.values())
      for (const relation of ['child', 'sibling'] as const)
        node.edges[relation] = [...new Set(node.edges[relation].map((key) => this.key(key)))];
    for (const n of [...this.nodes.values()])
      if (n.id && n !== root) this.loadEdges(n, this.vocabulary.get(n.id));
    this.roots = [root.key];
    this.selected = new Set(this.roots);
    this.path = [root.key];
    this.publish = new Set(s.publish.map((key) => this.key(key)));
    this.resume = s.resume;
    this.error = s.error;
    // The old record is replaced only by a successfully written v2 snapshot.
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  updateDependencies(words: Word[], api: EditorCallbacks) {
    this.vocabulary = new Map(words.map((w) => [w.id, copy(w)]));
    this.api = api;
  }
  private emit() {
    this.listeners.forEach((f) => f());
  }
  private key(key: number): number {
    return this.aliases.has(key) ? this.key(this.aliases.get(key)!) : key;
  }
  private node(row: EditorRow | number) {
    return this.nodes.get(this.key(typeof row === 'number' ? row : row.key))!;
  }
  private view(key: number, relation: EditorRow['relation']): EditorRow {
    const cache = `${key}:${relation}`;
    if (!this.proxies.has(cache))
      this.proxies.set(
        cache,
        new Proxy({} as EditorRow, {
          get: (_target, property) =>
            property === 'relation' ? relation : Reflect.get(this.node(key), property),
          set: (_target, property, value) => Reflect.set(this.node(key), property, value),
        })
      );
    return this.proxies.get(cache)!;
  }
  get activeKey() {
    return this.key(this.path[this.path.length - 1]);
  }
  get rows() {
    const n = this.node(this.activeKey);
    return [
      this.view(n.key, 'root'),
      ...n.edges.child.map((k) => this.view(k, 'child')),
      ...n.edges.sibling.map((k) => this.view(k, 'sibling')),
    ];
  }
  get breadcrumbs() {
    return this.path.map((k) => ({
      key: this.key(k),
      text: this.node(k).word.spelling[0]?.text || 'New word',
    }));
  }
  get nested() {
    return this.path.length > 1;
  }
  get resultWordId() {
    return this.node([...this.selected][0] ?? this.roots[0])?.id;
  }
  get rootRows() {
    return this.roots.map((k) => ({ row: this.view(k, 'root'), selected: this.selected.has(k) }));
  }
  get previewEntries() {
    return this.reachable(this.roots)
      .filter((n) => this.used(n))
      .map((n) => ({
        row: this.view(n.key, 'root'),
        root: this.roots.includes(n.key),
        selected: this.selected.has(n.key),
        before: n.saved,
        children: n.edges.child.map((k) => this.node(k).word.spelling[0]?.text).join(', '),
        siblings: n.edges.sibling.map((k) => this.node(k).word.spelling[0]?.text).join(', '),
      }));
  }
  reviewEntry(key: number) {
    if (!this.editable) return;
    this.checkpoint();
    this.path = this.roots.includes(key)
      ? [key]
      : (this.roots.map((root) => this.findPath(key, root)).find(Boolean) ?? [key]);
    this.changed();
    this.onNavigate?.();
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
    return this.reachable([...this.selected]).some((n) => !n.id && this.used(n));
  }
  get newWordCount() {
    return this.reachable([...this.selected]).filter((n) => !n.id && this.used(n)).length;
  }
  private used(n: Node) {
    return Boolean(
      n.id ||
      this.roots.includes(n.key) ||
      hasWordContent(n.word) ||
      n.edges.child.length ||
      n.edges.sibling.length
    );
  }
  private addNode(top = false) {
    const word = empty();
    word.spelling[0].language = this.defaults.language;
    if (top && (this.defaults.hskLevel || this.defaults.jlptLevel))
      word.metadata = {
        ...(this.defaults.hskLevel ? { hskLevel: this.defaults.hskLevel } : {}),
        ...(this.defaults.jlptLevel ? { jlptLevel: this.defaults.jlptLevel } : {}),
      };
    const n: Node = {
      key: ++this.sequence,
      relation: 'root',
      requestKey: this.uuid(),
      word,
      message: '',
      matches: [],
      edges: { child: [], sibling: [] },
      linked: noLinks(),
    };
    this.nodes.set(n.key, n);
    return n;
  }
  private ensure(word: Word): Node {
    const found = [...this.nodes.values()].find((n) => n.id === word.id);
    if (found) return found;
    const n = this.addNode();
    n.id = word.id;
    n.word = input(word);
    n.saved = input(word);
    this.loadEdges(n, word);
    return n;
  }
  private loadEdges(n: Node, word?: Word) {
    if (!word) return;
    n.linked = {
      childrenIds: (word.childrenIds ?? []).map(String),
      siblingIds: (word.siblingIds ?? []).map(String),
    };
    for (const [relation, ids] of [
      ['child', n.linked.childrenIds],
      ['sibling', n.linked.siblingIds],
    ] as const)
      for (const id of ids) {
        const w = this.vocabulary.get(id);
        if (w && id !== n.id) {
          const target = this.ensure(w);
          if (!n.edges[relation].includes(target.key)) n.edges[relation].push(target.key);
        }
      }
  }
  addRow(relation: 'child' | 'sibling') {
    if (!this.editable) return;
    const n = this.addNode();
    n.word.spelling[0].language =
      this.node(this.activeKey).word.spelling[0]?.language ?? this.defaults.language;
    this.node(this.activeKey).edges[relation].push(n.key);
    this.changed();
    return this.view(n.key, relation);
  }
  private reachable(roots: number[]) {
    const result: Node[] = [],
      seen = new Set<number>();
    const visit = (key: number) => {
      key = this.key(key);
      if (seen.has(key)) return;
      seen.add(key);
      const n = this.nodes.get(key);
      if (!n) return;
      result.push(n);
      for (const k of [...n.edges.child, ...n.edges.sibling]) visit(k);
    };
    roots.forEach(visit);
    return result;
  }
  private childReaches(from: number, to: number, seen = new Set<number>()): boolean {
    from = this.key(from);
    to = this.key(to);
    if (from === to) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return this.node(from).edges.child.some((k) => this.childReaches(k, to, seen));
  }
  change(row: EditorRow, patch: Partial<WordInput>) {
    if (!this.editable) return;
    const n = this.node(row);
    n.word = { ...n.word, ...copy(patch) };
    if (this.batch) {
      n.staged = true;
      n.provided = { ...n.provided, ...copy(patch) };
    }
    n.message = '';
    n.matches = [];
    this.validation = false;
    this.changed();
  }
  suggestions(row: EditorRow, query = row.word.spelling[0]?.text ?? '') {
    const language = row.word.spelling[0]?.language ?? this.defaults.language;
    const all = [...this.vocabulary.values(), ...this.nodes.values()].map((v) =>
      'word' in v ? { ...v.word, id: `draft:${v.key}` } : v
    );
    const result = new Map<string, Word>();
    for (const w of all)
      if (
        w.spelling.some(
          (s) =>
            s.text &&
            spellingMatches({ spelling: [s] }, s.text, language) &&
            s.text.includes(query.trim())
        ) &&
        query.trim()
      ) {
        const existing = [...this.nodes.values()].find((n) => n.id === w.id);
        if (!w.id.startsWith('draft:') || !existing) result.set(w.id, w);
      }
    return [...result.values()]
      .filter(
        (w) =>
          w.id !== row.id &&
          (!w.id.startsWith('draft:') ||
            (Number(w.id.slice(6)) !== row.key && !this.node(Number(w.id.slice(6))).id))
      )
      .slice(0, 12);
  }
  private matches(row: EditorRow) {
    const n = this.node(row),
      spelling = n.word.spelling[0];
    if (!spelling?.text.trim()) return [];
    const result: Node[] = [];
    for (const w of this.vocabulary.values())
      if (spellingMatches(w, spelling.text, spelling.language)) result.push(this.ensure(w));
    for (const other of this.nodes.values())
      if (
        other.key !== n.key &&
        !other.id &&
        this.used(other) &&
        spellingMatches(other.word, spelling.text, spelling.language)
      )
        result.push(other);
    return [...new Map(result.map((v) => [v.key, v])).values()];
  }
  reuse(row: EditorRow, word: Word) {
    if (!this.editable || this.node(row).creation) return false;
    const target = word.id.startsWith('draft:')
      ? this.node(Number(word.id.slice(6)))
      : this.ensure(word);
    const old = this.node(row),
      parent = this.node(this.activeKey);
    const relation = row.relation === 'root' ? undefined : row.relation;
    if (target === old) return true;
    if (
      relation &&
      (target === parent ||
        parent.edges[relation].some((k) => this.key(k) === target.key && this.key(k) !== old.key) ||
        (relation === 'child' && this.childReaches(target.key, parent.key)))
    ) {
      old.message =
        'This word is already here or would create a circular relationship. Enter another character or discard this draft.';
      old.messageKind = 'error';
      this.changed();
      return false;
    }
    if (
      [...this.nodes.values()].some(
        (n) => n.edges.child.includes(old.key) && this.childReaches(target.key, n.key)
      ) ||
      old.edges.child.some((k) => this.childReaches(k, target.key))
    ) {
      old.message = 'This component would create a circular relationship.';
      old.messageKind = 'error';
      this.changed();
      return false;
    }
    for (const rel of ['child', 'sibling'] as const)
      target.edges[rel] = [...new Set([...target.edges[rel], ...old.edges[rel]])];
    // Redirect every reference: a draft identity is replaced once throughout the workspace.
    for (const n of this.nodes.values())
      for (const rel of ['child', 'sibling'] as const)
        n.edges[rel] = [...new Set(n.edges[rel].map((k) => (k === old.key ? target.key : k)))];
    this.roots = [...new Set(this.roots.map((k) => (k === old.key ? target.key : k)))];
    this.selected = new Set([...this.selected].map((k) => (k === old.key ? target.key : k)));
    this.path = this.path.map((k) => (k === old.key ? target.key : k));
    for (const [alias, key] of this.aliases)
      if (key === old.key) this.aliases.set(alias, target.key);
    this.aliases.set(old.key, target.key);
    this.nodes.delete(old.key);
    if (this.views.has(old.key)) {
      this.views.set(target.key, this.views.get(old.key)!);
      this.views.delete(old.key);
    }
    this.previewChanges = this.previewChanges.map((change) =>
      change.key === old.key ? { ...change, key: target.key } : change
    );
    if (old.staged && old.provided) {
      target.word = applyProvided(target.word, old.provided);
      target.provided = old.provided;
      target.staged = true;
    }
    target.message = 'Existing word reused. Changes edit this shared dictionary entry.';
    target.messageKind = 'status';
    target.matches = [];
    this.changed();
    this.onNavigate?.(true);
    return true;
  }
  private resolve(row: EditorRow) {
    const n = this.node(row);
    if (n.id || n.creation) return true;
    const matches = this.matches(row);
    if (matches.length === 1)
      return this.reuse(row, {
        ...matches[0].word,
        id: matches[0].id ?? `draft:${matches[0].key}`,
      });
    if (matches.length > 1) {
      n.matches = matches.map((v) => ({ ...v.word, id: v.id ?? `draft:${v.key}` }));
      n.message = 'Multiple entries match. Choose the word to reuse.';
      n.messageKind = 'status';
      return false;
    }
    return true;
  }
  commit(row: EditorRow, resolve = false) {
    if (!this.editable) return this.work;
    if (resolve) this.resolve(row);
    const n = this.node(row);
    if (!this.batch && n.id && !n.staged && valid(n.word)) n.committed = copy(n.word);
    this.changed();
    if (this.lifecycle.kind === 'open' && this.needsSave())
      this.send({ type: 'START', action: 'autosave' });
    return this.work;
  }
  addComponents(text: string, relation: 'child' | 'sibling' = 'child') {
    if (!this.editable) return [];
    const parent = this.node(this.activeKey),
      added: EditorRow[] = [],
      language = parent.word.spelling[0]?.language ?? this.defaults.language;
    for (const spelling of componentSpellings(text)) {
      if (
        parent.edges[relation].some((k) => spellingMatches(this.node(k).word, spelling, language))
      )
        continue;
      const row = this.addRow(relation)!;
      this.change(row, { spelling: [{ language, text: spelling }] });
      this.resolve(row);
      added.push(row);
    }
    this.changed();
    this.checkpoint();
    return added;
  }
  captureView(view: Partial<EditorView>) {
    this.views.set(this.activeKey, { scroll: 0, ...this.views.get(this.activeKey), ...view });
    this.persist();
  }
  get currentView() {
    return this.views.get(this.activeKey);
  }
  openComponents(row: EditorRow) {
    if (!this.editable) return;
    this.checkpoint();
    this.path.push(this.node(row).key);
    this.validation = false;
    this.changed();
    this.onNavigate?.();
  }
  returnTo(index: number) {
    if (!this.editable) return;
    this.checkpoint();
    this.path = this.path.slice(0, index + 1);
    this.validation = false;
    this.changed();
    this.onNavigate?.();
  }
  restoreLocation(workspace: string, nodeKey: number) {
    nodeKey = this.key(nodeKey);
    if (workspace !== this.workspaceId || !this.nodes.has(nodeKey)) return false;
    const index = this.path.indexOf(nodeKey);
    this.path = index >= 0 ? this.path.slice(0, index + 1) : (this.findPath(nodeKey) ?? [nodeKey]);
    this.emit();
    return true;
  }
  openRoot(key: number) {
    if (!this.roots.includes(key) || !this.editable) return;
    this.checkpoint();
    this.path = [key];
    this.changed();
    this.onNavigate?.();
  }
  pinNavigation() {
    this.pinned = true;
    this.persist();
  }
  configure(defaults: EntryDefaults) {
    if (!defaults.language.trim()) throw new Error('Choose an entry language.');
    for (const [key, max] of [
      ['hskLevel', 9],
      ['jlptLevel', 5],
    ] as const)
      if (
        defaults[key] !== undefined &&
        (!Number.isInteger(defaults[key]) || defaults[key]! < 1 || defaults[key]! > max)
      )
        throw new Error(`Invalid ${key}.`);
    this.defaults = copy(defaults);
    try {
      this.store.write('entry-session', JSON.stringify(this.defaults));
    } catch {
      this.storageError = 'Entry-session settings could not be stored.';
    }
    const root = this.node(this.roots[0]);
    if (!root.id && !root.word.spelling.some((s) => s.text.trim())) {
      root.word.spelling[0].language = defaults.language;
      root.word.metadata = {
        ...(defaults.hskLevel ? { hskLevel: defaults.hskLevel } : {}),
        ...(defaults.jlptLevel ? { jlptLevel: defaults.jlptLevel } : {}),
      };
    }
    this.changed();
  }
  endEntrySession() {
    this.configure(defaultSettings());
  }
  selectRoot(key: number, selected: boolean) {
    if (selected) {
      this.selected.add(key);
      const n = this.node(key);
      if (!n.id)
        n.word.metadata = {
          ...(this.defaults.hskLevel ? { hskLevel: this.defaults.hskLevel } : {}),
          ...(this.defaults.jlptLevel ? { jlptLevel: this.defaults.jlptLevel } : {}),
          ...n.word.metadata,
        };
    } else this.selected.delete(key);
    this.changed();
  }
  private links(n: Node): Links {
    return {
      childrenIds: n.edges.child
        .map((k) => this.node(k))
        .filter((v) => v.id)
        .map((v) => v.id!),
      siblingIds: n.edges.sibling
        .map((k) => this.node(k))
        .filter((v) => v.id)
        .map((v) => v.id!),
    };
  }
  private edgeDirty(n: Node) {
    return !same(this.links(n), n.linked);
  }
  get dirty() {
    return (
      this.unreadable ||
      this.publish.size > 0 ||
      this.reachable(this.roots).some((n) =>
        n.id
          ? !same(n.word, n.saved) || this.edgeDirty(n)
          : Boolean(hasWordContent(n.word) || n.edges.child.length || n.edges.sibling.length)
      )
    );
  }
  private needsSave() {
    if (this.batch) return false;
    return this.reachable(this.roots).some(
      (n) =>
        n.id &&
        !n.staged &&
        ((n.committed && valid(n.committed) && !same(n.committed, n.saved)) || this.edgeDirty(n))
    );
  }
  private persist() {
    if (this.unreadable) return false;
    try {
      if (this.store.read(this.slot) !== this.lastStored) {
        this.storageError =
          'This draft changed in another tab. Your input is kept here; the other draft has not been overwritten.';
        return false;
      }
      if (this.dirty || this.resume || this.error || this.pinned) {
        const s: GraphSnapshot = {
          version: 2,
          aliases: [...this.aliases],
          workspaceId: this.workspaceId,
          nodes: [...this.nodes.values()],
          roots: this.roots,
          selected: [...this.selected],
          path: this.path,
          views: [...this.views],
          defaults: this.defaults,
          publish: [...this.publish],
          resume: this.resume,
          error: this.error,
          batch: this.batch,
          previewChanges: this.previewChanges,
        };
        const raw = JSON.stringify(s);
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
    const previous = this.lifecycle,
      transition = transitionEditor(previous, event);
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
  private async save() {
    try {
      for (;;) {
        const candidates = this.batch
          ? this.reachable([...this.selected])
          : this.reachable(this.roots);
        const node = candidates.find(
          (n) =>
            n.creation ||
            (!n.id && this.publish.has(n.key)) ||
            (n.id && n.committed && valid(n.committed) && !same(n.committed, n.saved))
        );
        if (node) {
          const value = copy(node.creation ?? node.committed ?? node.word);
          if (!node.id) node.creation = value;
          if (!this.persist()) throw new Error(this.storageError);
          const saved = node.id
            ? await this.api.updateWord(node.id, diff(value, node.saved!))
            : await this.api.createWord(value, node.requestKey);
          const baseline = input(saved),
            edits = diff(node.word, value);
          node.id = saved.id;
          node.word = { ...baseline, ...edits };
          node.saved = copy(baseline);
          node.creation = undefined;
          node.message = '';
          if (node.committed && same(node.committed, value)) node.committed = copy(baseline);
          this.vocabulary.set(saved.id, copy(saved));
          this.publish.delete(node.key);
          this.changed();
          continue;
        }
        const parent = candidates.find((n) => n.id && !n.staged && this.edgeDirty(n));
        if (parent) {
          const links = this.links(parent);
          if (!this.persist()) throw new Error(this.storageError);
          await this.api.updateWord(parent.id!, links);
          parent.linked = links;
          this.changed();
          continue;
        }
        this.error = '';
        this.resume = undefined;
        const involved = this.reachable([...this.selected]).filter((n) => this.used(n));
        if (
          this.publishing &&
          involved.some((n) => !valid(n.word) || !n.id || !same(n.word, n.saved))
        ) {
          this.validation = true;
          for (const n of involved)
            if (!valid(n.word)) {
              n.message = ValidationService.validateWordInput(n.word)
                .map((e) => e.message)
                .join('. ');
              n.messageKind = 'error';
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
      !(this.lifecycle.kind === 'working' && !this.publishing && this.lifecycle.exit === 'stay')
    )
      return this.work;
    if (this.nested) {
      this.returnTo(this.path.length - 2);
      return this.work;
    }
    if (this.batch && !this.batchValidated) {
      if (this.batchRefreshing) return this.work;
      this.batchRefreshing = true;
      this.work = this.refreshBatch(next);
      return this.work;
    }

    if (!this.selected.size) {
      this.error = 'Select at least one root word.';
      this.emit();
      return this.work;
    }
    let allowed = true;
    for (const n of this.reachable([...this.selected]))
      for (const key of n.edges.child) {
        const target = this.node(key);
        if (
          (!target.id || !n.linked.childrenIds.includes(target.id)) &&
          this.childReaches(key, n.key)
        ) {
          n.message = 'A child relationship would be circular.';
          n.messageKind = 'error';
          this.validation = true;
          this.changed();
          return this.work;
        }
      }
    for (const n of this.reachable([...this.selected]))
      if (this.used(n)) {
        const proxy = this.view(n.key, n.key === this.roots[0] ? 'root' : 'child');
        // Separate explicitly authored draft rows still require deduplication by the author.
        const duplicates = this.matches(proxy).filter((m) => !m.id);
        if (!n.id && duplicates.length) {
          n.message =
            'This spelling is already in another draft. Use that row or enter another character.';
          n.messageKind = 'error';
          allowed = false;
          continue;
        }
        if (!this.resolve(proxy)) {
          allowed = false;
          continue;
        }
        const current = this.node(proxy);
        const errors = ValidationService.validateWordInput(current.word);
        if (errors.length) {
          current.message = errors.map((e) => e.message).join('. ');
          current.messageKind = 'error';
          allowed = false;
        }
      }
    if (!allowed) {
      this.validation = true;
      const bad = [...this.nodes.values()].find(
        (n) => n.messageKind === 'error' || n.matches.length
      );
      if (bad && this.activeKey !== bad.key) {
        this.path = this.findPath(bad.key) ?? [this.roots[0], bad.key];
        this.onNavigate?.();
      }
      this.focusRevision++;
      this.changed();
      return this.work;
    }
    for (const n of this.reachable([...this.selected]))
      if (this.used(n)) {
        n.committed = copy(n.word);
        n.staged = false;
        if (!n.id) this.publish.add(n.key);
      }
    this.validation = false;
    this.send({ type: 'START', action: next ? 'next' : 'finish' });
    return this.work;
  }
  private findPath(key: number, root = this.roots[0], path: number[] = []): number[] | undefined {
    if (path.includes(root)) return;
    const next = [...path, root];
    if (root === key) return next;
    for (const child of [...this.node(root).edges.child, ...this.node(root).edges.sibling]) {
      const found = this.findPath(key, child, next);
      if (found) return found;
    }
  }
  close() {
    this.pinned = false;
    if (this.lifecycle.kind === 'open')
      for (const n of this.nodes.values())
        if (!this.batch && n.id && !n.staged && valid(n.word)) n.committed = copy(n.word);
    this.send({ type: 'CLOSE', needsSave: this.needsSave(), stored: this.persist() });
    return this.work;
  }
  retry() {
    if (this.lifecycle.kind !== 'failed') return this.work;
    if (this.batch && !this.resume) {
      this.lifecycle = { kind: 'open' };
      this.error = '';
      return this.finish();
    }
    for (const n of this.nodes.values())
      if (valid(n.word) && (n.id || n.creation || this.publish.has(n.key)))
        n.committed = copy(n.word);
    this.error = '';
    this.send({ type: 'RETRY' });
    return this.work;
  }
  checkpoint() {
    if (this.lifecycle.kind === 'open')
      for (const n of this.nodes.values())
        if (!this.batch && n.id && !n.staged && valid(n.word)) n.committed = copy(n.word);
    this.changed();
    if (this.lifecycle.kind === 'open' && this.needsSave())
      this.send({ type: 'START', action: 'autosave' });
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
      for (const n of this.nodes.values())
        for (const rel of ['child', 'sibling'] as const)
          n.edges[rel] = n.edges[rel].filter((k) => k !== rowKey);
      if (!this.roots.includes(rowKey)) {
        this.nodes.delete(rowKey);
        this.views.delete(rowKey);
        for (const [alias, key] of this.aliases) if (key === rowKey) this.aliases.delete(alias);
      }
      this.publish.delete(rowKey);
    } else {
      try {
        if (this.store.read(this.slot) === this.lastStored) this.store.remove(this.slot);
        this.lastStored = this.store.read(this.slot);
      } catch {
        this.storageError = 'The saved draft could not be removed from this browser.';
        return false;
      }
      for (const n of this.nodes.values()) {
        n.word = n.saved ? copy(n.saved) : empty();
        n.committed = undefined;
        n.creation = undefined;
        n.message = '';
        n.matches = [];
        n.staged = false;
        n.edges = {
          child: n.linked.childrenIds
            .map((id) => [...this.nodes.values()].find((v) => v.id === id)?.key)
            .filter((k): k is number => k !== undefined),
          sibling: n.linked.siblingIds
            .map((id) => [...this.nodes.values()].find((v) => v.id === id)?.key)
            .filter((k): k is number => k !== undefined),
        };
      }
      this.error = '';
      this.resume = undefined;
      this.publish.clear();
      this.validation = false;
      this.unreadable = false;
      this.storageError = '';
      this.pinned = false;
    }
    this.focusRevision++;
    return true;
  }
  unlink(row: EditorRow) {
    if (!this.editable) return this.work;
    const n = this.node(this.activeKey);
    for (const rel of ['child', 'sibling'] as const)
      if (rel === row.relation) n.edges[rel] = n.edges[rel].filter((k) => k !== row.key);
    this.changed();
    if (this.lifecycle.kind === 'open' && this.needsSave())
      this.send({ type: 'START', action: 'autosave' });
    return this.work;
  }
  private reset() {
    this.nodes.clear();
    this.aliases.clear();
    this.proxies.clear();
    this.publish.clear();
    this.error = '';
    this.resume = undefined;
    this.restored = false;
    this.batch = false;
    this.previewChanges = [];
    const n = this.addNode(true);
    this.roots = [n.key];
    this.selected = new Set(this.roots);
    this.path = [n.key];
    this.focusRevision++;
    this.onNavigate?.(true);
  }
  previewPaste(text: string) {
    if (!this.editable || this.saving) throw new Error('Finish the current save before pasting.');
    const rows = parseEntryPaste(text);
    if (!rows.length) throw new Error('Paste at least one word.');
    const old = {
      previewChanges: copy(this.previewChanges),
      nodes: copy([...this.nodes]),
      roots: [...this.roots],
      selected: [...this.selected],
      path: [...this.path],
      sequence: this.sequence,
      batch: this.batch,
    };
    try {
      const imported: { key: number; values: Record<string, string> }[] = [],
        referenced = new Set<number>();
      const find = (spelling: string, language: string, traditional?: string): Node => {
        const matches = (w: WordInput) =>
          spellingMatches(w, spelling, language) ||
          Boolean(traditional && spellingMatches(w, traditional, language));
        const candidates = new Map<number, Node>();
        for (const word of this.vocabulary.values())
          if (matches(word)) {
            const n = this.ensure(word);
            candidates.set(n.key, n);
          }
        for (const n of this.nodes.values()) if (matches(n.word)) candidates.set(n.key, n);
        if (candidates.size === 1) return [...candidates.values()][0];
        const n = this.addNode();
        n.word.spelling = [{ language, text: spelling }];
        n.staged = true;
        if (candidates.size > 1) {
          n.matches = [...candidates.values()].map((m) => ({
            ...m.word,
            id: m.id ?? `draft:${m.key}`,
          }));
          n.message = 'Multiple entries match. Choose the word to reuse.';
          n.messageKind = 'status';
        }
        return n;
      };
      this.previewChanges = [];
      for (const { values: v } of rows) {
        const language = v.language?.trim() || this.defaults.language;
        if (v.traditional?.trim() && !language.toLowerCase().startsWith('zh'))
          throw new Error('Traditional variants require a Chinese entry language.');
        const n = find(v.spelling.trim(), language, v.traditional?.trim());
        const before = n.saved ? copy(n.saved) : undefined;
        const provided: Partial<WordInput> = {
          spelling: [
            { language, text: v.spelling.trim() },
            ...(v.traditional?.trim() ? [{ language: 'zh-Hant', text: v.traditional.trim() }] : []),
          ],
        };
        if (v.pronunciation?.trim()) provided.pronunciation = v.pronunciation;
        if (v.definitions?.trim())
          provided.definition = v.definitions.split('\n').filter((d) => d.trim());
        if (v.derivation?.trim()) provided.derivation = v.derivation;
        const metadata: NonNullable<WordInput['metadata']> = {};
        for (const field of ['hskLevel', 'jlptLevel'] as const)
          if (v[field]?.trim()) metadata[field] = Number(v[field]);
        if (Object.keys(metadata).length) provided.metadata = metadata;
        n.word = applyProvided(n.word, provided);
        n.staged = true;
        n.provided = {
          ...n.provided,
          ...copy(provided),
          ...(provided.metadata
            ? { metadata: { ...n.provided?.metadata, ...provided.metadata } }
            : {}),
        };
        this.previewChanges.push({ key: n.key, before, provided });
        imported.push({ key: n.key, values: v });
      }
      for (const { key, values: v } of imported) {
        const n = this.node(key),
          language = v.language?.trim() || this.defaults.language;
        for (const relation of ['child', 'sibling'] as const) {
          for (const spelling of componentSpellings(
            v[relation === 'child' ? 'children' : 'siblings'] ?? ''
          )) {
            const target = find(spelling, language);
            if (target === n || (relation === 'child' && this.childReaches(target.key, n.key)))
              throw new Error(
                `The relationship from ${v.spelling} to ${spelling} would be circular.`
              );
            if (!n.edges[relation].includes(target.key)) n.edges[relation].push(target.key);
            if (relation === 'child') referenced.add(target.key);
          }
        }
      }
      this.roots = [...new Set(imported.map((r) => r.key))];
      this.selected = new Set(
        imported
          .filter(({ key, values: v }) =>
            v.root?.trim()
              ? ['true', '1'].includes(v.root.trim().toLowerCase())
              : !referenced.has(key)
          )
          .map((r) => r.key)
      );
      for (const key of this.selected) {
        const n = this.node(key);
        if (!n.id) {
          n.word.metadata = {
            ...(!n.provided?.metadata
              ? {
                  ...(this.defaults.hskLevel ? { hskLevel: this.defaults.hskLevel } : {}),
                  ...(this.defaults.jlptLevel ? { jlptLevel: this.defaults.jlptLevel } : {}),
                }
              : {}),
            ...n.word.metadata,
          };
        }
      }
      this.path = [[...this.selected][0] ?? this.roots[0]];
      this.batch = true;
      this.validation = false;
      this.error = '';
      this.changed();
      this.onNavigate?.();
    } catch (error) {
      this.nodes = new Map(old.nodes);
      this.roots = old.roots;
      this.selected = new Set(old.selected);
      this.path = old.path;
      this.sequence = old.sequence;
      this.batch = old.batch;
      this.previewChanges = old.previewChanges;
      throw error;
    }
  }
  private async refreshBatch(next: boolean) {
    try {
      const words = await this.api.refreshVocabulary?.();
      if (words) this.vocabulary = new Map(words.map((w) => [w.id, w]));
      for (const n of [...this.nodes.values()])
        if (n.id) {
          const fresh = this.vocabulary.get(n.id);
          if (!fresh) throw new Error('A reused entry no longer exists. Review this batch.');
          const edits = n.saved ? diff(n.word, n.saved) : {};
          n.word = applyProvided(applyProvided(input(fresh), edits), n.provided ?? {});
          n.saved = input(fresh);
          const prior = copy(n.edges);
          this.loadEdges(n, fresh);
          for (const rel of ['child', 'sibling'] as const)
            n.edges[rel] = [...new Set([...n.edges[rel], ...prior[rel]])];
        }
      // Include newly saved matches before allocating any additional dictionary identities.
      for (const n of [...this.nodes.values()])
        if (!n.id) {
          const matches = [...this.vocabulary.values()].filter((w) =>
            n.word.spelling.some((s) => spellingMatches(w, s.text, s.language))
          );
          if (matches.length > 1) {
            n.matches = matches;
            n.message = 'Choose a matching entry before publishing.';
            n.messageKind = 'error';
            this.path = this.findPath(n.key) ?? [n.key];
            this.onNavigate?.();
          }
          if (matches.length > 1)
            throw new Error(
              `Multiple entries now match ${n.word.spelling[0]?.text}. Review the matches before publishing.`
            );
          if (matches.length === 1 && !this.reuse(this.view(n.key, 'root'), matches[0]))
            throw new Error(
              'A refreshed match would create a circular relationship. Review the batch.'
            );
        }
      this.batchValidated = true;
      this.work = Promise.resolve();
      return await this.finish(next);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not refresh vocabulary.';
      this.lifecycle = { kind: 'failed', action: 'finish', message: this.error };
      this.changed();
    } finally {
      this.batchRefreshing = false;
      this.batchValidated = false;
      this.emit();
    }
  }
}
