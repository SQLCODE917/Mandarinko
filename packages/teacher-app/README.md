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

Word details follows the URL (`?word=<id>`), including direct links and reloads.
Opening a word or following a derivation link adds a browser history entry. Back
and Forward select the previous and next word in the same dialog; Back from the
first opened word returns to the dictionary. Close adds a closed-dictionary
location, so Back can reopen the last viewed word. Other query parameters and
fragments are preserved. New-word authoring uses `?newWord=1`; saving a root draft
replaces that entry with its saved word URL. Invalid locations and missing word
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

Click a field to type directly; leaving it or pressing Tab saves a complete,
valid entry. Enter adds a line, including in definitions and derivations. Text
areas grow to their contents and reflow when the modal width changes. Variants
and definitions have one-click additions that focus the new field. Levels and
frequency remain available under a compact disclosure. Escape and Close finish
pending edits before returning to details, and keyboard focus stays in the modal.

The main word and its direct children and siblings stay together as editable
rows. The toolbar and the ends of relationship groups offer “+ Child” and
“+ Sibling”, which immediately focus a new character field. Enter an exact existing
spelling and leave that field to reuse its pronunciation, definitions, variants,
and derivation automatically. A unique match resolves across language variants;
ambiguous matches require choosing an entry. Duplicate links and new self-links
are rejected. Editing a reused word changes that shared dictionary entry.
Unlink removes the relationship without deleting its word. To work on a related
word's own relationships, use that word's Edit button in details.

Partial new words stay as local drafts until spelling, pronunciation, and at
least one definition satisfy shared validation. Close keeps incomplete edits open
with an explanation. Discard unsaved edits restores the last successful saves;
already saved changes remain saved. Failures retain text and offer Retry save,
without automatic retries. Requests run in order; saving a related word precedes
saving its link. These are separate server writes, so a failed link may leave
its word saved independently. Successful responses update the dictionary in place
without reloading it or resetting the active editor field.

Drafts belong to the current editor session, not durable browser storage. Reload
or leaving the page warns while changes are unsaved; browser Back and Forward
still select dictionary viewing locations and do not restore unfinished drafts.

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
