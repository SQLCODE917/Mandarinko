import type { GrammarData, GrammarPattern, ValidationError } from './types.js';
import { isRecord, isText, validateEntryText } from './entryValidation.js';

function extraFields(value: Record<string, unknown>, allowed: string[]): ValidationError[] {
  return Object.keys(value)
    .filter((key) => !allowed.includes(key))
    .map((field) => ({ field, message: 'Unknown field' }));
}

export function validateGrammarPattern(input: unknown): ValidationError[] {
  if (!isRecord(input)) return [{ field: 'pattern', message: 'Grammar pattern must be an object' }];
  const errors = [
    ...validateEntryText(input),
    ...extraFields(input, [
      'id',
      'spelling',
      'title',
      'definition',
      'examples',
      'category',
      'metadata',
      'contrastIds',
    ]),
  ];
  for (const field of ['id', 'title']) {
    if (!isText(input[field]))
      errors.push({ field, message: `${field} is required and must be a string` });
  }
  if (input.category !== undefined && typeof input.category !== 'string') {
    errors.push({ field: 'category', message: 'Category must be a string' });
  }
  if (!Array.isArray(input.examples)) {
    errors.push({ field: 'examples', message: 'Examples must be an array' });
  } else {
    input.examples.forEach((example, index) => {
      const nested = isRecord(example)
        ? [...validateEntryText(example), ...extraFields(example, ['spelling', 'definition'])]
        : [{ field: '', message: 'Example must be an object' }];
      errors.push(
        ...nested.map((error) => ({
          ...error,
          field: `examples[${index}]${error.field ? `.${error.field}` : ''}`,
        }))
      );
    });
  }
  if (input.metadata !== undefined) {
    if (!isRecord(input.metadata)) {
      errors.push({ field: 'metadata', message: 'Metadata must be an object' });
    } else {
      errors.push(
        ...extraFields(input.metadata, [
          'hskLevel',
          'jlptLevel',
          'frequency',
          'addedAt',
          'updatedAt',
          'addedBy',
        ]).map((error) => ({ ...error, field: `metadata.${error.field}` }))
      );
      for (const [key, value] of Object.entries(input.metadata)) {
        if (value === undefined) continue;
        if (
          key === 'addedBy'
            ? typeof value !== 'string'
            : typeof value !== 'number' || !Number.isFinite(value)
        ) {
          errors.push({ field: `metadata.${key}`, message: `Invalid ${key}` });
        }
      }
    }
  }
  if (input.contrastIds !== undefined) {
    if (!Array.isArray(input.contrastIds))
      errors.push({ field: 'contrastIds', message: 'Contrast IDs must be an array' });
    else
      input.contrastIds.forEach((id, index) => {
        if (!isText(id))
          errors.push({ field: `contrastIds[${index}]`, message: 'Contrast ID must be a string' });
      });
  }
  return errors;
}

export function validateGrammarReferences(
  pattern: GrammarPattern,
  patterns: GrammarPattern[]
): ValidationError[] {
  return (pattern.contrastIds ?? [])
    .filter((id) => id === pattern.id || !patterns.some((other) => other.id === id))
    .map((id) => ({
      field: 'contrastIds',
      message: `Contrast “${id}” must refer to another existing grammar pattern`,
    }));
}

export function parseGrammarData(input: unknown): GrammarData {
  if (!isRecord(input) || input.schemaVersion !== 1 || !Array.isArray(input.patterns)) {
    throw new Error('Invalid grammar file: expected schemaVersion 1 and patterns array');
  }
  const ids = new Set<string>();
  for (const value of input.patterns) {
    const errors = validateGrammarPattern(value);
    if (errors.length)
      throw new Error(`Invalid grammar pattern: ${errors[0].field}: ${errors[0].message}`);
    const pattern = value as GrammarPattern;
    if (ids.has(pattern.id)) throw new Error(`Duplicate grammar pattern ID: ${pattern.id}`);
    ids.add(pattern.id);
  }
  const data = input as unknown as GrammarData;
  for (const pattern of data.patterns) {
    const errors = validateGrammarReferences(pattern, data.patterns);
    if (errors.length) throw new Error(errors[0].message);
  }
  return data;
}
