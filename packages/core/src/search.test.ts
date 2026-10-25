import { describe, expect, it } from 'vitest';
import { createEntrySearch, matchesEntry } from './search.js';

describe('compiled entry search', () => {
  it('preserves scalar, field-name, multi-term and multilingual matching in catalog order', () => {
    const entries = [
      { id: 'a', spelling: '食べる', pronunciation: 'たべる', definition: ['To eat'] },
      { id: 'b', spelling: '食', metadata: { level: 5 }, definition: ['Food'] },
    ];
    const search = createEntrySearch(entries);
    for (const query of ['', '  ', ' 食 ', 'TO EAT', 'たべる', 'level 5', 'definition', 'absent'])
      expect(search(query)).toEqual(entries.filter((entry) => matchesEntry(entry, query)));
  });
  it('does not let callers mutate the catalog through empty-query results', () => {
    const entries = Object.freeze([{ id: 'a' }, { id: 'b' }]);
    const search = createEntrySearch(entries);
    search(' ').pop();
    expect(search('')).toEqual(entries);
    expect(entries).toHaveLength(2);
  });
});
