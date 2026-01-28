# @mandarinko/core

Core vocabulary management library for the Mandarinko application.

## Features

- **Vocabulary Management**: Load, query, and manage vocabulary entries
- **Multi-Language Support**: Handle Chinese (Simplified/Traditional), Japanese, and other languages
- **Relationship Management**: Manage parent-child and sibling relationships between words
- **Search Capabilities**: Search by spelling, definition, pronunciation, and metadata
- **Validation**: Built-in validation for word entries
- **Framework Agnostic**: Works in Node.js and browser environments

## Installation

```bash
pnpm add @mandarinko/core
```

## Basic Usage

```typescript
import { VocabularyManager } from '@mandarinko/core';

// Load from JSON object
const vocabularyData = { /* ... */ };
const manager = VocabularyManager.fromJSON(vocabularyData);

// Lookup by ID
const word = manager.getById('0');

// Search by spelling
const results = manager.searchBySpelling('主张');

// Get relationships
const children = manager.getChildren('0');
const parents = manager.getParents('1');
const chain = manager.getDerivationChain('3');

// Add a new word
manager.addWord({
  id: 'new-1',
  spelling: [{ language: 'zh-Hans', text: '新' }],
  pronunciation: 'xin(1)',
  definition: ['(adj) new'],
});

// Update a word
manager.updateWord('0', {
  definition: ['(n) view', '(v) advocate'],
});

// Link relationships
manager.linkChild('0', '1');
manager.linkSibling('0', '5');
```

## API Reference

### VocabularyManager

#### Constructor & Static Methods

- `new VocabularyManager(data: VocabularyData)` - Create a new manager
- `fromJSON(data: VocabularyData): VocabularyManager` - Create from JSON object
- `fromFile(path: string): Promise<VocabularyManager>` - Load from file (Node.js only)

#### Query Methods

- `getById(id: string): Word | undefined` - Get word by ID
- `getAll(): Word[]` - Get all words
- `searchBySpelling(text: string, language?: LanguageCode): Word[]` - Find words by exact spelling
- `searchByPartialSpelling(text: string, language?: LanguageCode): Word[]` - Find words by partial spelling
- `searchByDefinition(keyword: string): Word[]` - Find words by definition keyword
- `getByHskLevel(level: number): Word[]` - Get words by HSK level
- `getByJlptLevel(level: number): Word[]` - Get words by JLPT level

#### Relationship Methods

- `getChildren(wordId: string): Word[]` - Get child words
- `getParents(wordId: string): Word[]` - Get parent words
- `getSiblings(wordId: string): Word[]` - Get sibling words
- `getDerivationChain(wordId: string): Word[]` - Get full derivation chain (ancestors)

#### Mutation Methods

- `addWord(word: Word): void` - Add a new word
- `updateWord(id: string, updates: Partial<Word>): void` - Update a word
- `deleteWord(id: string): void` - Delete a word
- `linkChild(parentId: string, childId: string): void` - Link parent-child relationship
- `unlinkChild(parentId: string, childId: string): void` - Unlink parent-child relationship
- `linkSibling(wordId1: string, wordId2: string): void` - Link sibling relationship
- `unlinkSibling(wordId1: string, wordId2: string): void` - Unlink sibling relationship

#### Utility Methods

- `toJSON(): VocabularyData` - Export as JSON
- `getStats(): Stats` - Get vocabulary statistics

## Types

### Word

```typescript
interface Word {
  id: string;
  spelling: Spelling[];
  pronunciation: string;
  definition: string[];
  derivation?: string;
  parentIds?: string[];
  childrenIds?: string[];
  siblingIds?: string[];
  metadata?: WordMetadata;
}
```

### Spelling

```typescript
interface Spelling {
  language: LanguageCode;
  text: string;
}

type LanguageCode = 'zh-Hans' | 'zh-Hant' | 'ja' | string;
```

### WordMetadata

```typescript
interface WordMetadata {
  hskLevel?: number;
  jlptLevel?: number;
  frequency?: number;
  addedAt?: number;
  updatedAt?: number;
  addedBy?: string;
}
```

## Testing

```bash
pnpm test
pnpm test:watch
```

## License

GPL-3.0
