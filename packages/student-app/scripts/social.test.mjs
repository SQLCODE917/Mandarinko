import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { socialMetadata } from './social.mjs';
const property = (tags, name) => tags.find((tag) => tag.attrs?.property === name)?.attrs.content;
test('domain and project builds emit absolute, consistent social URLs', () => {
  for (const [base, override, expected] of [
    ['/', undefined, 'https://sqlcode917.github.io/'],
    ['/Mandarinko/', undefined, 'https://sqlcode917.github.io/Mandarinko/'],
    ['/study/', 'https://example.org/study', 'https://example.org/study/'],
  ]) {
    const tags = socialMetadata(base, override);
    assert(
      tags.every((tag) => tag.injectTo === 'head'),
      'Preserve the early charset declaration'
    );
    assert.equal(property(tags, 'og:url'), expected);
    assert.equal(property(tags, 'og:image'), `${expected}mandarinko-preview.png`);
    assert.equal(tags.find((tag) => tag.attrs?.rel === 'canonical').attrs.href, expected);
    assert.equal(tags.find((tag) => tag.tag === 'title').children, property(tags, 'og:title'));
    assert.equal(
      tags.find((tag) => tag.attrs?.name === 'description').attrs.content,
      property(tags, 'og:description')
    );
  }
});
test('invalid site locations fail before publication', () => {
  for (const url of [
    'file:///tmp/site',
    'https://example.org/?q=秋',
    'https://example.org/#word',
    'https://user:secret@example.org/',
  ])
    assert.throws(() => socialMetadata('/', url), /STUDENT_SITE_URL/);
});
test('the committed preview is a PNG matching the declared image dimensions', async () => {
  const png = await readFile(new URL('../public/mandarinko-preview.png', import.meta.url));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), Number(property(socialMetadata('/'), 'og:image:width')));
  assert.equal(png.readUInt32BE(20), Number(property(socialMetadata('/'), 'og:image:height')));
});
