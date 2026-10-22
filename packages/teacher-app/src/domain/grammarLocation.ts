export type GrammarLocation =
  | { kind: 'closed' }
  | { kind: 'pattern'; id: string }
  | { kind: 'create' }
  | { kind: 'invalid'; message: string };

export function readGrammarLocation(href: string): GrammarLocation {
  const params = new URL(href).searchParams;
  const patterns = params.getAll('pattern'),
    drafts = params.getAll('newPattern');
  if (patterns.length > 1 || drafts.length > 1 || (patterns.length && drafts.length))
    return {
      kind: 'invalid',
      message: 'Choose one grammar pattern or the new-pattern form in the URL.',
    };
  if (patterns.length)
    return patterns[0]
      ? { kind: 'pattern', id: patterns[0] }
      : { kind: 'invalid', message: 'The grammar pattern ID is empty.' };
  if (drafts.length)
    return drafts[0] === '1'
      ? { kind: 'create' }
      : { kind: 'invalid', message: 'The new-pattern URL must use newPattern=1.' };
  return { kind: 'closed' };
}
export function grammarHref(
  href: string,
  destination: Exclude<GrammarLocation, { kind: 'invalid' }>
): string {
  const url = new URL(href);
  url.searchParams.delete('pattern');
  url.searchParams.delete('newPattern');
  if (destination.kind === 'pattern') url.searchParams.set('pattern', destination.id);
  if (destination.kind === 'create') url.searchParams.set('newPattern', '1');
  return `${url.pathname}${url.search}${url.hash}`;
}
