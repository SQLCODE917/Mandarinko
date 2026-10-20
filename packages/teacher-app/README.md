# @mandarinko/teacher-app

A React/TypeScript web application for authoring and managing vocabulary words.

## Features

- **Landing Page**: Browse the complete vocabulary dictionary with omni-search
- **Word Authoring**: Enter and edit words directly in an autosaving worksheet
- **Smart Search**: Find existing words by definition, exact spelling, or partial spelling
- **Relationship Management**: Add and reuse child and sibling words beside the main entry
- **Shared Validation**: Uses the same validation logic as the backend

## Running the App

```bash
# Install dependencies
pnpm install

# Development server (port 3001)
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

## Dictionary Presentation

Words use a shared compact entry in the dictionary, search results, and relationship
view: character variants and pronunciation share a heading, followed by derivation
and complete definitions. Entries wrap around their content without equal-height
cards or truncated text. The dictionary flows into columns as space permits; the
relationship view uses compact indented branches. The details view stays read-only;
Edit opens a separate word editor in the same dialog shell.

Japanese spellings in dictionary entries, search results, and details use
[Furifont Serif v0.6.0](https://github.com/antfu/furifont/releases/tag/v0.6.0)
with built-in hiragana readings. These are a visual aid and may be incorrect or
absent; the separately displayed pronunciation field remains canonical. The font
uses its own reading dictionary, not the stored pronunciation. Okurigana-dependent
reading assistance is not enabled. Editing continues to use ordinary text fields.

The unmodified variable WOFF2 is self-hosted in
[`public/fonts/furifont-v0.6.0`](public/fonts/furifont-v0.6.0), alongside the upstream
OFL and dictionary attribution notices. It downloads only when Japanese entry
spellings are rendered (about 8.2 MB before browser caching); fallback text remains
visible while loading or if loading fails. The scoped rule in
[WordEntry.css](src/components/WordEntry.css) reserves space for the readings and
leaves Chinese spellings and the terminal banner unchanged. To update the font,
replace the versioned asset directory and CSS URL together, retaining the release's
license notices.

In Word details, click a spelling (or focus it and press Enter/Space) to loop its
stroke order; click again to restore text. Only one spelling plays at a time,
including related entries. Navigating, closing, or editing stops playback. The
original text stays mounted as an invisible sizing layer during playback, so
switching preserves its dimensions, baseline, and the space for furigana. The
canonical pronunciation stays visible. Multi-character spellings draw in order.
Lists and search results stay static.

Chinese playback uses [Hanzi Writer](https://hanziwriter.org/) 3.7.3 and
[hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) 2.0.1 (Make Me a
Hanzi/Arphic outlines). Japanese playback uses ordered SVG paths from
[KanjiVG](https://github.com/KanjiVG/kanjivg/tree/70a0b7ae0c18ceb5cb358274b029cce0234a43bc),
© Ulrich Apel, CC BY-SA 3.0. Source and license links are retained in
[`public/stroke-order`](public/stroke-order). Data is selected by spelling language;
Chinese script tags do not choose a separate regional writing standard. Japanese
forms are never substituted with Chinese data when missing.

The Chinese animation library and character data load only after activation. Version-pinned data
comes from jsDelivr and is cached for the browser session; initial access needs an
internet connection. Failed or missing data leaves the original spelling visible
with an unavailable message, without automatic retries. Toggle off/on to try again.
This is playback only; handwriting practice and regional Chinese dataset selection
are not implemented.

Word details follows the URL (`?word=<id>`), including direct links and reloads.
Opening a word or following a derivation link adds a browser history entry. Back
and Forward select the previous and next word in the same dialog; Back from the
first opened word returns to the dictionary. Close adds a closed-dictionary
location, so Back can reopen the last viewed word. Other query parameters and
fragments are preserved. New-word authoring uses `?newWord=1`; successful Create replaces that entry
with its saved word URL. Close leaves authoring and retains unfinished drafts. Invalid locations and missing word
IDs show an explicit message instead of opening a draft.

In the details view, Han-only spellings in derivations link to existing words.
The longest matching spelling wins; unknown, ambiguous, and self-referencing
spellings remain text. Identical spellings on variants of one word resolve to
that word. Links support keyboard activation, copying, and opening in another
tab. Dictionary-list and search entries retain plain derivation text so links
are never nested inside their entry buttons. Links are also inactive during
editing. Navigation uses the loaded vocabulary and keeps the dialog shell mounted,
without another fetch or an intermediate blank/previous-word frame.

The magenta terminal banner carries the application identity: a typed wordmark,
blinking cursor, scanlines, and restrained CRT artifacts. Motion stays in the
banner; reduced-motion preferences show a static wordmark and cursor.

## Word Editor

Click fields to edit directly. Enter adds a line; text areas grow to show their
contents. Tab saves valid edits to existing dictionary words. New words stay in
a browser draft until an explicit Create action, even after all required fields
are complete. Leaving an incomplete field does not display whole-word validation.
Variants and definitions have one-click additions that focus the new field.
Levels and frequency remain under a compact disclosure.

The toolbar separates completion from leaving:

- **Create word** validates the worksheet, creates its new words, saves their
  relationships, and opens the resulting entry in details. For new related words
  beside an existing main word, this action is labelled **Add words**; when no new
  words remain, it is **Done**.
- **Create and add another** completes the same work, then clears the worksheet
  and focuses spelling. It only resets after success.
- **Close**, Escape, and the backdrop leave the editor safely, retaining unfinished
  drafts. They do not validate or create new dictionary entries. Valid pending
  edits to existing words finish saving before exit. A Close request made during
  Create waits for that operation to settle, without another request.
- **Discard draft** (or **Discard unsaved edits**) asks for confirmation when there
  is unfinished input. Keep editing preserves the input. Confirming discards only
  draft content and closes; successful dictionary writes are kept. An individual
  related draft can be discarded without closing the worksheet.

Ctrl/Cmd+Enter performs the primary completion action. Ctrl/Cmd+Shift+Enter
creates and adds another in a new-word worksheet. Keyboard focus stays in the
dialog, and Escape cancels a discard confirmation before leaving the editor.

The main word and its direct children and siblings stay together as editable
rows. “+ Child” and “+ Sibling” focus a new spelling immediately. Autocomplete shows
language, pronunciation and definitions. Chinese simplified/traditional aliases
match the same saved entry; Japanese matches remain separate. Enter selects a
suggestion and advances to another component field, Escape dismisses suggestions,
and Tab retains ordinary navigation. IME composition never accepts a suggestion.
Ambiguous matches require an explicit selection. Reused entries show a shared-entry
indicator and stay directly editable; their saved descendants are retained.

The component list accepts commas, Chinese commas, semicolons and line breaks.
`女, 馬` adds two components; `学校` adds one compound. Repeated references are
idempotent. Self-links and newly introduced child cycles are rejected. Sibling
links are independent of the child hierarchy. Derivation prose never creates links
automatically. Unlink removes a relationship without deleting its dictionary word.

**Edit components** descends inside the same mounted editor. Breadcrumbs and the
nested **Return to [parent]** button checkpoint incomplete drafts without creating
them. Browser Back/Forward follows editor navigation. Focus, selection and scroll
are restored on returning. Root Create validates the reachable graph and opens an
incomplete descendant at its field when attention is needed. Missing local editor
locations display recovery instructions instead of allocating a replacement draft.

The compact **Entry session** disclosure configures a name, primary language and
optional HSK/JLPT levels. These settings persist between parents. Newly created roots
receive the defaults; components receive the language but no level metadata. Reused
entries keep their metadata unless explicitly edited or supplied by paste. Create
and add another retains settings and focuses a blank spelling. End session clears
active defaults without deleting unfinished drafts.

### Spreadsheet paste

Open **Paste spreadsheet**, paste header-based TSV and select **Preview paste**.
Quoted cells support embedded tabs/newlines and doubled quotes, as in spreadsheet
exports. Supported headers are:

| Header                  | Meaning                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| `spelling`              | Required row identifier; an undelimited compound stays one word.                 |
| `language`              | Spelling language; blank uses the active session language.                       |
| `traditional`           | Add a Chinese traditional alias; no automatic conversion.                        |
| `pronunciation`         | Canonical pronunciation.                                                         |
| `definitions`           | One definition per newline inside the cell.                                      |
| `derivation`            | Exact wording, without added attribution text.                                   |
| `children`, `siblings`  | Explicitly delimited spelling references, resolved in the row's language family. |
| `hskLevel`, `jlptLevel` | Explicit level metadata.                                                         |
| `root`                  | `true`/`1` or `false`/`0`; blank infers roots not referenced as children.        |

For example (columns separated by tabs):

```tsv
spelling	language	pronunciation	definitions	children
好	zh-Hans	hao3	good	女, 子
```

Only spelling is required to identify/reuse a row. New words still require valid
pronunciation and definitions before creation. References resolve against both
pasted rows and the saved dictionary. Missing references become editable
placeholders; ambiguity blocks publication until an entry is selected. Preview
shows new/reused/updated entries, missing information, relationships and before/after
corrections. Edit entries and choose roots before **Create batch**, the explicit
confirmation covering all selected roots and their required components.

Non-empty supplied dictionary fields are authoritative; omitted or blank fields
preserve existing values. Variants and relationships are additive, including on a
partial paste: saved descendants and IDs survive. Shared components publish once
across roots. Matching and the affected graph are refreshed before writing. Preview
edits stay local until confirmation. Automated website extraction, crawling and
regional character conversion are not implemented.

### Recovery and publication

Normalized workspace graphs save to browser storage as input changes. Opening
Create resumes the unfinished new-word workspace; editing an existing word resumes
its workspace. Local editor links use `editor` and `node` query parameters alongside
the dictionary location. Drafts, breadcrumbs, view position, session settings and
interrupted writes survive Close and reload in the same browser and origin. They
do not sync across machines; clearing site data removes them. Older flat drafts
convert without publishing, and their original record stays intact until the new
snapshot is successfully stored. Another tab's newer draft is protected. Unavailable
storage prompts before leaving without a draft.

Failures retain unfinished work and offer explicit Retry save; reopening never
retries automatically. Creation keeps its original request key and exact payload
until acknowledged. New nodes are created without relationship references first;
relationships save after all required IDs exist. These are separate server writes,
not a transaction: acknowledged writes remain saved after a later failure. Explicit
Retry resumes unfinished work without duplicating acknowledged or lost-response
creations. Discard does not delete saved words. Existing-word autosaves preserve
the active field; completion requested while saving exits once after success.

The pure [editor lifecycle](src/domain/editorLifecycle.ts) owns save/exit transitions;
[WordEditorSession](src/domain/wordEditorSession.ts) owns graph identity, drafts,
validation, navigation and publication. Components render states and send intent.
New-word publication pauses editing; ordinary existing-word autosaves allow typing.

Run `pnpm test:browser` from the repository root for Chromium behavior tests using
per-test temporary API vocabulary files. Install Chromium once with
`pnpm exec playwright install chromium`. The harness owns its frontend on port 3014,
requires no running development server, and records failure traces. `pnpm check`
runs lint, builds, types and unit tests; `pnpm format:check` reports formatting
separately. See [AGENTS.md](AGENTS.md) for efficient operational entry procedures.

## Reusable CRT Treatment

[crt.css](src/styles/crt.css) is a standalone stylesheet: copy it to another app
and load it with a normal stylesheet link or CSS import. It has no React, font
download, JavaScript, or build-tool dependency. All selectors and keyframes use
the `crt-` prefix; the screen effect uses the host element's `::before` and
`::after` pseudo-elements. Padding, alignment, and font size remain app layout.

The [runnable HTML example](examples/crt-banner.html) demonstrates the default
magenta banner, a green theme, and static terminal lettering. Open the file
directly in a browser, or visit `http://localhost:3001/examples/crt-banner.html`
while the teacher app dev server is running. The example itself needs no backend
or JavaScript. [HomePage](src/pages/HomePage.tsx) shows the React integration used
by Mandarinko.

