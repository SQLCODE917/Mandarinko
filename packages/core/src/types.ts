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

export interface Word {
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
