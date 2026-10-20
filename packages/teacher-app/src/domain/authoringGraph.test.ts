import { describe, it, expect, vi } from 'vitest';
import type { Word } from '@mandarinko/core';
import { WordEditorSession } from './wordEditorSession';
import type { EditorDraftStore } from './editorDraftStore';
const word = (
  id: string,
  text: string,
  childrenIds: string[] = [],
  language = 'zh-Hans'
): Word => ({
  id,
  spelling: [{ language, text }],
  pronunciation: `${text} reading`,
  definition: [`${text} definition`],
  ...(childrenIds.length ? { childrenIds } : {}),
});
const seed = [
  word('female', '女'),
  word('child', '子'),
  word('again', '又'),
  {
    ...word('study', '学', ['child']),
    spelling: [
      { language: 'zh-Hans', text: '学' },
      { language: 'zh-Hant', text: '學' },
    ],
  },
  word('japanese', '学', [], 'ja'),
];
function fixture(words = seed, root?: Word) {
  const records = new Map<string, string>();
  const store: EditorDraftStore = {
    read: (k) => records.get(k) ?? null,
    write: (k, v) => {
      records.set(k, v);
    },
    remove: (k) => {
      records.delete(k);
    },
  };
  const entries = new Map(words.map((w) => [w.id, structuredClone(w)]));
  const api = {
    createWord: vi.fn(async (value: Omit<Word, 'id'>, key?: string) => {
      const w = entries.get(key!) ?? { ...structuredClone(value), id: key! };
      entries.set(w.id, w);
      return w;
    }),
    updateWord: vi.fn(async (id: string, patch: Partial<Word>) => {
      const w = { ...entries.get(id)!, ...structuredClone(patch) };
      entries.set(id, w);
      return w;
    }),
    refreshVocabulary: vi.fn(async () => [...entries.values()]),
  };
  let seq = 0;
  const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
  const open = () => new WordEditorSession(root, [...entries.values()], api, store, uuid);
  return { session: open(), open, records, entries, api };
}
const input = (text: string) => ({
  spelling: [{ language: 'zh-Hans', text }],
  pronunciation: `${text} reading`,
  definition: [`${text} definition`],
});
describe('recursive authoring graph', () => {
  it('shares canonical nodes, aliases and saved descendants across roots without losing four levels', async () => {
    const tree = [
      word('a', '甲', ['b']),
      word('b', '乙', ['c']),
      word('c', '丙', ['d']),
      word('d', '丁'),
    ];
    const { session: s, api, entries } = fixture([...seed, ...tree]);
    s.previewPaste('spelling\tchildren\tpronunciation\n甲\t乙\tcorrected\n乙\t\t');
    expect(api.updateWord).not.toHaveBeenCalled();
    await s.finish();
    expect(s.lifecycle.kind).toBe('closed');
    expect(entries.get('a')!.pronunciation).toBe('corrected');
    expect(entries.get('a')!.childrenIds).toEqual(['b']);
    expect(entries.get('b')!.childrenIds).toEqual(['c']);
    expect(entries.get('c')!.childrenIds).toEqual(['d']);
    expect(api.createWord).not.toHaveBeenCalled();
  });
  it('reuses shared 女 子 又 and Chinese aliases, preserving Japanese identity', async () => {
    const { session: s, entries, api } = fixture();
    s.previewPaste(
      'spelling\tpronunciation\tdefinitions\tchildren\tlanguage\n妈妈\tma1ma\tmother\t女,子,又\tzh-Hans\n好\thao3\tgood\t女,子\tzh-Hans\n学校\txue2xiao4\tschool\t學,又\tzh-Hans\n学\tgaku\tlearning\t\tja'
    );
    await s.finish();
    expect(s.lifecycle.kind).toBe('closed');
    expect(api.createWord).toHaveBeenCalledTimes(3);
    const values = [...entries.values()];
    expect(values.find((w) => w.spelling[0].text === '妈妈')!.childrenIds).toEqual([
      'female',
      'child',
      'again',
    ]);
    expect(values.find((w) => w.spelling[0].text === '学校')!.childrenIds).toEqual([
      'study',
      'again',
    ]);
    expect(entries.get('japanese')!.pronunciation).toBe('gaku');
  });
  it('keeps nested descendants local until root Create, restores navigation and view', async () => {
    const { session: s, open, api } = fixture();
    s.change(s.rows[0], input('学校'));
    const rootKey = s.activeKey;
    s.captureView({ label: 'Main word: Derivation', start: 2, end: 4, scroll: 83 });
    const [child] = s.addComponents('教');
    s.openComponents(child);
    s.change(s.rows[0], input('教'));
    s.addComponents('又');
    const childKey = s.activeKey;
    await s.close();
    expect(api.createWord).not.toHaveBeenCalled();
    const restored = open();
    expect(restored.activeKey).toBe(childKey);
    expect(restored.breadcrumbs.map((c) => c.text)).toEqual(['学校', '教']);
    restored.returnTo(0);
    expect(restored.currentView).toEqual({
      label: 'Main word: Derivation',
      start: 2,
      end: 4,
      scroll: 83,
    });
    expect(restored.restoreLocation(restored.workspaceId, childKey)).toBe(true);
    expect(restored.breadcrumbs.map((c) => c.key)).toEqual([rootKey, childKey]);
    expect(restored.restoreLocation('missing', childKey)).toBe(false);
    restored.returnTo(0);
    await restored.finish();
    expect(api.createWord).toHaveBeenCalledTimes(2);
    expect(api.createWord.mock.calls.every(([w]) => !w.childrenIds && !w.siblingIds)).toBe(true);
  });
  it('makes component lists idempotent and shares edits across relationships', async () => {
    const { session: s } = fixture();
    s.change(s.rows[0], input('好'));
    s.addComponents('女,子,女');
    s.addComponents('子；女');
    expect(s.rows.filter((r) => r.relation === 'child').map((r) => r.id)).toEqual([
      'female',
      'child',
    ]);
    s.addComponents('女', 'sibling');
    const female = s.rows.find((r) => r.relation === 'child' && r.id === 'female')!;
    s.change(female, { pronunciation: 'corrected' });
    expect(s.rows.find((r) => r.relation === 'sibling')!.word.pronunciation).toBe('corrected');
  });
  it('blocks self-links and newly introduced child cycles but allows independent sibling links', () => {
    const { session: s } = fixture(seed, seed[3]);
    s.addComponents('學');
    expect(s.rows.at(-1)!.messageKind).toBe('error');
    const child = s.rows.find((r) => r.id === 'child')!;
    s.openComponents(child);
    s.addComponents('学');
    expect(s.rows.at(-1)!.messageKind).toBe('error');
    expect(() => s.previewPaste('spelling\tchildren\n甲\t乙\n乙\t甲')).toThrow('circular');
  });
  it('applies session defaults only to new roots, retains settings on next, and ends without deleting drafts', async () => {
    const { session: s, open } = fixture();
    s.configure({ name: 'HSK', language: 'zh-Hant', hskLevel: 1 });
    s.change(s.rows[0], input('好'));
    const [child] = s.addComponents('新');
    expect(child.word.metadata).toBeUndefined();
    s.change(child, input('新'));
    await s.finish(true);
    expect(s.rows[0].word.metadata?.hskLevel).toBe(1);
    expect(s.defaults.name).toBe('HSK');
    s.change(s.rows[0], { pronunciation: 'unfinished' });
    s.endEntrySession();
    await s.close();
    const r = open();
    expect(r.defaults.name).toBe('');
    expect(r.rows[0].word.pronunciation).toBe('unfinished');
  });
  it('preserves blank fields and adds variants/relationships while applying provided corrections', async () => {
    const { session: s, entries } = fixture();
    s.previewPaste(
      'spelling\ttraditional\tpronunciation\tdefinitions\tchildren\n学\t斈\tcorrected\t\t又'
    );
    await s.finish();
    expect(entries.get('study')!.definition).toEqual(['学 definition']);
    expect(entries.get('study')!.pronunciation).toBe('corrected');
    expect(entries.get('study')!.childrenIds).toEqual(['child', 'again']);
    expect(entries.get('study')!.spelling.map((s) => s.text)).toEqual(['学', '學', '斈']);
  });
  it('keeps batch edits staged, including deeper reused descendants and Close', async () => {
    const { session: s, api, open } = fixture();
    s.previewPaste('spelling\n学');
    s.openComponents(s.rows.find((r) => r.id === 'child')!);
    s.change(s.rows[0], { pronunciation: 'preview only' });
    await s.commit(s.rows[0]);
    await s.close();
    expect(api.updateWord).not.toHaveBeenCalled();
    const r = open();
    expect(r.rows[0].word.pronunciation).toBe('preview only');
  });
  it('refreshes new matches and never duplicates a word saved since preview', async () => {
    const { session: s, entries, api } = fixture();
    s.previewPaste('spelling\tpronunciation\tdefinitions\n好\thao\tgood');
    entries.set('new-server', word('new-server', '好', ['female']));
    await s.finish();
    expect(api.createWord).not.toHaveBeenCalled();
    expect(entries.get('new-server')!.childrenIds).toEqual(['female']);
    expect(entries.get('new-server')!.pronunciation).toBe('hao');
  });
  it('requires choice for ambiguous matches before any publication', async () => {
    const { session: s, api } = fixture([...seed, word('female2', '女')]);
    s.previewPaste('spelling\tpronunciation\tdefinitions\tchildren\n好\thao\tgood\t女');
    await s.finish();
    expect(api.createWord).not.toHaveBeenCalled();
    expect(s.error || s.validation).toBeTruthy();
  });
  it('opens the incomplete descendant at validation and does not create any node', async () => {
    const { session: s, api } = fixture();
    s.change(s.rows[0], input('好'));
    const [child] = s.addComponents('新');
    s.openComponents(child);
    s.addComponents('未');
    s.returnTo(0);
    await s.finish();
    expect(api.createWord).not.toHaveBeenCalled();
    expect(s.validation).toBe(true);
  });
  it('retains exact creation identities on explicit retry after partial failure', async () => {
    const { session: s, api, entries, open } = fixture();
    s.previewPaste('spelling\tpronunciation\tdefinitions\tchildren\n好\thao\tgood\t女');
    api.createWord.mockImplementationOnce(async (value, key) => {
      entries.set(key!, { ...value, id: key! });
      throw new Error('Lost acknowledgment');
    });
    await s.finish();
    expect(s.lifecycle.kind).toBe('failed');
    const r = open();
    expect(api.createWord).toHaveBeenCalledTimes(1);
    await r.retry();
    expect(api.createWord.mock.calls[1]).toEqual(api.createWord.mock.calls[0]);
    expect([...entries.values()].filter((w) => w.spelling[0].text === '好')).toHaveLength(1);
    expect(r.lifecycle.kind).toBe('closed');
  });
});

