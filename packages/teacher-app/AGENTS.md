# Teacher app agent procedures

Read the root [AGENTS.md](../../AGENTS.md) and this package's [README](README.md).
The README owns editor behavior and clipboard format. Domain controllers own
workspace identity, validation, navigation and ordered publication; components
render their states and dispatch intent. Keep fields growing and the dialog shell
mounted during editor navigation.

## Efficient dictionary entry

1. Configure the explicit entry session with a name, primary language and optional
   HSK/JLPT defaults. Levels apply to new top-level words, never automatically to
   their components or reused dictionary entries.
2. Start with the parent. Enter its spelling first and inspect autocomplete before
   typing pronunciation or definitions. Select an ambiguous match deliberately;
   Chinese aliases share identity while Japanese entries remain separate.
3. Resolve components together using explicit delimiters (for example `女, 馬`).
   Reuse existing words and their complete trees. Do not re-enter saved pronunciation
   or definitions. Do not split an undelimited compound into characters.
4. Use **Edit components** only for missing or incomplete descendants. Work inside
   the same modal, then Return through breadcrumbs. These returns checkpoint local
   drafts without requiring completed fields or creating dictionary entries.
5. Create once from the root when its reachable graph is ready. For another parent,
   use Create and add another; the active session remains configured. Close retains
   unfinished input. End session clears defaults while keeping recoverable drafts.
6. For researched batches, use header-based TSV and Preview paste. Review new,
   reused and updated entries, before/after corrections, relationships and selected
   roots. Non-empty supplied fields are authoritative at Create batch; leave fields
   blank to preserve saved values. Complete placeholders and resolve ambiguity
   before confirming. Reuse shared components across roots.
7. After publication, read back saved IDs and relationships, including deeper reused
   descendants. A successful scalar write alone does not establish relationship
   success. On failure inspect retained work and use explicit Retry; never blindly
   resubmit or automatically retry.

Preserve dictionary wording, including derivation wording, without attribution
prefixes such as “Zhongwen”. Distinguish actual structural components from examples,
comparisons and characters merely mentioned in derivation prose. Do not infer links
from every character. This workflow does not authorize crawlers, automatic regional
conversion, bulk live mutations or expansion of a dataset beyond the requested scope.

## Verification

Use the root runtime pins and run from the repository root:

```sh
pnpm --filter @mandarinko/teacher-app test
pnpm check
pnpm test:browser
pnpm format:check
```

Install the pinned browser once with `pnpm exec playwright install chromium`.
Browser tests launch their own frontend and an API backed by a temporary vocabulary
file for each test; never point tests at live vocabulary. Cover delayed pointer and
keyboard completion, IME autocomplete, aliases versus Japanese, shared graph edits,
child-cycle rejection, nested history/reload/focus recovery, paste staging and
explicit retry after partial writes. Test partial imports against deeper saved
trees and verify preserved IDs. Review desktop and mobile entry samples; record
interactions and scroll operations in generated test artifacts, not maintained
acceptance ledgers. Report pre-existing formatting debt separately.
