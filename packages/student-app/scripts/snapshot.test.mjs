import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { snapshot, safeJson } from './snapshot.mjs';
test('snapshot is deterministic and preserves every canonical field and ID', async () => {
  const input = JSON.parse(
    await readFile(new URL('../../server/vocabulary.json', import.meta.url), 'utf8')
  );
  const before = JSON.stringify(input);
  const a = snapshot(input),
    b = snapshot(input);
  assert.deepEqual(a, b);
  assert.equal(a.words.length, Object.keys(input).length);
  for (const word of a.words) {
    const expected = { ...input[word.id], id: word.id };
    for (const field of ['childrenIds', 'siblingIds'])
      if (Array.isArray(expected[field])) expected[field] = expected[field].map(String);
    assert.deepEqual(word, expected);
  }
  assert.equal(JSON.stringify(input), before);
});
test('invalid data fails before publication and embedded HTML cannot terminate JSON', () => {
  assert.throws(() => snapshot([]), /object/);
  assert.throws(() => snapshot({ bad: null }), /bad/);
  assert.throws(
    () => snapshot({ bad: { spelling: [], definition: [], pronunciation: '' } }),
    /spelling/
  );
  assert.equal(safeJson({ text: '</script>\u2028' }).includes('<'), false);
  assert.deepEqual(JSON.parse(safeJson({ text: '</script>' })), { text: '</script>' });
});
