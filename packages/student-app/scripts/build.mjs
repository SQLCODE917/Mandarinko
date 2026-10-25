import { build } from 'vite';
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { checkBudgets } from './budgets.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const base = process.env.STUDENT_BASE || '/';
await build();
await build({
  build: {
    ssr: 'src/render.tsx',
    outDir: 'dist/.ssr',
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'render.mjs' } },
  },
});
const { render } = await import('../dist/.ssr/render.mjs');
const html = await readFile('dist/index.html', 'utf8');
const boot = JSON.parse(
  html.match(/<script id="dictionary-boot" type="application\/json">([^]*?)<\/script>/)[1]
);
if (!html.includes('<!--app-->')) throw Error('Missing prerender insertion point');
await writeFile('dist/index.html', html.replace('<!--app-->', render(boot)));
await rm('dist/.ssr', { recursive: true });
await mkdir('dist/licenses', { recursive: true });
await cp('../server/licenses', 'dist/licenses', { recursive: true });
await cp('../server/vocabulary.sources.json', 'dist/vocabulary.sources.json');
await cp('../server/licenses/makemeahanzi-GPL-3.0.txt', 'dist/licenses/application-GPL-3.0.txt');
const files = await import('node:fs/promises').then((fs) => fs.readdir('dist/licenses'));
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
await writeFile(
  'dist/attribution.html',
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dictionary sources — Mandarinko</title><main><h1>Dictionary sources and licenses</h1><p><a href="${base}">Back to dictionary</a></p><p>Japanese vocabulary and JLPT classifications adapt OpenJLPT, derived from Jonathan Waller’s lists and JMdict (EDRDG). OpenJLPT and Wiktionary adaptations are CC BY-SA 4.0. Make Me a Hanzi character data retains LGPL-3.0-or-later terms. Character explanations also draw on Zhongwen.com. Existing material retains its provenance. The application code is GPL-3.0.</p><p>Dictionary content has been selected, normalized and adapted for Mandarinko. Canonical readings and character histories are authored in its shared teacher catalog. See <a href="vocabulary.sources.json">field provenance, source revisions and adapted entry IDs</a>.</p><ul>${files.map((file) => `<li><a href="licenses/${encodeURIComponent(file)}">${escape(file)}</a></li>`).join('')}</ul><p>Source projects: <a href="https://github.com/evanclan/OpenJLPT">OpenJLPT</a>, <a href="https://www.edrdg.org/jmdict/j_jmdict.html">JMdict / EDRDG</a>, <a href="https://github.com/skishore/makemeahanzi">Make Me a Hanzi</a>, <a href="https://en.wiktionary.org/">Wiktionary</a>, <a href="https://zhongwen.com/">Zhongwen.com</a>.</p></main></html>`
);
await writeFile('dist/robots.txt', 'User-agent: *\nAllow: /\n');
await writeFile('dist/.nojekyll', '');
await checkBudgets('dist');
