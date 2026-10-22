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
and missing or self-referencing contrasts. Missing entries return 404; invalid
requests return 400. Storage failures return 500 without acknowledging a save.

Grammar reads and writes `grammar.json` in the server working directory,
retaining `{ schemaVersion: 1, patterns: [...] }`. Vocabulary continues to use
`vocabulary.json`. `createApp(vocabPath, grammarPath)` accepts separate fixture
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
