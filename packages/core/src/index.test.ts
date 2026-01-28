import { describe, it, expect, beforeEach } from 'vitest';
import VocabularyManager from './index.js';
import { Word, VocabularyData } from './types.js';

const testVocabulary: VocabularyData = {
  '0': {
    id: '0',
    spelling: [
      { language: 'zh-Hans', text: '主张' },
      { language: 'zh-Hant', text: '張' },
    ],
    pronunciation: 'zhu(3)zhang(1)',
    definition: ['(n) view, position, proposition', '(v) advocate, stand for'],
    childrenIds: ['1', '2'],
    siblingIds: ['5'],
    metadata: { hskLevel: 3 },
  },
  '1': {
    id: '1',
    spelling: [{ language: 'zh-Hans', text: '主' }],
    pronunciation: 'zhu(3)',
    definition: ['(n) master, owner', '(adj) primary, main'],
    parentIds: ['0'],
    metadata: { hskLevel: 2 },
  },
  '2': {
    id: '2',
    spelling: [
      { language: 'zh-Hans', text: '张' },
      { language: 'zh-Hant', text: '張' },
    ],
    pronunciation: 'zhang(1)',
    definition: ['(n) sheet', '(v) stretch, spread'],
    parentIds: ['0'],
    childrenIds: ['3'],
    metadata: { jlptLevel: 1 },
  },
  '3': {
    id: '3',
    spelling: [{ language: 'zh-Hans', text: '弓' }],
    pronunciation: 'gong(1)',
    definition: ['(n) bow', '(v) arch'],
    parentIds: ['2'],
  },
  '5': {
    id: '5',
    spelling: [{ language: 'ja', text: '主張' }],
    pronunciation: 'しゅちょう',
    definition: ['(n) insistence, assertion'],
    siblingIds: ['0'],
  },
};

