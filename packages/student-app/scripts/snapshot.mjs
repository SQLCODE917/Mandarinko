import { createHash } from 'node:crypto';
import { ValidationService } from '@mandarinko/core';
export function snapshot(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw Error('Dictionary must be an object');
  const words = Object.entries(input).map(([id, entry]) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      throw Error(`Invalid dictionary entry: ${id}`);
    const word = { ...entry, id };
    for (const field of ['childrenIds', 'siblingIds']) {
      if (Array.isArray(word[field]))
        word[field] = word[field].map((value) =>
          typeof value === 'number' && Number.isInteger(value) ? String(value) : value
        );
    }
    const errors = ValidationService.validateWord(word);
    if (errors.length)
      throw Error(
        `Invalid dictionary entry ${id}: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
      );
    return word;
  });
  const json = JSON.stringify(words);
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 16);
  return { words, json, file: `dictionary.${hash}.json` };
}
export const safeJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
