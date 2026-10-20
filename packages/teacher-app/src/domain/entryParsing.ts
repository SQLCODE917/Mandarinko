import type { Word } from '@mandarinko/core';

export const languageFamily = (language: string) => language.toLowerCase().split('-')[0];
export const componentSpellings = (text: string) => [
  ...new Set(
    text
      .split(/[,，;；\r\n]+/u)
      .map((value) => value.trim())
      .filter(Boolean)
  ),
];
export function spellingMatches(word: Pick<Word, 'spelling'>, text: string, language: string) {
  return word.spelling.some(
    (s) =>
      languageFamily(s.language) === languageFamily(language) &&
      s.text.normalize('NFC').trim() === text.normalize('NFC').trim()
  );
}
export type PasteRow = { line: number; values: Record<string, string> };
const columns = new Set([
  'spelling',
  'language',
  'traditional',
  'pronunciation',
  'definitions',
  'derivation',
  'children',
  'siblings',
  'hskLevel',
  'jlptLevel',
  'root',
]);
/** Spreadsheet TSV, including escaped quotes and quoted tabs/newlines. */
export function parseEntryPaste(text: string): PasteRow[] {
  const records: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false;
  const pushCell = () => {
    row.push(cell);
    cell = '';
    closed = false;
  };
  const pushRow = () => {
    pushCell();
    if (row.some((v) => v.trim())) records.push(row);
    row = [];
  };
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else cell += char;
    } else if (char === '\t') pushCell();
    else if (char === '\n') pushRow();
    else if (char === '"' && cell === '' && !closed) quoted = true;
    else {
      if (closed) throw new Error('Unexpected text after a quoted cell.');
      if (char === '"') throw new Error('Quotes must enclose the entire cell.');
      cell += char;
    }
  }
  if (quoted) throw new Error('A quoted spreadsheet cell is unfinished.');
  if (cell || row.length) pushRow();
  const header = records.shift()?.map((value) => value.trim()) ?? [];
  if (!header.includes('spelling')) throw new Error('Include a spelling column header.');
  if (new Set(header).size !== header.length || header.some((name) => !columns.has(name)))
    throw new Error('Column headers must be unique supported names.');
  return records.map((values, index) => {
    if (values.length > header.length) throw new Error(`Row ${index + 2} has too many cells.`);
    const record = Object.fromEntries(header.map((key, i) => [key, values[i] ?? '']));
    if (!record.spelling?.trim()) throw new Error(`Row ${index + 2} needs a spelling.`);
    for (const key of ['hskLevel', 'jlptLevel'])
      if (
        record[key]?.trim() &&
        (!/^\d+$/.test(record[key]) ||
          Number(record[key]) < 1 ||
          Number(record[key]) > (key === 'hskLevel' ? 9 : 5))
      )
        throw new Error(`Row ${index + 2}: invalid ${key}.`);
    if (record.root && !['true', 'false', '1', '0'].includes(record.root.trim().toLowerCase()))
      throw new Error(`Row ${index + 2}: root must be true or false.`);
    if (record.traditional?.trim() && languageFamily(record.language?.trim() || 'zh-Hans') !== 'zh')
      throw new Error(`Row ${index + 2}: traditional is only supported for Chinese.`);
    return { line: index + 2, values: record };
  });
}
