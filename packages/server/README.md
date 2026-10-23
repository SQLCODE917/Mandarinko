# @mandarinko/server

Express TypeScript server package for the Mandarinko monorepo.

To run the server locally, install dependencies:

```bash
pnpm install
```

Run tests for the server package:

```bash
pnpm --filter @mandarinko/server run test
```

## Catalog APIs and persistence

The word API is mounted at `/api/words`; the flat grammar API is mounted at
`/api/grammar`. Grammar supports list/read (`GET /`, `GET /:id`), creation
(`POST /`) and partial updates (`PATCH /:id`). Requests use core's grammar types
and validation, and reject supplied IDs, unsupported fields, malformed examples
and embedded relationship fields. Missing entries return 404; invalid
requests return 400. Storage failures return 500 without acknowledging a save.

Grammar reads and writes `grammar.json` in the server working directory,
retaining `{ schemaVersion: 1, patterns: [...] }`. Vocabulary continues to use
`vocabulary.json`. `createApp(vocabPath, grammarPath, referenceDirectory?)` accepts separate fixture
paths for tests. Both use the same JSON filesystem adapter, which replaces files
through a temporary file and rename. Grammar serializes writes within one server
process and rereads storage before each mutation. Multiple server processes
writing the same catalog are not supported.

## Creation retries

`POST /api/words` accepts an optional `Idempotency-Key` header containing a UUID
v4. The teacher app persists this key with each draft before creating it. With a
key, the resulting word uses that ID: the first successful creation returns 201,
and repeating the same payload returns the existing word with 200, including
after a server restart. Concurrent copies share their pending save. Reusing a
key with different word data returns 409; malformed keys return 400. Clients
without the header still receive a server-generated ID. Supplying `id` in the
request body remains invalid.

A failed storage write is not reported as success. Retrying the same creation
confirms storage before returning its result. This provides per-word creation
recovery; creating several words and linking them is not a single transaction.

`POST /api/grammar` uses the same UUID v4 `Idempotency-Key` convention: creation
returns 201, repeating identical data returns 200, conflicting data returns 409,
and malformed keys return 400. Recovery remains valid after restarting the server.

## Grammar reference data and research

`GET /api/grammar-map` returns `{ schemaVersion, sources, units, items,
relationships }`, validated against the current grammar catalog. The corresponding
versioned tables are `grammar.sources.json`, `grammar.units.json`,
`grammar.source-items.json` and `grammar.relationships.json`. Source items retain
original headings and locations; resolved items reference catalog IDs. Each
relationship row is a source assertion, so conflicting curricula can coexist.
No layout coordinates or duplicated grammar content are stored in these tables.

`GET /api/grammar-comparisons` returns comparison assertions for grid details.
`PUT /api/grammar/:id/comparisons` accepts `{ patternIds: string[] }` and replaces
only that pattern's editorial comparisons. It rejects duplicates, self-links,
missing IDs and additional fields with 400; missing patterns return 404.
Source-backed assertions are preserved. Comparison writes are serialized and
atomically replace the relationship file. Content and comparison saves are
separate writes: a later comparison failure retains an acknowledged content save.

Reference paths default to the grammar catalog's directory; the optional third
`createApp` argument selects a separate fixture directory. Missing or malformed
reference files fail explicitly without disabling catalog endpoints. Multi-file
research regeneration is an offline operation: stop the API while replacing the
reference tables; multi-process writes and transactions across tables are not
supported.

Build core first, then regenerate from the pinned factual heading inventory:

```bash
pnpm --filter @mandarinko/core build
pnpm --filter @mandarinko/server research:grammar
# Preview without changing application tables:
pnpm --filter @mandarinko/server research:grammar --output=/tmp/grammar-preview
```

The generator preserves editorial assertions and reviewed decisions in
`research/grammar/decisions.json`. Decisions pin the expected source form and fail
if that occurrence changes. Inspect generated `research-results/grammar.review.json`
and `grammar.review.txt` for coverage, ambiguity, source-order differences,
backfill candidates and proposed splits/merges/prerequisites. These ignored task
artifacts are regenerated, not maintained documentation. Suggested nearby matches
never become accepted mappings. A backfill candidate is unconfirmed and never
creates a catalog entry. `--normalize` additionally deduplicates equivalent catalog
spellings and adds resolved, single-construction Japanese source aliases while
preserving canonical spellings, IDs, meanings and examples.

The bounded extractor reads downloaded documents without network access:

```bash
python3 packages/server/scripts/extractGrammarSources.py RAW_DIRECTORY OUTPUT_JSON
```

Run this command from the repository root. It requires Python 3 and Poppler's
`pdftotext`. Download the source URLs recorded in `grammar.sources.json` into
`RAW_DIRECTORY` as `genki.pdf`, `kanzen.html`, `irodori.pdf` and
`kanzen-teaching.html`. Review a refreshed inventory before replacing the pinned
one. Source byte hashes identify the inspected editions; full books, explanations
and examples are not distributed in the inventory. The selected scope is GENKI's
numbered grammar syllabus, Shin Kanzen Master's Part 1 numbered grammar contents,
and Irodori's numbered compiled Grammar Notes headings. PDF ruby or multiline
headings can require review; the inventory is not a claim of exhaustive JLPT
coverage. The N3 author's public teaching guide supplies explicit scaffolding
evidence. Editorial and textbook evidence remain distinguishable.
