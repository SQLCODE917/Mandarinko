import type { Word } from '@mandarinko/core';

export type WordInput = Omit<Word, 'id'> & { id?: string };
export type WordEntity = Word & { id: string };

type TraversalMode = 'view' | 'edit' | 'create';
type RelationType = 'child' | 'sibling';

type Cursor = {
  id: string;
  mode: TraversalMode;
};

type LinkInfo = {
  parentId: string;
  type: RelationType;
};

export type NullWord = WordInput & {
  id: string;
  isNull: true;
  link?: LinkInfo;
};

type EngineState = {
  rootId: string | null;
  cursor: Cursor | null;
  history: Cursor[];
  words: Map<string, WordEntity | NullWord>;
};

export type EngineCallbacks = {
  createWord: (word: Omit<Word, 'id'>) => Promise<WordEntity>;
  updateWord: (id: string, updates: Partial<Word>) => Promise<WordEntity>;
  refreshVocabulary: () => Promise<WordEntity[]>;
};

export type RelationViewModel = {
  id: string;
  word: WordEntity | NullWord;
  onEdit: () => void;
  onRemove: () => Promise<void>;
  canRemove: boolean;
};

export type CurrentViewModel = {
  id: string;
  word: WordEntity | NullWord;
  mode: TraversalMode;
  onEdit: () => void;
  onSave: (word: WordInput) => Promise<void>;
  onClose: () => void;
  onAddChild: () => void;
  onAddSibling: () => void;
  onReuseExisting: (word: WordEntity) => Promise<void>;
};

export type ViewModel = {
  current: CurrentViewModel;
  siblings: RelationViewModel[];
  children: RelationViewModel[];
  isRoot: boolean;
};

const createEmptyWord = (): WordInput => ({
  spelling: [{ language: 'zh-Hans', text: '' }],
  pronunciation: '',
  definition: [''],
});

const normalizeIds = (ids?: Array<string | number>) =>
  (ids ?? []).map((id) => String(id)).filter((id) => id.length > 0);

const normalizeWordInput = (word: WordInput): WordInput => ({
  ...word,
  spelling: (word.spelling ?? [{ language: 'zh-Hans', text: '' }]).map((spelling) => ({
    ...spelling,
  })),
  pronunciation: word.pronunciation ?? '',
  definition: (word.definition ?? ['']).map((definition) => definition),
  childrenIds: word.childrenIds ? normalizeIds(word.childrenIds) : undefined,
  siblingIds: word.siblingIds ? normalizeIds(word.siblingIds) : undefined,
});

const normalizeWordEntity = (word: WordEntity): WordEntity => ({
  ...normalizeWordInput(word),
  id: word.id,
});

const isNullWord = (word: WordEntity | NullWord): word is NullWord =>
  Boolean((word as NullWord).isNull);

