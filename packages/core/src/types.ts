export type LanguageCode = 'zh-Hans' | 'zh-Hant' | 'ja' | string;

export interface Spelling {
  language: LanguageCode;
  text: string;
}

export interface WordMetadata {
  hskLevel?: number;
  jlptLevel?: number;
  frequency?: number;
  addedAt?: number;
  updatedAt?: number;
  addedBy?: string;
}

export interface EntryText {
  spelling: Spelling[];
  definition: string[];
}

export interface Word extends EntryText {
  id: string;
  pronunciation: string;
  derivation?: string;
  parentIds?: string[];
  childrenIds?: string[];
  siblingIds?: string[];
  metadata?: WordMetadata;
}

export type GrammarExample = EntryText;

export interface GrammarPattern extends EntryText {
  id: string;
  title: string;
  examples: GrammarExample[];
  category?: string;
  metadata?: WordMetadata;
}

export interface GrammarData {
  schemaVersion: 1;
  patterns: GrammarPattern[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface VocabularyData {
  [wordId: string]: Word;
}

export interface LookupResult {
  word: Word;
  matchType: 'id' | 'spelling' | 'definition' | 'pronunciation';
}
