# Agent Guidelines for Mandarinko

Mandarinko authors vocabulary and grammar. Keep changes narrow, preserve user
catalog data, and use explicit word, grammar pattern and relationship terminology.

## Ownership

- The root README owns setup, commands, and current operational limitations.
- Code and tests own current behavior. Read the affected package README before
  changing it; clarify intended behavior when documentation and implementation conflict.
- Core owns shared entry types, vocabulary and grammar validation, search, and
  word relationship logic.
- Server owns HTTP contracts and persistence and consumes core's public API.
- For teacher-app work, also read [its agent procedures](packages/teacher-app/AGENTS.md).
- Teacher app owns React presentation and interaction. Consume core's public API
  and server's public API types; do not import another package's private source.

## Workflow

- Use the pinned Node and pnpm versions from the repository root and keep the
  pnpm lockfile current when dependencies change.
- For behavior changes, add the narrowest failing regression, including exact
  rejection coverage for boundary bugs. Keep core tests independent of the UI.
- Run focused checks and `pnpm check`. Report formatting separately with
  `pnpm format:check`; do not reformat unrelated files to hide existing debt.
- Review affected visual behavior when changing the UI. Automated tests and a
  sampled visual review provide different evidence; report both accurately.
- Preserve uncommitted changes, especially `packages/server/vocabulary.json` and
  `packages/server/grammar.json`. Use temporary fixtures for tests and avoid
  writing to live catalogs.
- Do not edit generated output or weaken assertions to obtain passing checks.
- Do not create commits, branches, tags, or remote changes unless requested.
- Report native failures directly; do not add automatic retries to hide failures.

Keep setup in the existing README, behavior and its verification in code/tests,
and agent workflow here. Report task plans, check results, and visual observations
in the conversation rather than adding delivery documents.
