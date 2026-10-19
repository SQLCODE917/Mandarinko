# @mandarinko/teacher-app

A React/TypeScript web application for authoring and managing vocabulary words.

## Features

- **Landing Page**: Browse the complete vocabulary dictionary with omni-search
- **Word Authoring**: Create new words with a data-driven form supporting all properties
- **Smart Search**: Find existing words by definition, exact spelling, or partial spelling
- **Relationship Management**: Link parent, child, and sibling words directly from the form
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
relationship view uses compact indented branches. Editing opens the existing form
on demand.

The magenta terminal banner carries the application identity: a typed wordmark,
blinking cursor, scanlines, and restrained CRT artifacts. Motion stays in the
banner; reduced-motion preferences show a static wordmark and cursor.

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
