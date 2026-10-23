import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generate, resolveItem, deriveRelationships } from './grammarResearch.mjs';

const pattern = (id, form, title) => ({
  id,
  spelling: [{ language: 'ja', text: form }],
  title,
  definition: [title],
  examples: [],
});
test('homographs, competing constructions, and combined senses remain reviewable', () => {
  const items = [
    pattern('progress', '〜ている', 'Action in progress'),
    pattern('habit', '〜ている', 'Habit'),
  ];
  assert.equal(resolveItem('〜ている', '', items).patternId, undefined);
  assert.equal(resolveItem('〜ている', 'habit', items).patternId, 'habit');
  assert.equal(
    resolveItem('〜ことがある', 'experience', [
      pattern('koto-ga-aru', '〜ことがある', 'Experience or occasional occurrence'),
    ]).patternId,
    undefined
  );
  assert.equal(
    resolveItem('V- てください', '', [pattern('request', '〜てください', 'Polite request')])
      .patternId,
    'request'
  );
  assert.equal(
    resolveItem('〜ないで', '', [pattern('request', '〜てください', 'Polite request')]).patternId,
    undefined
  );
});
test('research regeneration is repeatable, complete, and preserves editorial assertions and reviewed decisions', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'grammar-research-'));
  const output = path.join(directory, 'output');
  try {
    await mkdir(path.join(directory, 'research/grammar'), { recursive: true });
    const patterns = [
      pattern('a', '〜てください', 'Request'),
      pattern('b', '〜ている', 'Habit'),
      pattern('c', '〜ている', 'Progress'),
    ];
    await writeFile(
      path.join(directory, 'grammar.json'),
      JSON.stringify({ schemaVersion: 1, patterns })
    );
    await writeFile(
      path.join(directory, 'research/grammar/inventory.json'),
      JSON.stringify({
        retrievedAt: '2026-10-23',
        sha256: {},
        units: [
          {
            id: 'genki-1',
            sourceId: 'genki',
            order: 1,
            title: 'Requests',
            locator: 'p.1',
            instructional: true,
            forms: ['V- てください', '〜ている', '〜あらゆる未知構文'],
          },
        ],
      })
    );
    await writeFile(
      path.join(directory, 'research/grammar/decisions.json'),
      JSON.stringify({
        matches: { 'genki-1-2': { form: '〜ている', patternId: 'b', reason: 'Reviewed sense' } },
        explicit: [],
        proposals: [],
      })
    );
    const editorial = {
      id: 'editorial:a:c',
      fromId: 'a',
      toId: 'c',
      type: 'compared',
      unitId: 'editorial-comparisons',
      itemIds: [],
      basis: 'editorial',
      rationale: 'Preserve this authored assertion.',
    };
    await writeFile(
      path.join(directory, 'grammar.relationships.json'),
      JSON.stringify({ schemaVersion: 1, relationships: [editorial] })
    );
    const before = await readFile(path.join(directory, 'grammar.json'), 'utf8');
    const first = await generate({ input: directory, output });
    const firstBytes = await readFile(path.join(output, 'grammar.relationships.json'), 'utf8');
    const second = await generate({ input: directory, output });
    assert.deepEqual(first, second);
    assert.equal(
      await readFile(path.join(output, 'grammar.relationships.json'), 'utf8'),
      firstBytes
    );
    assert.ok(first.data.relationships.some((r) => r.id === editorial.id));
    assert.equal(first.data.items[1].patternId, 'b');
    assert.equal(first.data.items[2].status, 'backfill');
    assert.equal(first.data.items.length, 3);
    assert.equal(
      first.report.coverage.resolved +
        first.report.coverage.review +
        first.report.coverage.backfill +
        first.report.coverage.outOfScope,
      3
    );
    assert.equal(await readFile(path.join(directory, 'grammar.json'), 'utf8'), before);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('source order uses first introductions and skips repeated introductions', () => {
  const data = {
    sources: [{ id: 's' }],
    units: [
      { id: 'one', sourceId: 's', order: 1, instructional: true },
      { id: 'two', sourceId: 's', order: 2, instructional: true },
      { id: 'three', sourceId: 's', order: 3, instructional: true },
    ],
    items: [
      { id: 'a', unitId: 'one', patternId: 'a' },
      { id: 'repeat-a', unitId: 'two', patternId: 'a' },
      { id: 'b', unitId: 'three', patternId: 'b' },
    ],
  };
  const earlier = deriveRelationships(data).filter((r) => r.type === 'introducedEarlier');
  assert.equal(earlier.length, 1);
  assert.equal(earlier[0].fromId, 'a');
  assert.equal(earlier[0].toId, 'b');
  assert.ok(!deriveRelationships(data).some((r) => r.type === 'buildsOn'));
});
