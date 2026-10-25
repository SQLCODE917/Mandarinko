# @mandarinko/student-app

Read-only Chinese and Japanese dictionary, built for GitHub Pages. Browse 24 words
per page, search every dictionary field, and explore canonical readings, derivation
links, shared character components and siblings. It uses system fonts: no automatic
furigana, stroke animation, grammar or authoring tools are loaded.

## Development and publishing

From the repository root, use the pinned Node/pnpm versions:

```sh
pnpm install
pnpm dev:student
pnpm build:student
pnpm preview:student
```

Development uses port 3002; production preview uses port 3015. Restart the student
development server to refresh its snapshot after teacher edits. Rebuild shared UI
TypeScript after changing it with `pnpm --filter @mandarinko/ui... build`. Set
`STUDENT_BASE=/Mandarinko/` for a project site, or `/` for a domain root, when
building and previewing. Query parameters `q`, `page` and `word` preserve search,
pagination and selected word without requiring server-side route rewrites.

The build reads `../server/vocabulary.json` and produces one content-hashed snapshot.
Legacy numeric relationship IDs become strings, as in the teacher's adapter; the
canonical file is never rewritten. The first 24 entries and complete wordmark are
prerendered. JavaScript hydrates that page and loads the complete snapshot once;
failed loads expose explicit Retry. The repository port has no write operation.

Teacher edits reach students after the edited vocabulary is committed to the
repository's default branch and its Pages workflow succeeds. Uncommitted local
edits do not update the deployed site. Select **GitHub Actions** as the repository's
Pages publishing source before using `.github/workflows/student-pages.yml`; the
workflow derives the base path from Pages metadata and supports manual dispatch.
No repository settings or remote publication are performed by local builds.
The artifact includes attribution, field provenance and data/application licenses.

## Verification and performance

```sh
pnpm check
pnpm test:browser
pnpm test:browser:student
pnpm performance:student
pnpm format:check
```

Student browser tests build production assets beneath `/Mandarinko/` and use no API
server. They cover prerendering without JavaScript, IME search, pagination, history,
keyboard focus, direct word links, missing entries, explicit retry and responsive
layouts. Interaction samples measure browser event dispatch through the next paint
at 4x CPU slowdown, with a 200 ms limit. They are not measurements of field INP.

Every build enforces gzip budgets: initial JS 100 KiB, CSS 20 KiB, HTML including
hydration data 40 KiB, dictionary 300 KiB. `dist/budgets.json` records measured sizes.
Lighthouse 13.0.1 audits the built landing and direct-word URLs three times each with
a fixed mobile profile (390×844, 4x CPU, simulated Slow 4G). Median thresholds are
Performance 95, Accessibility 100, Best Practices 95 and SEO 95; median LCP must be
at most 2.5 seconds and CLS at most 0.1. Reports go to
`test-results/student-performance` and are uploaded by CI. Scores depend on the
execution environment; failures are reported without automatic retries.

The field targets are LCP ≤2.5 s, CLS ≤0.1 and INP ≤200 ms at the 75th percentile.
Lab checks do not establish real-user compliance. The MVP includes no analytics,
service worker, offline guarantee or external font/CDN requests.
