import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
export async function checkBudgets(directory) {
  const manifest = JSON.parse(await readFile(`${directory}/.vite/manifest.json`, 'utf8'));
  const js = new Set(),
    css = new Set();
  function visit(key) {
    const entry = manifest[key];
    if (!entry) throw Error(`Missing manifest entry ${key}`);
    if (js.has(entry.file)) return;
    js.add(entry.file);
    for (const file of entry.css ?? []) css.add(file);
    for (const dependency of entry.imports ?? []) visit(dependency);
  }
  for (const [key, entry] of Object.entries(manifest)) if (entry.isEntry) visit(key);
  const compressed = async (file) => gzipSync(await readFile(`${directory}/${file}`)).length;
  const sum = async (files) =>
    (await Promise.all([...files].map(compressed))).reduce((a, b) => a + b, 0);
  const html = await readFile(`${directory}/index.html`, 'utf8');
  const boot = JSON.parse(
    html.match(/<script id="dictionary-boot" type="application\/json">([^]*?)<\/script>/)[1]
  );
  const dictionaryFile = `data/${boot.url.split('/data/')[1]}`;
  const sizes = {
    javascript: await sum(js),
    css: await sum(css),
    html: await compressed('index.html'),
    dictionary: await compressed(dictionaryFile),
  };
  const limits = {
    javascript: 100 * 1024,
    css: 20 * 1024,
    html: 40 * 1024,
    dictionary: 300 * 1024,
  };
  for (const [kind, size] of Object.entries(sizes)) {
    console.log(`${kind}: ${(size / 1024).toFixed(1)} KiB gzip / ${limits[kind] / 1024} KiB`);
    if (size > limits[kind]) throw Error(`${kind} exceeds its compressed budget`);
  }
  await writeFile(`${directory}/budgets.json`, JSON.stringify({ sizes, limits }, null, 2) + '\n');
  return sizes;
}
