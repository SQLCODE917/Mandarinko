import { beforeEach, expect, it } from 'vitest';
import { grammarDrafts } from './grammarDrafts';
beforeEach(() => localStorage.clear());
it('upgrades retained comparison drafts without losing pending creation identity or overwriting storage', () => {
  const input = {
    spelling: [{ language: 'ja', text: 'で' }],
    title: 'Location',
    definition: ['At'],
    examples: [],
    contrastIds: ['ni'],
  };
  const raw = JSON.stringify({ draft: input, pendingCreation: input, requestKey: 'original-key' });
  localStorage.setItem('mandarinko:grammar-draft:new', raw);
  const value = grammarDrafts.read('new')!;
  expect(value.requestKey).toBe('original-key');
  expect(value.draft.comparisonIds).toEqual(['ni']);
  expect(value.draft).not.toHaveProperty('contrastIds');
  expect(value.pendingCreation).toEqual(value.draft);
  expect(localStorage.getItem('mandarinko:grammar-draft:new')).toBe(raw);
  grammarDrafts.write('new', value);
  expect(grammarDrafts.read('new')).toEqual(value);
});
it('rejects malformed retained comparison IDs', () => {
  localStorage.setItem(
    'mandarinko:grammar-draft:new',
    JSON.stringify({
      requestKey: 'key',
      draft: { spelling: [], definition: [], examples: [], contrastIds: [null] },
    })
  );
  expect(() => grammarDrafts.read('new')).toThrow('Invalid comparison draft');
});
