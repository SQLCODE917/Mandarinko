import type { ValidationError } from './types.js';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** Common text fields used by words, patterns, and examples. Safe at JSON boundaries. */
export function validateEntryText(entry: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!Array.isArray(entry.spelling) || entry.spelling.length === 0) {
    errors.push({ field: 'spelling', message: 'At least one spelling is required' });
  } else {
    entry.spelling.forEach((spelling, index) => {
      if (!isRecord(spelling) || !isText(spelling.language) || !isText(spelling.text)) {
        errors.push({
          field: `spelling[${index}]`,
          message: 'Each spelling must have language and text',
        });
      }
    });
  }
  if (!Array.isArray(entry.definition) || entry.definition.length === 0) {
    errors.push({ field: 'definition', message: 'At least one definition is required' });
  } else {
    entry.definition.forEach((definition, index) => {
      if (!isText(definition)) {
        errors.push({ field: `definition[${index}]`, message: 'Each definition must be a string' });
      }
    });
  }
  return errors;
}