To reuse it elsewhere, copy `src/styles/crt.css` into your application, then copy
the desired markup and layout styles from the example. Update the stylesheet
link to its new location. For example, with `crt.css` beside your HTML file:

```html
<link rel="stylesheet" href="crt.css" />

<header class="crt-screen">
  <span class="crt-badge">国语こ</span>
  <span class="crt-text crt-type" style="--crt-steps: 10">
    <span class="crt-type__text">Mandarinko</span>
    <span class="crt-type__cursor" aria-hidden="true"></span>
  </span>
</header>
```

Use `crt-screen` for the surface, `crt-text` for static terminal lettering, and
add `crt-type` plus its two child spans for typing and the cursor. `crt-badge`
is optional. The text keeps its natural width throughout the animation, avoiding
layout movement. Typing runs once when mounted; the cursor and scan band repeat.
Reduced-motion preferences disable all animation and leave the text readable.

`--crt-steps` defaults to 10; match it to the character count for evenly spaced
typing of a monospace Latin wordmark. Other text still reveals completely, but
mixed-width glyphs or combining characters may not reveal one character per step.

Override custom properties on any instance or parent to change the treatment:

```css
.my-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.3rem;
  font-size: 2rem;
  --crt-background: #101c16;
  --crt-phosphor: #c3ffd0;
  --crt-glow: #76ff9a70;
  --crt-rim-light: #497454;
  --crt-rim-dark: #07110a;
  --crt-type-duration: 2s;
}
```

Apply `my-banner` alongside `crt-screen` to use this example theme. Additional
controls are `--crt-fringe-left`, `--crt-fringe-right`, `--crt-type-delay`,
`--crt-blink-duration`, and `--crt-scan-duration`. In React, [CRTText](src/components/CRTText.tsx)
emits the same markup and calculates the step count:

```tsx
import { CRTText } from './components/CRTText';

<header className="crt-screen my-banner">
  <CRTText>MyApp</CRTText>
</header>;
```

For another React app, copy `CRTText.tsx` as well as `crt.css`, preserving or
adjusting the component's relative stylesheet import. The adapter has no
animation logic; the same stylesheet owns both HTML and React presentation.

### Key Design Decisions

1. **No Duplication of Validation**: Imports `ValidationService` from `@mandarinko/core`
2. **Shared Types**: Imports `Word` type from core and API types from server
3. **Type Safety**: All API calls use server-generated types
4. **Reusable Components**: OmniSearch component used in both landing page and word editor