describe('batch refresh authority', () => {
  it('retains explicitly supplied unchanged values after concurrent server corrections, preserving unrelated fresh values', async () => {
    const { session: s, entries } = fixture();
    s.previewPaste('spelling\tpronunciation\thskLevel\n学\t学 reading\t1');
    entries.set('study', {
      ...entries.get('study')!,
      pronunciation: 'concurrent',
      definition: ['fresh definition'],
      metadata: { hskLevel: 4, frequency: 100 },
      spelling: [...entries.get('study')!.spelling, { language: 'zh-Hant', text: '斈' }],
    });
    await s.finish();
    expect(entries.get('study')!.pronunciation).toBe('学 reading');
    expect(entries.get('study')!.definition).toEqual(['fresh definition']);
    expect(entries.get('study')!.metadata).toEqual({ hskLevel: 1, frequency: 100 });
    expect(entries.get('study')!.spelling.map((s) => s.text)).toEqual(['学', '學', '斈']);
  });
  it('resolves an existing traditional alias when the supplied simplified spelling is new', async () => {
    const { session: s, entries, api } = fixture([word('traditional', '媽', [], 'zh-Hant')]);
    s.previewPaste('spelling\ttraditional\n妈\t媽');
    await s.finish();
    expect(api.createWord).not.toHaveBeenCalled();
    expect(entries.get('traditional')!.spelling.map((s) => s.text)).toEqual(['媽', '妈']);
  });
  it('does not publish after failed vocabulary refresh and requires deliberate retry', async () => {
    const { session: s, api } = fixture();
    s.previewPaste('spelling\tpronunciation\tdefinitions\n好\thao\tgood');
    api.refreshVocabulary.mockRejectedValueOnce(new Error('Unavailable'));
    await s.finish();
    expect(api.createWord).not.toHaveBeenCalled();
    expect(s.lifecycle.kind).toBe('failed');
    await s.retry();
    expect(s.lifecycle.kind).toBe('closed');
  });
});

