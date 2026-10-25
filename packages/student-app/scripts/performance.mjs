import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const html = await readFile('dist/index.html', 'utf8');
const boot = JSON.parse(
  html.match(/<script id="dictionary-boot" type="application\/json">([^]*?)<\/script>/)[1]
);
const base = boot.url.split('data/')[0];
const dictionary = JSON.parse(await readFile(`dist/data/${boot.url.split('/data/')[1]}`, 'utf8'));
const detailWord =
  dictionary.find((word) =>
    word.spelling.some((spelling) => spelling.language === 'ja' && spelling.text === '食べる')
  ) ??
  dictionary.find((word) => !boot.words.some((initial) => initial.id === word.id)) ??
  boot.words[0];
if (!detailWord) throw Error('Performance audit requires a word in the published dictionary');
const server = await preview({
  base,
  preview: { host: '127.0.0.1', port: 3016, strictPort: true },
});
const browser = await chromium.launch({ args: ['--remote-debugging-port=9223'] });
const directory = '../../test-results/student-performance';
await mkdir(directory, { recursive: true });
const summary = [];
try {
  for (const [name, path] of [
    ['landing', ''],
    ['word', `?word=${encodeURIComponent(detailWord.id)}`],
  ]) {
    const runs = [];
    for (let run = 0; run < 3; run++) {
      const result = await lighthouse(
        `http://127.0.0.1:3016${base}${path}`,
        { port: 9223, output: ['html', 'json'], logLevel: 'error' },
        {
          extends: 'lighthouse:default',
          settings: {
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
            formFactor: 'mobile',
            throttlingMethod: 'simulate',
            throttling: {
              rttMs: 150,
              throughputKbps: 1638.4,
              cpuSlowdownMultiplier: 4,
              requestLatencyMs: 562.5,
              downloadThroughputKbps: 1474.56,
              uploadThroughputKbps: 675,
            },
            screenEmulation: {
              mobile: true,
              width: 390,
              height: 844,
              deviceScaleFactor: 1,
              disabled: false,
            },
          },
        }
      );
      if (result.lhr.runtimeError) throw Error(result.lhr.runtimeError.message);
      await writeFile(`${directory}/${name}-${run + 1}.html`, result.report[0]);
      await writeFile(`${directory}/${name}-${run + 1}.json`, result.report[1]);
      runs.push({
        scores: Object.fromEntries(
          Object.entries(result.lhr.categories).map(([k, v]) => [k, v.score * 100])
        ),
        lcp: result.lhr.audits['largest-contentful-paint'].numericValue,
        cls: result.lhr.audits['cumulative-layout-shift'].numericValue,
      });
    }
    const median = (values) => [...values].sort((a, b) => a - b)[1];
    const scores = Object.fromEntries(
      Object.keys(runs[0].scores).map((k) => [k, median(runs.map((r) => r.scores[k]))])
    );
    const lcp = median(runs.map((r) => r.lcp)),
      cls = median(runs.map((r) => r.cls));
    summary.push({ name, scores, lcp, cls });
    console.log(JSON.stringify(summary.at(-1)));
  }
  await writeFile(`${directory}/summary.json`, JSON.stringify(summary, null, 2) + '\n');
  for (const result of summary) {
    for (const [kind, minimum] of Object.entries({
      performance: 95,
      accessibility: 100,
      'best-practices': 95,
      seo: 95,
    }))
      if (result.scores[kind] < minimum)
        throw Error(`${result.name}: ${kind} ${result.scores[kind]} < ${minimum}`);
    if (result.lcp > 2500 || result.cls > 0.1)
      throw Error(`${result.name}: Core Web Vitals lab targets exceeded`);
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
