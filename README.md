# Mandarinko Monorepo

Mandarinko is a TypeScript monorepo with three packages:

- `@mandarinko/core` — shared vocabulary management, validation, and types
- `@mandarinko/server` — Express REST API
- `@mandarinko/teacher-app` — React teacher app

This README is the authoritative guide for building and running the monorepo.

**Requirements**

- Node.js 20+
- pnpm 8+

**Install**

```bash
pnpm install
```

**Build**

```bash
pnpm build
```

**Test**

```bash
pnpm test
```

**Run (Development)**

Server (API):

```bash
pnpm --filter @mandarinko/server run dev
```

Teacher app (Vite dev server):

```bash
pnpm --filter @mandarinko/teacher-app run dev
```

The server reads and writes `packages/server/vocabulary.json` by default.

**Type Safety and No-Duplication Architecture**

Type safety is enforced across packages by sharing types and validation from a single source of truth:

- `@mandarinko/core` exports vocabulary types (`Word`, `Spelling`, `WordMetadata`, `LanguageCode`) and shared validation via `ValidationService`.
- `@mandarinko/server` consumes core types and exposes its own API request/response types for frontend usage.
- `@mandarinko/teacher-app` imports core types and validation, and uses server API types to keep client/server contracts aligned.

Duplication is avoided by pushing common logic into `@mandarinko/core` and reusing it in both the server and the teacher app:

- Vocabulary rules and validation live in core only.
- Server routes operate on core types and call core validation.
- The teacher app never redefines vocabulary shapes or validation rules.

**Manage Dependencies**

Install all workspace dependencies:

```bash
pnpm install
```

Add a dependency to a specific package:

```bash
pnpm add <package> --filter @mandarinko/server
pnpm add <package> --filter @mandarinko/teacher-app
pnpm add <package> --filter @mandarinko/core
```

Add a dev dependency to a specific package:

```bash
pnpm add -D <package> --filter @mandarinko/server
```

Add a root-level tooling dependency (for shared tooling like ESLint or Prettier):

```bash
pnpm add -D <package> -w
```

Use workspace packages as dependencies:

```bash
pnpm add @mandarinko/core --filter @mandarinko/teacher-app
pnpm add @mandarinko/server --filter @mandarinko/teacher-app
```

**Workspace Structure**

```
packages/
  core/
  server/
  teacher-app/
```

For package-specific details, see:

- `packages/core/README.md`
- `packages/server/README.md`
- `packages/teacher-app/README.md`
