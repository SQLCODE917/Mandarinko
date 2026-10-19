export type DictionaryLocation =
  | { kind: 'closed' }
  | { kind: 'word'; wordId: string }
  | { kind: 'create' }
  | { kind: 'invalid'; message: string };

export type DictionaryDestination = Exclude<DictionaryLocation, { kind: 'invalid' }>;

export function readDictionaryLocation(href: string): DictionaryLocation {
  const params = new URL(href).searchParams;
  const words = params.getAll('word');
  const drafts = params.getAll('newWord');
  if (words.length > 1 || drafts.length > 1 || (words.length && drafts.length)) {
    return { kind: 'invalid', message: 'Choose one word or the new-word form in the URL.' };
  }
  if (words.length) {
    return words[0]
      ? { kind: 'word', wordId: words[0] }
      : { kind: 'invalid', message: 'The word ID in the URL is empty.' };
  }
  if (drafts.length) {
    return drafts[0] === '1'
      ? { kind: 'create' }
      : { kind: 'invalid', message: 'The new-word URL must use newWord=1.' };
  }
  return { kind: 'closed' };
}

export function dictionaryHref(href: string, destination: DictionaryDestination): string {
  const url = new URL(href);
  url.searchParams.delete('word');
  url.searchParams.delete('newWord');
  if (destination.kind === 'word') url.searchParams.set('word', destination.wordId);
  if (destination.kind === 'create') url.searchParams.set('newWord', '1');
  return `${url.pathname}${url.search}${url.hash}`;
}
