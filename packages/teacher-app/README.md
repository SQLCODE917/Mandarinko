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

# Development server (port 3000)
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

### Key Design Decisions

1. **No Duplication of Validation**: Imports `ValidationService` from `@mandarinko/core`
2. **Shared Types**: Imports `Word` type from core and API types from server
3. **Type Safety**: All API calls use server-generated types
4. **Reusable Components**: OmniSearch component used in both landing page and word editor
