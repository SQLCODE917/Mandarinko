const title = 'Mandarinko — Chinese & Japanese Dictionary';
const description =
  'Explore Chinese and Japanese words, readings, character components and their connections.';
const imageAlt = 'Mandarinko — Chinese & Japanese Dictionary, with its magenta CRT wordmark.';

/** Build-time HTML tags; every query URL shares the site's canonical preview. */
export function socialMetadata(base, configuredUrl) {
  const url = new URL(configuredUrl || base, 'https://sqlcode917.github.io/');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw Error(
      'STUDENT_SITE_URL must be an HTTP(S) site URL without credentials, query or fragment'
    );
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  const image = new URL('mandarinko-preview.png', url).href;
  const property = (name, content) => ({ tag: 'meta', attrs: { property: name, content } });
  const meta = (name, content) => ({ tag: 'meta', attrs: { name, content } });
  return [
    { tag: 'title', children: title },
    meta('description', description),
    { tag: 'link', attrs: { rel: 'canonical', href: url.href } },
    property('og:type', 'website'),
    property('og:site_name', 'Mandarinko'),
    property('og:title', title),
    property('og:description', description),
    property('og:url', url.href),
    property('og:image', image),
    property('og:image:type', 'image/png'),
    property('og:image:width', '1200'),
    property('og:image:height', '630'),
    property('og:image:alt', imageAlt),
    meta('twitter:card', 'summary_large_image'),
    meta('twitter:title', title),
    meta('twitter:description', description),
    meta('twitter:image', image),
    meta('twitter:image:alt', imageAlt),
  ].map((tag) => ({ ...tag, injectTo: 'head' }));
}