export class WordTraversalEngine {
  private state: EngineState;
  private callbacks: EngineCallbacks;
  private listeners = new Set<() => void>();
  private tempCounter = 0;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
    this.state = {
      rootId: null,
      cursor: null,
      history: [],
      words: new Map(),
    };
  }

  setCallbacks(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  getState() {
    return this.state;
  }

  getViewModel(): ViewModel | null {
    const { cursor, words, rootId } = this.state;
    if (!cursor) return null;
    const currentWord = words.get(cursor.id);
    if (!currentWord) return null;

    const siblingIds = normalizeIds(currentWord.siblingIds).filter((id) => id !== cursor.id);
    const childIds = normalizeIds(currentWord.childrenIds).filter((id) => id !== cursor.id);

    const buildRelation = (id: string, type: RelationType): RelationViewModel | null => {
      const word = words.get(id);
      if (!word) return null;
      return {
        id,
        word,
        onEdit: () => this.editWord(id),
        onRemove: async () => {
          await this.removeRelation(currentWord.id, id, type);
        },
        canRemove: cursor.mode !== 'view',
      };
    };

    const siblings = siblingIds
      .map((id) => buildRelation(id, 'sibling'))
      .filter((entry): entry is RelationViewModel => Boolean(entry));
    const children = childIds
      .map((id) => buildRelation(id, 'child'))
      .filter((entry): entry is RelationViewModel => Boolean(entry));

    return {
      current: {
        id: cursor.id,
        word: currentWord,
        mode: cursor.mode,
        onEdit: () => this.editWord(cursor.id),
        onSave: (word) => this.saveCurrent(word),
        onClose: () => this.close(),
        onAddChild: () => this.addRelation('child'),
        onAddSibling: () => this.addRelation('sibling'),
        onReuseExisting: (word) => this.reuseExisting(word),
      },
      siblings,
      children,
      isRoot: cursor.id === rootId,
    };
  }

  open(rootId: string | null, words: WordEntity[], mode?: TraversalMode) {
    const nextWords = new Map<string, WordEntity | NullWord>();
    words.forEach((word) => {
      nextWords.set(word.id, normalizeWordEntity(word));
    });

    let cursor: Cursor | null = null;
    let resolvedRootId = rootId;

    if (rootId && nextWords.has(rootId)) {
      cursor = { id: rootId, mode: mode ?? 'view' };
    } else {
      const tempId = this.nextTempId();
      const nullWord: NullWord = {
        ...createEmptyWord(),
        id: tempId,
        isNull: true,
      };
      nextWords.set(tempId, nullWord);
      resolvedRootId = tempId;
      cursor = { id: tempId, mode: mode ?? 'create' };
    }

    this.state = {
      rootId: resolvedRootId ?? null,
      cursor,
      history: [],
      words: nextWords,
    };

    this.emit();
  }

  updateVocabulary(words: WordEntity[]) {
    const nextWords = new Map<string, WordEntity | NullWord>();
    words.forEach((word) => {
      nextWords.set(word.id, normalizeWordEntity(word));
    });

    this.state.words.forEach((word, id) => {
      if (isNullWord(word)) {
        nextWords.set(id, word);
      }
    });

    this.state.words = nextWords;
    this.emit();
  }

  reset() {
    this.state = {
      rootId: null,
      cursor: null,
      history: [],
      words: new Map(),
    };
    this.emit();
  }

  private nextTempId() {
    this.tempCounter += 1;
    return `temp-${this.tempCounter}`;
  }

  private pushHistory() {
    const { cursor } = this.state;
    if (!cursor) return;
    this.state.history = [...this.state.history, cursor];
  }

  close() {
    const { cursor, words } = this.state;
    if (cursor?.mode === 'create') {
      const current = words.get(cursor.id);
      if (current && isNullWord(current) && current.link) {
        const { parentId, type } = current.link;
        const parent = words.get(parentId);
        if (parent) {
          const field = type === 'child' ? 'childrenIds' : 'siblingIds';
          const nextIds = normalizeIds(parent[field]).filter((id) => id !== cursor.id);
          words.set(parent.id, { ...parent, [field]: nextIds });
        }
        words.delete(cursor.id);
      }
    }

    if (this.state.history.length === 0) {
      this.state.cursor = null;
    } else {
      const nextHistory = [...this.state.history];
      const previous = nextHistory.pop() ?? null;
      this.state.history = nextHistory;
      if (previous) {
        this.state.cursor = previous;
      }
    }
    this.emit();
  }

  editWord(id: string) {
    if (!this.state.words.has(id)) return;
    this.pushHistory();
    this.state.cursor = { id, mode: 'edit' };
    this.emit();
  }

  private addRelation(type: RelationType) {
    const { cursor, words } = this.state;
    if (!cursor) return;
    const parent = words.get(cursor.id);
    if (!parent) return;

    const tempId = this.nextTempId();
    const nullWord: NullWord = {
      ...createEmptyWord(),
      id: tempId,
      isNull: true,
      link: { parentId: parent.id, type },
    };

    words.set(tempId, nullWord);
    const updatedParent = this.applyRelationUpdate(parent, type, (ids) => [...ids, tempId]);
    words.set(parent.id, updatedParent);

    this.pushHistory();
    this.state.cursor = { id: tempId, mode: 'create' };
    this.emit();
  }

  private applyRelationUpdate(
    word: WordEntity | NullWord,
    type: RelationType,
    updater: (ids: string[]) => string[]
  ) {
    const field = type === 'child' ? 'childrenIds' : 'siblingIds';
    const currentIds = normalizeIds(word[field]);
    const nextIds = updater(currentIds);
    return {
      ...word,
      [field]: nextIds,
    };
  }

  private replaceRelationId(ids: string[] | undefined, oldId: string, newId: string) {
    const next = (ids ?? []).map((id) => (id === oldId ? newId : id));
    return Array.from(new Set(next));
  }

  private replaceIdEverywhere(oldId: string, newId: string, replacement: WordEntity | NullWord) {
    const nextWords = new Map<string, WordEntity | NullWord>();
    this.state.words.forEach((word, id) => {
      const mappedId = id === oldId ? newId : id;
      if (id === oldId) {
        nextWords.set(newId, replacement);
        return;
      }
      const nextWord = {
        ...word,
        childrenIds: this.replaceRelationId(word.childrenIds, oldId, newId),
        siblingIds: this.replaceRelationId(word.siblingIds, oldId, newId),
      };
      nextWords.set(mappedId, nextWord);
    });
    this.state.words = nextWords;
  }

  private async refreshVocabulary() {
    const refreshed = await this.callbacks.refreshVocabulary();
    const nextWords = new Map<string, WordEntity | NullWord>();
    refreshed.forEach((word) => nextWords.set(word.id, normalizeWordEntity(word)));
    this.state.words.forEach((word, id) => {
      if (isNullWord(word)) {
        nextWords.set(id, word);
      }
    });
    this.state.words = nextWords;
  }

  async saveCurrent(wordInput: WordInput) {
    const { cursor, words } = this.state;
    if (!cursor) return;
    const current = words.get(cursor.id);
    if (!current) return;

    const normalized = normalizeWordInput(wordInput);

    if (cursor.mode === 'edit') {
      const { id: _ignored, ...updates } = normalized as WordInput & { id?: string };
      const updated = await this.callbacks.updateWord(cursor.id, updates);
      words.set(cursor.id, normalizeWordEntity(updated));
      await this.refreshVocabulary();
      this.state.cursor = { id: cursor.id, mode: 'view' };
      this.emit();
      return;
    }

    if (cursor.mode === 'create') {
      const { id: _ignored, ...createPayload } = normalized as WordInput & { id?: string };
      const created = await this.callbacks.createWord(createPayload);
      const replacement = normalizeWordEntity(created);

      const link = isNullWord(current) ? current.link : undefined;
      this.replaceIdEverywhere(cursor.id, created.id, replacement);

      if (link) {
        const parent = this.state.words.get(link.parentId);
        if (parent) {
          const field = link.type === 'child' ? 'childrenIds' : 'siblingIds';
          const nextIds = this.replaceRelationId(parent[field], cursor.id, created.id);
          const updatedParent = {
            ...parent,
            [field]: nextIds,
          };
          this.state.words.set(parent.id, updatedParent);
          if (!isNullWord(parent)) {
            const persisted = await this.callbacks.updateWord(parent.id, { [field]: nextIds });
            this.state.words.set(parent.id, normalizeWordEntity(persisted));
          }
        }
      }

      await this.refreshVocabulary();

      if (this.state.history.length > 0) {
        const nextHistory = [...this.state.history];
        const previous = nextHistory.pop() ?? null;
        this.state.history = nextHistory;
        this.state.cursor = previous;
      } else {
        this.state.cursor = { id: created.id, mode: 'view' };
      }
      this.emit();
    }
  }

  async reuseExisting(existing: WordEntity) {
    const { cursor, words } = this.state;
    if (!cursor) return;
    const current = words.get(cursor.id);
    if (!current || !isNullWord(current) || !current.link) return;

    const link = current.link;
    const parent = words.get(link.parentId);
    if (!parent) return;

    const field = link.type === 'child' ? 'childrenIds' : 'siblingIds';
    const nextIds = this.replaceRelationId(parent[field], cursor.id, existing.id);
    const updatedParent = {
      ...parent,
      [field]: nextIds,
    };
    words.set(parent.id, updatedParent);

    if (!words.has(existing.id)) {
      words.set(existing.id, normalizeWordEntity(existing));
    }

    words.delete(cursor.id);

    if (!isNullWord(parent)) {
      const persisted = await this.callbacks.updateWord(parent.id, { [field]: nextIds });
      words.set(parent.id, normalizeWordEntity(persisted));
    }

    await this.refreshVocabulary();

    if (this.state.history.length > 0) {
      const nextHistory = [...this.state.history];
      const previous = nextHistory.pop() ?? null;
      this.state.history = nextHistory;
      this.state.cursor = previous;
    } else {
      this.state.cursor = { id: parent.id, mode: 'view' };
    }

    this.emit();
  }

  private async removeRelation(parentId: string, targetId: string, type: RelationType) {
    const parent = this.state.words.get(parentId);
    if (!parent) return;
    const field = type === 'child' ? 'childrenIds' : 'siblingIds';
    const nextIds = normalizeIds(parent[field]).filter((id) => id !== targetId);
    const updatedParent = {
      ...parent,
      [field]: nextIds,
    };
    this.state.words.set(parent.id, updatedParent);

    if (this.state.words.has(targetId)) {
      const target = this.state.words.get(targetId);
      if (target && isNullWord(target)) {
        this.state.words.delete(targetId);
      }
    }

    if (!isNullWord(parent)) {
      const persisted = await this.callbacks.updateWord(parent.id, { [field]: nextIds });
      this.state.words.set(parent.id, normalizeWordEntity(persisted));
    }

    await this.refreshVocabulary();
    this.emit();
  }
}
