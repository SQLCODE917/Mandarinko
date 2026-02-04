import type { Word, ValidationError, Spelling } from './types.js';

export class ValidationService {
  /**
   * Validate a complete word entry
   */
  static validateWord(word: Word): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate ID
    if (!word.id || typeof word.id !== 'string') {
      errors.push({ field: 'id', message: 'ID is required and must be a string' });
    }

    // Validate spelling
    if (!word.spelling || !Array.isArray(word.spelling) || word.spelling.length === 0) {
      errors.push({ field: 'spelling', message: 'At least one spelling is required' });
    } else {
      word.spelling.forEach((spelling, index) => {
        if (!spelling.language || !spelling.text) {
          errors.push({
            field: `spelling[${index}]`,
            message: 'Each spelling must have language and text',
          });
        }
      });
    }

    // Validate pronunciation
    if (!word.pronunciation || typeof word.pronunciation !== 'string') {
      errors.push({ field: 'pronunciation', message: 'Pronunciation is required' });
    }

    // Validate definition
    if (!word.definition || !Array.isArray(word.definition) || word.definition.length === 0) {
      errors.push({ field: 'definition', message: 'At least one definition is required' });
    } else {
      word.definition.forEach((def, index) => {
        if (typeof def !== 'string') {
          errors.push({
            field: `definition[${index}]`,
            message: 'Each definition must be a string',
          });
        }
      });
    }

    // Validate relationships are arrays of strings
    if (word.parentIds && !Array.isArray(word.parentIds)) {
      errors.push({ field: 'parentIds', message: 'parentIds must be an array' });
    }
    if (word.childrenIds && !Array.isArray(word.childrenIds)) {
      errors.push({ field: 'childrenIds', message: 'childrenIds must be an array' });
    }
    if (word.siblingIds && !Array.isArray(word.siblingIds)) {
      errors.push({ field: 'siblingIds', message: 'siblingIds must be an array' });
    }

    return errors;
  }

  /**
   * Validate spelling field
   */
  static validateSpelling(spelling: Spelling): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!spelling.language || typeof spelling.language !== 'string') {
      errors.push({ field: 'language', message: 'Language is required and must be a string' });
    }

    if (!spelling.text || typeof spelling.text !== 'string') {
      errors.push({ field: 'text', message: 'Text is required and must be a string' });
    }

    return errors;
  }

  /**
   * Check if word references are valid (referenced words exist)
   */
  static validateReferences(word: Word, allWords: Map<string, Word>): ValidationError[] {
    const errors: ValidationError[] = [];

    const validateIdArray = (ids: string[] | undefined, field: string) => {
      if (!ids) return;
      ids.forEach((id) => {
        if (!allWords.has(id)) {
          errors.push({
            field,
            message: `Referenced word with ID "${id}" does not exist`,
          });
        }
      });
    };

    validateIdArray(word.parentIds, 'parentIds');
    validateIdArray(word.childrenIds, 'childrenIds');
    validateIdArray(word.siblingIds, 'siblingIds');

    return errors;
  }
}