describe('workspace upgrade and view identity', () => {
  it('converts v1 drafts without publishing and leaves the old record when storage conversion fails', () => {
    const { records, open, api } = fixture();
    const old = {
      version: 1,
      rows: [
        {
          key: 1,
          relation: 'root',
          requestKey: '00000000-0000-4000-8000-000000009999',
          word: input('好'),
          message: '',
          matches: [],
        },
      ],
      linked: { childrenIds: [], siblingIds: [] },
      unlinked: [],
      publish: [],
      error: '',
    };
    const raw = JSON.stringify(old);
    records.set('new', raw);
    const converted = open();
    expect(converted.rows[0].word.spelling[0].text).toBe('好');
    expect(records.get('new')).toBe(raw);
    expect(api.createWord).not.toHaveBeenCalled();
    converted.captureView({ scroll: 23 });
    expect(JSON.parse(records.get('new')!).version).toBe(2);
    records.set('new', raw);
    const store: EditorDraftStore = {
      read: (k) => records.get(k) ?? null,
      write: () => {
        throw new Error('Quota');
      },
      remove: () => undefined,
    };
    const failed = new WordEditorSession(undefined, seed, api, store);
    failed.captureView({ scroll: 0 });
    expect(records.get('new')).toBe(raw);
    expect(failed.storageError).toContain('could not');
  });
  it('retains selection and history identities when a viewed draft resolves to a saved node', async () => {
    const { session: s, open } = fixture();
    s.change(s.rows[0], input('好'));
    const [child] = s.addComponents('新');
    s.openComponents(child);
    const oldKey = s.activeKey;
    s.captureView({ label: 'Main word: Spelling 1', start: 0, end: 1, scroll: 19 });
    s.reuse(s.rows[0], seed[0]);
    await s.close();
    const r = open();
    expect(r.storageError).toBe('');
    expect(r.currentView?.scroll).toBe(19);
    expect(r.restoreLocation(r.workspaceId, oldKey)).toBe(true);
    expect(r.rows[0].id).toBe('female');
  });
});

