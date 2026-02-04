import { Word, VocabularyData, LanguageCode } from './types.js';
export type { Word, VocabularyData, LanguageCode, Spelling, WordMetadata } from './types.js';
import { ValidationService } from './validation.js';
import { VocabularySearch } from './search.js';

export { ValidationService, VocabularySearch };

export class VocabularyManager {
  private vocabulary: Map<string, Word>;

  constructor(vocabularyData: VocabularyData) {
    this.vocabulary = new Map(Object.entries(vocabularyData));
  }

  /**
   * Load vocabulary from JSON object
   */
  static fromJSON(data: VocabularyData): VocabularyManager {
    return new VocabularyManager(data);
  }

  /**
   * Load vocabulary from file (requires file system access)
   * Note: This only works in Node.js environment
   */
  static async fromFile(path: string): Promise<VocabularyManager> {
    // This only works in Node.js environment
    if (typeof window !== 'undefined') {
      throw new Error('fromFile() is only available in Node.js environment');
    }

    // Dynamic import for Node.js fs module
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs').promises;
    const data = await fs.readFile(path, 'utf-8');
    const vocabularyData: VocabularyData = JSON.parse(data);
    return new VocabularyManager(vocabularyData);
  }

  /**
   * Get a word by ID
   */
  getById(id: string): Word | undefined {
    return this.vocabulary.get(id);
  }

  /**
   * Get all words
   */
  getAll(): Word[] {
    return Array.from(this.vocabulary.values());
  }

  /**
   * Search for words by exact spelling
   */
  searchBySpelling(text: string, language?: LanguageCode): Word[] {
    return this.getAll().filter(VocabularySearch.bySpelling(text, language));
  }

  /**
   * Search for words by partial spelling
   */
  searchByPartialSpelling(text: string, language?: LanguageCode): Word[] {
    return this.getAll().filter(VocabularySearch.byPartialSpelling(text, language));
  }

  /**
   * Search for words by definition keyword
   */
  searchByDefinition(keyword: string): Word[] {
    return this.getAll().filter(VocabularySearch.byDefinitionKeyword(keyword));
  }

  /**
   * Get words by HSK level
   */
  getByHskLevel(level: number): Word[] {
    return this.getAll().filter(VocabularySearch.byHskLevel(level));
  }

  /**
   * Get words by JLPT level
   */
  getByJlptLevel(level: number): Word[] {
    return this.getAll().filter(VocabularySearch.byJlptLevel(level));
  }

  /**
   * Get child words
   */
  getChildren(wordId: string): Word[] {
    const word = this.getById(wordId);
    if (!word || !word.childrenIds) return [];
    return word.childrenIds
      .map((id) => this.vocabulary.get(id))
      .filter((word) => word !== undefined) as Word[];
  }

  /**
   * Get parent words
   */
  getParents(wordId: string): Word[] {
    const word = this.getById(wordId);
    if (!word || !word.parentIds) return [];
    return word.parentIds
      .map((id) => this.vocabulary.get(id))
      .filter((word) => word !== undefined) as Word[];
  }

  /**
   * Get sibling words
   */
  getSiblings(wordId: string): Word[] {
    const word = this.getById(wordId);
    if (!word || !word.siblingIds) return [];
    return word.siblingIds
      .map((id) => this.vocabulary.get(id))
      .filter((word) => word !== undefined) as Word[];
  }

  /**
   * Get the complete derivation chain (ancestors)
   */
  getDerivationChain(wordId: string): Word[] {
    const chain: Word[] = [];
    const visited = new Set<string>();
    const queue: string[] = [wordId];

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const word = this.vocabulary.get(id);
      if (word) {
        chain.push(word);
        if (word.parentIds) {
          queue.push(...word.parentIds);
        }
      }
    }

