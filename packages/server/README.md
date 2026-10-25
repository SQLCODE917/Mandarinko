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
`vocabulary.json`. `createApp(vocabPath, grammarPath, connectionDirectory?)` accepts separate fixture
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

## Grammar connections

`GET /api/grammar-map` returns `{ schemaVersion: 2, relationships }`, validated
against the current grammar catalog. `grammar.relationships.json` is the sole map
data table. Each Mandarinko-owned relationship contains `id`, `fromId`, `toId`,
`type`, and optional `rationale`. The types are `taughtTogether`, `introducedEarlier`,
`compared` and `buildsOn`. Symmetric types (taught together and compared) have sorted
endpoints; directed types retain their authored direction. IDs are deterministic
from type and escaped endpoints. No source records, layout coordinates or duplicated
grammar content are stored. Only schema version 2 is accepted.

`GET /api/grammar-comparisons` returns all comparison relationships for pattern details.
`PUT /api/grammar/:id/comparisons` accepts `{ patternIds: string[] }` and replaces
all comparisons incident to that pattern. It preserves other types, comparisons
between other patterns and rationales on retained comparisons. It rejects duplicate
IDs, self-links, missing IDs and additional fields with 400; missing patterns
return 404. Comparison writes are serialized and atomically replace the relationship
file. Content and comparison saves are separate writes: a later comparison failure
retains an acknowledged content save.

Connection paths default to the grammar catalog's directory; the optional third
`createApp` argument selects a separate fixture directory. Missing or malformed
connection data fails explicitly without disabling catalog endpoints. Multiple
server processes writing the same relationship file are not supported.