it('autosaves a resolved component list on an existing parent without creating missing drafts', async () => {
  const { session: s, api, entries } = fixture(seed, seed[3]);
  s.addComponents('女,新');
  await s.commit(s.rows[0]);
  expect(entries.get('study')!.childrenIds).toEqual(['child', 'female']);
  expect(api.createWord).not.toHaveBeenCalled();
});

it('normalizes the same saved child and sibling identity while converting a flat draft', () => {
  const { records, open } = fixture();
  const scalar = (({ id: _id, ...rest }) => rest)(seed[0]);
  const row = (key: number, relation: string, id?: string) => ({
    key,
    relation,
    id,
    requestKey: `00000000-0000-4000-8000-${String(key).padStart(12, '0')}`,
    word: id ? scalar : input('好'),
    saved: id ? scalar : undefined,
    message: '',
    matches: [],
  });
  records.set(
    'new',
    JSON.stringify({
      version: 1,
      rows: [row(1, 'root'), row(2, 'child', 'female'), row(3, 'sibling', 'female')],
      linked: { childrenIds: [], siblingIds: [] },
      unlinked: [],
      publish: [],
      error: '',
    })
  );
  const s = open();
  expect(s.storageError).toBe('');
  expect(s.rows[1].key).toBe(s.rows[2].key);
  s.change(s.rows[1], { pronunciation: 'shared' });
  expect(s.rows[2].word.pronunciation).toBe('shared');
});

it('starts component rows in their parent language without inheriting proficiency levels', () => {
  const { session: s } = fixture(seed, seed[4]);
  s.configure({ name: 'Other session', language: 'zh-Hans', hskLevel: 1 });
  const child = s.addRow('child')!;
  expect(child.word.spelling[0].language).toBe('ja');
  expect(child.word.metadata).toBeUndefined();
});
