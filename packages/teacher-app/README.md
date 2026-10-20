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
rows. “+ Child” and “+ Sibling” focus a new character field immediately. Enter an
exact existing spelling and leave that field to reuse its pronunciation,
definitions, variants, and derivation. Unique matches resolve across language
variants; ambiguous matches require choosing an entry. Self-links, duplicate
relationships, and duplicate spellings in separate new drafts are rejected.
Editing a reused word changes that shared dictionary entry. Unlink removes its
relationship without deleting the word. Use a related word's Edit button in
details to work on its own relationships.

Drafts are saved to local browser storage as input changes. Opening Create again
resumes the unfinished new-word worksheet; editing an existing word resumes that
word's draft. Drafts survive Close, Back/Forward, and reload in the same browser
and site origin. They do not sync between machines, and clearing site data removes
them. Another tab's newer draft is protected from being overwritten. If storage
is unavailable, Close offers Keep editing or an explicit exit without saving the
draft, rather than silently losing input.

Failures retain draft content and offer explicit Retry save; reopening or
reloading never automatically retries. Creation uses a persisted retry key so a
lost response can be retried without another word. Requests run in order, and a
word exists before its relationship is saved. These remain separate server writes:
a failed relationship can leave its word saved independently. Discarding a draft
does not delete such saved words. Successful responses update the dictionary in
place without another fetch or resetting the active editor field.

The pure [editor lifecycle](src/domain/editorLifecycle.ts) owns save and exit
transitions; [WordEditorSession](src/domain/wordEditorSession.ts) owns drafts,
validation, ordered writes, and recovery. Components render these states and send
user intent. New-word creation pauses field entry while its submission is in
flight; ordinary existing-word autosaves allow continued typing.

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
