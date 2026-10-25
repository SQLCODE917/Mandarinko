# @mandarinko/ui

Shared React reading presentation for teacher and student applications: entry
headings, word entries, derivation links, dialog focus handling and CRT styling.
It depends only on core and React; routing, loading, persistence and editor state
belong to the applications. Consumers import the package's public exports.

`EntryHeading.renderSpelling` and `WordEntry.heading` let the teacher add its
stroke-order rendering without importing those dependencies into student code.
Font faces and automatic furigana remain teacher-owned. CSS exports are
`@mandarinko/ui/entry.css`, `@mandarinko/ui/dialog.css` and `@mandarinko/ui/crt.css`.
Build with `pnpm --filter @mandarinko/ui... build`. Application browser suites
verify the shared presentation and interactions.
