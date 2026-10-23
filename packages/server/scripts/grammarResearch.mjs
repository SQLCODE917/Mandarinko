import { format, resolveConfig } from 'prettier';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  normalizeGrammarForm,
  constructionKey,
  matchGrammarItem,
  suggestGrammarPatterns,
  parseGrammarMap,
  parseGrammarData,
  grammarCoverage,
  symmetricRelationship,
} from '@mandarinko/core';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async (file) => JSON.parse(await readFile(file, 'utf8'));
const formatting = await resolveConfig(path.join(base, 'grammar.json'));
const writeJSON = async (file, value) =>
  writeFile(file, await format(JSON.stringify(value), { ...formatting, parser: 'json' }));
// Not a conjugator: remove only grammar-slot typography and trailing omission marks.
export const resolveItem = (form, meaning, patterns) =>
  matchGrammarItem({ form, meaning }, patterns);
export function deriveRelationships(data) {
  const result = [];
  const seen = new Set();
  const add = (from, to, type, unit, itemIds, basis, rationale) => {
    if (from === to) return;
    if (symmetricRelationship(type) && from > to) [from, to] = [to, from];
    const id = `${unit}:${type}:${from}:${to}`;
    if (seen.has(id)) return;
    seen.add(id);
    result.push({ id, fromId: from, toId: to, type, unitId: unit, itemIds, basis, rationale });
  };
  for (const unit of data.units.filter((u) => u.instructional)) {
    const items = data.items.filter((i) => i.unitId === unit.id && i.patternId);
    for (let a = 0; a < items.length; a++)
      for (let b = a + 1; b < items.length; b++)
        add(
          items[a].patternId,
          items[b].patternId,
          'taughtTogether',
          unit.id,
          [items[a].id, items[b].id],
          'coOccurrence',
          'Both constructions occur in this instructional unit; co-teaching does not imply prerequisite status.'
        );
  }
  for (const source of data.sources) {
    const seenPatterns = new Set();
    let previous = [];
    for (const unit of data.units
      .filter((u) => u.sourceId === source.id && u.instructional)
      .sort((a, b) => a.order - b.order)) {
      const current = data.items.filter(
        (i) => i.unitId === unit.id && i.patternId && !seenPatterns.has(i.patternId)
      );
      for (const item of current) seenPatterns.add(item.patternId);
      if (!current.length) continue;
      for (const a of previous)
        for (const b of current)
          add(
            a.patternId,
            b.patternId,
            'introducedEarlier',
            unit.id,
            [a.id, b.id],
            'sequence',
            'First introductions in consecutive resolved instructional groups of this curriculum; this is observed order, not a prerequisite.'
          );
      previous = current;
    }
  }
  return result.sort((a, b) => a.id.localeCompare(b.id));
}
export async function generate({ writeCatalog = false, output = base, input = base } = {}) {
  const inventory = await read(path.join(input, 'research/grammar/inventory.json'));
  const decisions = await read(path.join(input, 'research/grammar/decisions.json'));
  const catalog = parseGrammarData(await read(path.join(input, 'grammar.json')));
  const patterns = catalog.patterns;
  const sourceDetails = [
    [
      'genki',
      'GENKI third edition grammar syllabus',
      'https://bookclub2.japantimes.co.jp/download/files/genki3/genki-3rd_syllabus_E.pdf',
      'Third edition',
      'genki.pdf',
      'genki-3',
    ],
    [
      'kanzen',
      'Shin Kanzen Master Grammar N3 contents',
      'https://www.3anet.co.jp/np/books/3604/',
      'ISBN 9784883196104',
      'kanzen.html',
      'kanzen-n3',
    ],
    [
      'irodori',
      'Irodori compiled Grammar Notes',
      'https://www.irodori.jpf.go.jp/assets/data/Grammar_all.pdf',
      'Starter, Elementary 1/2, Pre-Intermediate snapshot',
      'irodori.pdf',
      'irodori',
    ],
    [
      'kanzen-teaching',
      'N3 author teaching guide',
      'https://plus.3anet.co.jp/japanese-edu/koza035-01/',
      '2017-11-28',
      'kanzen-teaching.html',
      'kanzen-n3',
    ],
    [
      'editorial',
      'Mandarinko editorial comparisons',
      'https://github.com/SQLCODE917/Mandarinko',
      'Local authoring',
      null,
      'editorial',
    ],
  ];
  const sources = sourceDetails.map(([id, title, url, edition, file, curriculum]) => ({
    id,
    title,
    url,
    edition,
    curriculum,
    retrievedAt: inventory.retrievedAt,
    ...(file ? { sha256: inventory.sha256[file] } : {}),
  }));
  const units = inventory.units.map(({ forms, ...u }) => u);
  units.push({
    id: 'editorial-comparisons',
    sourceId: 'editorial',
    order: 0,
    title: 'Editorial comparisons',
    locator: 'Authored in Mandarinko',
    instructional: false,
  });
  const items = [];
  const review = [];
  for (const u of inventory.units) {
    for (const [position, entry] of u.forms.entries()) {
      const form = typeof entry === 'string' ? entry : entry.form;
      const id = `${u.id}-${position + 1}`;
      const meaning = decisions.glosses?.[form] ?? (/\p{Script=Latin}/u.test(form) ? form : '');
      const result = resolveItem(form, meaning, patterns);
      const decision = decisions.matches[id];
      if (decision && decision.form !== form)
        throw new Error(`Reviewed source form changed: ${id}`);
      const patternId = decision ? decision.patternId : result.patternId;
      const suggestions = result.candidates.length
        ? result.candidates
        : suggestGrammarPatterns(form, patterns);
      const status =
        decision?.status ??
        (patternId
          ? 'resolved'
          : suggestions.length || constructionKey(form).length < 2
            ? 'review'
            : !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(
                  form.normalize('NFKC')
                )
              ? 'review'
              : 'backfill');
      items.push({
        id,
        unitId: u.id,
        position,
        form,
        meaning,
        locator: typeof entry === 'object' ? entry.locator : u.locator,
        ...(patternId ? { patternId } : {}),
        status,
      });
      if (status !== 'resolved')
        review.push({
          itemId: id,
          status,
          form,
          sourceId: u.sourceId,
          locator: `${u.locator}${typeof entry === 'object' ? `, ${entry.locator}` : ''}`,
          candidates: suggestions,
          reason:
            decision?.reason ??
            (result.candidates.length
              ? 'Sense or construction identity needs review.'
              : 'No safe construction match; review extraction and candidate backfill.'),
        });
    }
  }
  const data = { schemaVersion: 1, sources, units, items, relationships: [] };
  data.relationships = deriveRelationships(data);
  for (const explicit of decisions.explicit) {
    const unitId = explicit.id;
    units.push({
      id: unitId,
      sourceId: explicit.sourceId,
      order: explicit.order,
      title: explicit.title,
      locator: explicit.locator,
      instructional: false,
    });
    const itemIds = [];
    for (const [position, endpoint] of explicit.endpoints.entries()) {
      const id = `${unitId}-${position + 1}`;
      itemIds.push(id);
      items.push({
        id,
        unitId,
        position,
        form: endpoint.form,
        meaning: endpoint.meaning,
        locator: explicit.locator,
        patternId: endpoint.patternId,
        status: 'resolved',
      });
    }
    let [fromId, toId] = explicit.endpoints.map((e) => e.patternId);
    if (symmetricRelationship(explicit.type) && fromId > toId) [fromId, toId] = [toId, fromId];
    data.relationships.push({
      id: explicit.id,
      fromId,
      toId,
      type: explicit.type,
      unitId,
      itemIds,
      basis: 'explicit',
      rationale: explicit.rationale,
    });
  }
  // Editorial rows are durable input, never overwritten by source regeneration.
  let old = [];
  try {
    old = (await read(path.join(input, 'grammar.relationships.json'))).relationships.filter(
      (r) => r.basis === 'editorial'
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const editorial = new Map(old.map((r) => [r.id, r]));
  data.relationships.push(...[...editorial.values()].sort((a, b) => a.id.localeCompare(b.id)));
  const normalized = patterns.map((p) => {
    const seen = new Set();
    const sourceAliases = items
      .filter(
        (item) =>
          item.patternId === p.id &&
          /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(item.form) &&
          !/[\p{Script=Latin}()（）/／・]/u.test(item.form)
      )
      .map((item) => ({
        language: 'ja',
        text: item.form
          .normalize('NFKC')
          .replace(/[～~]/gu, '〜')
          .replace(/[.…]+$/gu, '')
          .trim(),
      }));
    return {
      ...p,
      spelling: [...p.spelling, ...sourceAliases].filter((s) => {
        const key = `${s.language}:${normalizeGrammarForm(s.text)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    };
  });
  parseGrammarMap(data, normalized);
  const conflicts = [];
  const earlier = new Map();
  for (const r of data.relationships.filter((r) => r.type === 'introducedEarlier')) {
    const reverse = earlier.get(`${r.toId}:${r.fromId}`);
    if (reverse)
      conflicts.push({
        kind: 'sourceOrderDifference',
        assertionIds: [reverse.id, r.id],
        reason:
          'Curricula introduce this pair in different orders; retain both source observations.',
      });
    earlier.set(`${r.fromId}:${r.toId}`, r);
  }
  const proposals = decisions.proposals;
  const report = {
    schemaVersion: 1,
    coverage: grammarCoverage(normalized, data),
    items: review,
    conflicts,
    proposals,
  };
  await mkdir(output, { recursive: true });
  for (const [file, key] of [
    ['sources', 'sources'],
    ['units', 'units'],
    ['source-items', 'items'],
    ['relationships', 'relationships'],
  ])
    await writeJSON(path.join(output, `grammar.${file}.json`), {
      schemaVersion: 1,
      [key]: data[key],
    });
  const reportDirectory = path.join(output, 'research-results');
  await mkdir(reportDirectory, { recursive: true });
  await writeJSON(path.join(reportDirectory, 'grammar.review.json'), report);
  const backfill = review.filter((i) => i.status === 'backfill');
  await writeFile(
    path.join(reportDirectory, 'grammar.review.txt'),
    [
      'Grammar reference coverage',
      JSON.stringify(
        { ...report.coverage, unmatchedPatternIds: report.coverage.unmatchedPatternIds.length },
        null,
        2
      ),
      '',
      'REVIEW: ambiguous or unmatched source items',
      ...review
        .filter((i) => i.status === 'review')
        .map(
          (i) =>
            `${i.itemId}: ${i.form} — ${i.locator}; candidates: ${i.candidates.join(', ') || 'none'}`
        ),
      '',
      'BACKFILL CANDIDATES (unconfirmed; never auto-created)',
      ...backfill.map(
        (i) =>
          `${i.itemId}: ${i.form} — ${i.locator}; nearby candidates: ${i.candidates.join(', ') || 'none'}`
      ),
      '',
      'SOURCE ORDER DIFFERENCES',
      ...conflicts.map((i) => i.assertionIds.join(' / ')),
      '',
      'UNMATCHED CATALOG PATTERNS',
      ...report.coverage.unmatchedPatternIds.map(
        (id) => `${id}: ${patterns.find((p) => p.id === id).title}`
      ),
      '',
      'SPLIT / MERGE / PREREQUISITE PROPOSALS',
      ...proposals.map((i) => `${i.kind}: ${i.patternIds.join(', ')} — ${i.reason}`),
      '',
    ].join('\n')
  );
  if (writeCatalog)
    await writeJSON(path.join(input, 'grammar.json'), { ...catalog, patterns: normalized });
  return { data, report };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { report } = await generate({
    writeCatalog: process.argv.includes('--normalize'),
    output: process.argv.find((v) => v.startsWith('--output='))?.slice(9) ?? base,
    input: process.argv.find((v) => v.startsWith('--input='))?.slice(8) ?? base,
  });
  console.log(JSON.stringify(report.coverage));
}
