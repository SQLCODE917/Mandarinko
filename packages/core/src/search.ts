import { Word, LanguageCode } from './types.js';

export class VocabularySearch {
  /**
   * Search for words by exact spelling match (case-sensitive)
   */
  static bySpelling(text: string, language?: LanguageCode): (word: Word) => boolean {
    return (word: Word) => {
      return word.spelling.some(
        (s) =>
          s.text === text && (!language || s.language === language)
      );
    };
  }

  /**
   * Search for words by partial spelling match (case-insensitive)
   */
  static byPartialSpelling(text: string, language?: LanguageCode): (word: Word) => boolean {
    const lowerText = text.toLowerCase();
    return (word: Word) => {
      return word.spelling.some(
        (s) =>
          s.text.toLowerCase().includes(lowerText) &&
          (!language || s.language === language)
      );
    };
  }

  /**
   * Search for words by definition keyword
   */
  static byDefinitionKeyword(keyword: string): (word: Word) => boolean {
    const lowerKeyword = keyword.toLowerCase();
    return (word: Word) => {
      return word.definition.some((def) => def.toLowerCase().includes(lowerKeyword));
    };
  }

  /**
   * Search for words by HSK level
   */
  static byHskLevel(level: number): (word: Word) => boolean {
    return (word: Word) => word.metadata?.hskLevel === level;
  }

  /**
   * Search for words by JLPT level
   */
  static byJlptLevel(level: number): (word: Word) => boolean {
    return (word: Word) => word.metadata?.jlptLevel === level;
  }

  /**
   * Search for words by ID (exact match)
   */
  static byId(id: string): (word: Word) => boolean {
    return (word: Word) => word.id === id;
  }

  /**
   * Combine multiple predicates with AND logic
   */
  static and(...predicates: Array<(word: Word) => boolean>): (word: Word) => boolean {
    return (word: Word) => predicates.every((pred) => pred(word));
  }

  /**
   * Combine multiple predicates with OR logic
   */
  static or(...predicates: Array<(word: Word) => boolean>): (word: Word) => boolean {
    return (word: Word) => predicates.some((pred) => pred(word));
  }
}
