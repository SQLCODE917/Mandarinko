import type { Word, ValidationError, Spelling } from './types.js';

export class ValidationService {
  /**
   * Validate a word input that does not require an ID yet.
   */
  static validateWordInput(word: Omit<Word, 'id'>): ValidationError[] {
    const withTempId = { ...word, id: '__temp__' } as Word;
    return ValidationService.validateWord(withTempId).filter((err) => err.field !== 'id');
  }

  /**
   * Validate that a word has no unknown fields.
   */
  static validateNoExtraFields(word: unknown): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!word || typeof word !== 'object') {
      errors.push({ field: 'word', message: 'Word must be an object' });
      return errors;
    }
    const allowedFields = new Set([
      'id',
      'spelling',
      'pronunciation',
      'definition',
      'derivation',
      'parentIds',
      'childrenIds',
      'siblingIds',
      'metadata',
    ]);

    const record = word as Record<string, unknown>;
    Object.keys(record).forEach((key) => {
      if (!allowedFields.has(key)) {
        errors.push({ field: key, message: 'Unknown field' });
      }
    });

    if (Array.isArray(record.parentIds) && record.parentIds.length > 0) {
      errors.push({ field: 'parentIds', message: 'parentIds are no longer supported' });
    }

    return errors;
  }
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
        if (
          !spelling.language ||
          typeof spelling.language !== 'string' ||
          spelling.language.trim().length === 0 ||
          !spelling.text ||
          typeof spelling.text !== 'string' ||
          spelling.text.trim().length === 0
        ) {
          errors.push({
            field: `spelling[${index}]`,
            message: 'Each spelling must have language and text',
          });
        }
      });
    }

    // Validate pronunciation
    if (
      !word.pronunciation ||
      typeof word.pronunciation !== 'string' ||
      word.pronunciation.trim().length === 0
    ) {
      errors.push({ field: 'pronunciation', message: 'Pronunciation is required' });
    }

    // Validate definition
    if (!word.definition || !Array.isArray(word.definition) || word.definition.length === 0) {
      errors.push({ field: 'definition', message: 'At least one definition is required' });
    } else {
      word.definition.forEach((def, index) => {
        if (typeof def !== 'string' || def.trim().length === 0) {
          errors.push({
            field: `definition[${index}]`,
            message: 'Each definition must be a string',
          });
        }
      });
    }

    // Validate relationships are arrays of strings
    if (word.parentIds !== undefined) {
      if (!Array.isArray(word.parentIds)) {
        errors.push({ field: 'parentIds', message: 'parentIds must be an array' });
      } else if (word.parentIds.length > 0) {
        errors.push({ field: 'parentIds', message: 'parentIds are no longer supported' });
      }
    }
    if (word.childrenIds && !Array.isArray(word.childrenIds)) {
      errors.push({ field: 'childrenIds', message: 'childrenIds must be an array' });
    } else if (word.childrenIds) {
      word.childrenIds.forEach((id, index) => {
        if (typeof id !== 'string' || id.trim().length === 0) {
          errors.push({ field: `childrenIds[${index}]`, message: 'childrenIds must contain strings' });
        }
      });
    }
    if (word.siblingIds && !Array.isArray(word.siblingIds)) {
      errors.push({ field: 'siblingIds', message: 'siblingIds must be an array' });
    } else if (word.siblingIds) {
      word.siblingIds.forEach((id, index) => {
        if (typeof id !== 'string' || id.trim().length === 0) {
          errors.push({ field: `siblingIds[${index}]`, message: 'siblingIds must contain strings' });
        }
      });
    }

    if (word.derivation !== undefined) {
      if (typeof word.derivation !== 'string') {
        errors.push({ field: 'derivation', message: 'derivation must be a string' });
      }
    }

    return errors;
  }

  /**
   * Validate spelling field
   */
  static validateSpelling(spelling: Spelling): ValidationError[] {
    const errors: ValidationError[] = [];

    if (
      !spelling.language ||
      typeof spelling.language !== 'string' ||
      spelling.language.trim().length === 0
    ) {
      errors.push({ field: 'language', message: 'Language is required and must be a string' });
    }

    if (!spelling.text || typeof spelling.text !== 'string' || spelling.text.trim().length === 0) {
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

    validateIdArray(word.childrenIds, 'childrenIds');
    validateIdArray(word.siblingIds, 'siblingIds');

    return errors;
  }
}
