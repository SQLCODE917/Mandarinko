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