    return chain;
  }

  /**
   * Add a new word to the vocabulary
   */
  addWord(word: Word): void {
    const errors = ValidationService.validateWord(word);
    if (errors.length > 0) {
      throw new Error(`Invalid word: ${errors.map((e) => e.message).join(', ')}`);
    }

    if (this.vocabulary.has(word.id)) {
      throw new Error(`Word with ID "${word.id}" already exists`);
    }

    this.vocabulary.set(word.id, word);
  }

  /**
   * Update an existing word
   */
  updateWord(id: string, updates: Partial<Word>): void {
    const word = this.vocabulary.get(id);
    if (!word) {
      throw new Error(`Word with ID "${id}" not found`);
    }

    const updated = { ...word, ...updates, id };
    const errors = ValidationService.validateWord(updated);
    if (errors.length > 0) {
      throw new Error(`Invalid word: ${errors.map((e) => e.message).join(', ')}`);
    }

    this.vocabulary.set(id, updated);
  }

  /**
   * Delete a word from the vocabulary
   */
  deleteWord(id: string): void {
    if (!this.vocabulary.has(id)) {
      throw new Error(`Word with ID "${id}" not found`);
    }

    // Remove this word from all relationship references
    for (const word of this.vocabulary.values()) {
      if (word.parentIds) {
        word.parentIds = word.parentIds.filter((pid) => pid !== id);
      }
      if (word.childrenIds) {
        word.childrenIds = word.childrenIds.filter((cid) => cid !== id);
      }
      if (word.siblingIds) {
        word.siblingIds = word.siblingIds.filter((sid) => sid !== id);
      }
    }

    this.vocabulary.delete(id);
  }

  /**
   * Link a child word to a parent word
   */
  linkChild(parentId: string, childId: string): void {
    const parent = this.vocabulary.get(parentId);
    const child = this.vocabulary.get(childId);

    if (!parent) {
      throw new Error(`Parent word with ID "${parentId}" not found`);
    }
    if (!child) {
      throw new Error(`Child word with ID "${childId}" not found`);
    }

    if (!parent.childrenIds) {
      parent.childrenIds = [];
    }
    if (!child.parentIds) {
      child.parentIds = [];
    }

    if (!parent.childrenIds.includes(childId)) {
      parent.childrenIds.push(childId);
    }
    if (!child.parentIds.includes(parentId)) {
      child.parentIds.push(parentId);
    }
  }

  /**
   * Unlink a child word from a parent word
   */
  unlinkChild(parentId: string, childId: string): void {
    const parent = this.vocabulary.get(parentId);
    const child = this.vocabulary.get(childId);

    if (!parent) {
      throw new Error(`Parent word with ID "${parentId}" not found`);
    }
    if (!child) {
      throw new Error(`Child word with ID "${childId}" not found`);
    }

    if (parent.childrenIds) {
      parent.childrenIds = parent.childrenIds.filter((id) => id !== childId);
    }
    if (child.parentIds) {
      child.parentIds = child.parentIds.filter((id) => id !== parentId);
    }
  }

  /**
   * Link sibling words
   */
  linkSibling(wordId1: string, wordId2: string): void {
    const word1 = this.vocabulary.get(wordId1);
    const word2 = this.vocabulary.get(wordId2);

    if (!word1) {
      throw new Error(`Word with ID "${wordId1}" not found`);
    }
    if (!word2) {
      throw new Error(`Word with ID "${wordId2}" not found`);
    }

    if (!word1.siblingIds) {
      word1.siblingIds = [];
    }
    if (!word2.siblingIds) {
      word2.siblingIds = [];
    }

    if (!word1.siblingIds.includes(wordId2)) {
      word1.siblingIds.push(wordId2);
    }
    if (!word2.siblingIds.includes(wordId1)) {
      word2.siblingIds.push(wordId1);
    }
  }

  /**
   * Unlink sibling words
   */
  unlinkSibling(wordId1: string, wordId2: string): void {
    const word1 = this.vocabulary.get(wordId1);
    const word2 = this.vocabulary.get(wordId2);

    if (!word1) {
      throw new Error(`Word with ID "${wordId1}" not found`);
    }
    if (!word2) {
      throw new Error(`Word with ID "${wordId2}" not found`);
    }

    if (word1.siblingIds) {
      word1.siblingIds = word1.siblingIds.filter((id) => id !== wordId2);
    }
    if (word2.siblingIds) {
      word2.siblingIds = word2.siblingIds.filter((id) => id !== wordId1);
    }
  }

  /**
   * Export vocabulary as JSON
   */
  toJSON(): VocabularyData {
    const result: VocabularyData = {};
    for (const [id, word] of this.vocabulary) {
      result[id] = word;
    }
    return result;
  }

  /**
   * Get vocabulary statistics
   */
  getStats(): {
    totalWords: number;
    wordsWithHskLevel: number;
    wordsWithJlptLevel: number;
    averageDefinitionsPerWord: number;
  } {
    const words = this.getAll();
    const wordsWithHskLevel = words.filter((w) => w.metadata?.hskLevel).length;
    const wordsWithJlptLevel = words.filter((w) => w.metadata?.jlptLevel).length;
    const totalDefinitions = words.reduce((sum, w) => sum + w.definition.length, 0);

    return {
      totalWords: words.length,
      wordsWithHskLevel,
      wordsWithJlptLevel,
      averageDefinitionsPerWord: totalDefinitions / words.length,
    };
  }
}

export default VocabularyManager;
