export const editorNavigationEvent = 'mandarinko:dictionary-navigation';
export function readEditorLocation() {
  const params = new URL(window.location.href).searchParams;
  if (!params.has('editor') && !params.has('node')) return null;
  return {
    workspace: params.get('editor') ?? '',
    node: Number(params.get('node')),
    valid:
      params.getAll('editor').length === 1 &&
      params.getAll('node').length === 1 &&
      /^[1-9]\d*$/.test(params.get('node') ?? ''),
  };
}
export function writeEditorLocation(workspace?: string, node?: number, replace = false) {
  const url = new URL(window.location.href);
  url.searchParams.delete('editor');
  url.searchParams.delete('node');
  if (workspace) {
    url.searchParams.set('editor', workspace);
    url.searchParams.set('node', String(node));
  }
  if (url.href === window.location.href) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
  window.dispatchEvent(new Event(editorNavigationEvent));
}