describe('VocabularyManager', () => {
  let manager: VocabularyManager;

  beforeEach(() => {
    manager = VocabularyManager.fromJSON(testVocabulary);
  });

  describe('Initialization', () => {
    it('should create a manager from JSON data', () => {
      expect(manager.getAll().length).toBe(5);
    });
  });

  describe('Basic Lookups', () => {
    it('should get word by ID', () => {
      const word = manager.getById('0');
      expect(word).toBeDefined();
      expect(word?.id).toBe('0');
    });

    it('should return undefined for non-existent ID', () => {
      const word = manager.getById('999');
      expect(word).toBeUndefined();
    });

    it('should get all words', () => {
      const words = manager.getAll();
      expect(words.length).toBe(5);
    });
  });

  describe('Spelling Search', () => {
    it('should find word by exact spelling', () => {
      const results = manager.searchBySpelling('主张');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('0');
    });

    it('should find word by exact spelling with language filter', () => {
      const results = manager.searchBySpelling('主张', 'zh-Hans');
      expect(results.length).toBe(1);
    });

    it('should return empty for non-existent spelling', () => {
      const results = manager.searchBySpelling('nonexistent');
      expect(results.length).toBe(0);
    });

    it('should find word by partial spelling', () => {
      const results = manager.searchByPartialSpelling('张');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find word by partial spelling case-insensitive', () => {
      const results = manager.searchByPartialSpelling('ZHANG', 'ja');
      expect(results.length).toBe(0); // Japanese characters don't match
    });
  });

  describe('Definition Search', () => {
    it('should find words by definition keyword', () => {
      const results = manager.searchByDefinition('advocate');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((w) => w.id === '0')).toBe(true);
    });

    it('should be case-insensitive', () => {
      const results = manager.searchByDefinition('MASTER');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for non-existent keyword', () => {
      const results = manager.searchByDefinition('nonexistentword');
      expect(results.length).toBe(0);
    });
  });

  describe('Metadata Filtering', () => {
    it('should get words by HSK level', () => {
      const results = manager.getByHskLevel(3);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((w) => w.id === '0')).toBe(true);
    });

    it('should get words by JLPT level', () => {
      const results = manager.getByJlptLevel(1);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((w) => w.id === '2')).toBe(true);
    });

    it('should return empty for non-existent level', () => {
      const results = manager.getByHskLevel(10);
      expect(results.length).toBe(0);
    });
  });

  describe('Relationships', () => {
    it('should get children of a word', () => {
      const children = manager.getChildren('0');
      expect(children.length).toBe(2);
      expect(children.map((w) => w.id)).toContain('1');
      expect(children.map((w) => w.id)).toContain('2');
    });

    it('should get parents of a word', () => {
      const parents = manager.getParents('1');
      expect(parents.length).toBe(1);
      expect(parents[0].id).toBe('0');
    });

    it('should get siblings of a word', () => {
      const siblings = manager.getSiblings('0');
      expect(siblings.length).toBe(1);
      expect(siblings[0].id).toBe('5');
    });

    it('should return empty array for word with no children', () => {
      const children = manager.getChildren('1');
      expect(children.length).toBe(0);
    });

    it('should get derivation chain', () => {
      const chain = manager.getDerivationChain('3');
      expect(chain.length).toBe(3); // 3 -> 2 -> 0
      expect(chain[0].id).toBe('3');
    });
  });

  describe('Adding Words', () => {
    it('should add a valid word', () => {
      const newWord: Word = {
        id: '10',
        spelling: [{ language: 'zh-Hans', text: '新' }],
        pronunciation: 'xin(1)',
        definition: ['(adj) new'],
      };

      manager.addWord(newWord);
      expect(manager.getById('10')).toBeDefined();
      expect(manager.getAll().length).toBe(6);
    });

    it('should throw error for duplicate ID', () => {
      const newWord: Word = {
        id: '0',
        spelling: [{ language: 'zh-Hans', text: '新' }],
        pronunciation: 'xin(1)',
        definition: ['(adj) new'],
      };

      expect(() => manager.addWord(newWord)).toThrow('already exists');
    });

    it('should throw error for invalid word', () => {
      const invalidWord: any = {
        id: '10',
        // missing required fields
      };

      expect(() => manager.addWord(invalidWord)).toThrow('Invalid word');
    });
  });

  describe('Updating Words', () => {
    it('should update an existing word', () => {
      manager.updateWord('1', {
        definition: ['(n) master', '(adj) primary'],
      });

      const word = manager.getById('1');
      expect(word?.definition[0]).toBe('(n) master');
    });

    it('should throw error for non-existent word', () => {
      expect(() =>
        manager.updateWord('999', { definition: ['test'] })
      ).toThrow('not found');
    });
  });

  describe('Deleting Words', () => {
    it('should delete a word', () => {
      const initialCount = manager.getAll().length;
      manager.deleteWord('5');
      expect(manager.getAll().length).toBe(initialCount - 1);
      expect(manager.getById('5')).toBeUndefined();
    });

    it('should remove word from sibling references when deleted', () => {
      manager.deleteWord('5');
      const word0 = manager.getById('0');
      expect(word0?.siblingIds).not.toContain('5');
    });

    it('should throw error for non-existent word', () => {
      expect(() => manager.deleteWord('999')).toThrow('not found');
    });
  });

  describe('Linking Relationships', () => {
    it('should link a child word', () => {
      manager.linkChild('1', '3');
      const parent = manager.getById('1');
      expect(parent?.childrenIds).toContain('3');
      const child = manager.getById('3');
      expect(child?.parentIds).toContain('1');
    });

    it('should not create duplicate links', () => {
      manager.linkChild('0', '1'); // already linked
      const parent = manager.getById('0');
      const childCount = parent?.childrenIds?.filter((id) => id === '1').length || 0;
      expect(childCount).toBe(1);
    });

    it('should link sibling words', () => {
      manager.linkSibling('1', '2');
      expect(manager.getById('1')?.siblingIds).toContain('2');
      expect(manager.getById('2')?.siblingIds).toContain('1');
    });

    it('should unlink child words', () => {
      manager.unlinkChild('0', '1');
      expect(manager.getById('0')?.childrenIds).not.toContain('1');
      expect(manager.getById('1')?.parentIds).not.toContain('0');
    });

    it('should unlink sibling words', () => {
      manager.unlinkSibling('0', '5');
      expect(manager.getById('0')?.siblingIds).not.toContain('5');
      expect(manager.getById('5')?.siblingIds).not.toContain('0');
    });
  });

  describe('Export', () => {
    it('should export vocabulary as JSON', () => {
      const json = manager.toJSON();
      expect(Object.keys(json).length).toBe(5);
      expect(json['0']).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should return vocabulary statistics', () => {
      const stats = manager.getStats();
      expect(stats.totalWords).toBe(5);
      expect(stats.wordsWithHskLevel).toBeGreaterThan(0);
      expect(stats.wordsWithJlptLevel).toBeGreaterThan(0);
      expect(stats.averageDefinitionsPerWord).toBeGreaterThan(0);
    });
  });
});
