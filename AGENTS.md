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
- Student app owns static dictionary delivery and read-only study interaction.
- UI owns shared reading presentation without editor, server or font dependencies.
- Teacher app owns React authoring presentation and interaction. Consume core's public API
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

## Local lesson planning and learning log

Before planning, reviewing or continuing lessons, read
[the local learning log](.local/learning/log.json) in full and resolve its grammar
references against [the grammar catalog](packages/server/grammar.json). Do not rely
on conversation history alone. The catalog owns grammar content; the log owns
lesson plans, actual coverage, learner evidence and follow-up decisions. Never
infer structural grammar relationships or change catalog content from a lesson log.

The log is local JSON with `schemaVersion: 1`. Paths in `grammarCatalog` are
repository-relative. `teacherGrammarUrlTemplate` provides a convenient details
link by substituting a pattern ID; read the JSON catalog when the teacher app is
not running. References use `patterns[].id`, never titles or line numbers. Do not
copy catalog definitions into the log or silently substitute overlapping patterns.
If the log is missing, its schema is unsupported, or a referenced ID is missing
or ambiguous, preserve existing data and clarify the gap before dependent planning.
Do not reconstruct past lessons or learner performance from assumptions.

Operate on the log as follows:

1. Keep lesson IDs stable (`lesson-001`, `lesson-002`, etc.) and append new lessons
   in sequence. Status is `planned`, `in_progress` or `completed`; completion means
   taught, not mastered. Set `sessionDate` only when the actual teaching date is
   known; use `null` otherwise.
2. Record intended grammar IDs, objectives, reused lesson IDs, proposed vocabulary
   and prompt progression in `plan`. Use reusable building blocks and recombination
   of familiar material when planning in the requested Michel Thomas style. Keep
   proposed activities distinct from events that actually occurred.
3. Leave `actualCoverage` null until there is a session report or direct evidence.
   When teaching begins, record actual grammar IDs, vocabulary, exchanges,
   observations, corrections and unfinished work there. Null means unknown or
   unrecorded; empty lists mean no entries have been recorded, not proof of absence.
   Evidence records have `kind` (`user_report` or `observed`) and `note`; retain
   actual prompts and responses verbatim when available. Never invent responses,
   assessments, dates or mastery claims. Mark completed only with user confirmation.
4. Keep follow-up actions and their rationale in `followUp`. Plan changes or
   session deviations must not overwrite what was actually taught. Record later
   corrections to completed history in `amendments`, including their evidence;
   preserve the earlier account. Read actual outcomes before choosing the next
   lesson, rather than advancing through a predetermined grammar order.
5. After updates, parse the JSON, check the supported schema version, unique lesson
   IDs, valid reused lesson IDs and every planned/actual grammar ID against the
   catalog. Read back the saved records and report what changed.

Keep `/.local/learning/` in this checkout's `.git/info/exclude`; preserve other
exclusion rules. Verify with `git check-ignore -v -- .local/learning/log.json` and
confirm `git ls-files -- .local/learning` returns nothing. Never stage, force-add,
publish, bundle or delete learning history as routine cleanup. These files and
their exclusion do not travel with Git: on another checkout, restore a separately
backed-up log and establish the local exclusion before writing learning history.
