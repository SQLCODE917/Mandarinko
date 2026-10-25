// Production-build comparison: cached catalog, 4x CPU, mobile viewport, no tracing.
import { chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const output = resolve(process.argv[2] ?? 'test-results/dictionary-performance');
await mkdir(output, { recursive: true });
const studentRoot = resolve('packages/student-app/dist');
const html = await readFile(`${studentRoot}/index.html`, 'utf8');
const boot = JSON.parse(
  html.match(/<script id="dictionary-boot" type="application\/json">([^]*?)<\/script>/)[1]
);
const words = JSON.parse(await readFile(resolve(studentRoot, `.${boot.url}`), 'utf8'));
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};
const results = [];
for (const app of ['student', 'teacher']) {
  const root = resolve(`packages/${app}-app/dist`);
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!file.startsWith(`${root}/`)) throw Error('Invalid path');
      const data = await readFile(file);
      res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      if (app === 'teacher')
        await page.route('http://localhost:3000/api/**', (route) => {
          if (route.request().method() !== 'GET') throw Error('Benchmark must never mutate data');
          return route.fulfill({ json: words, headers: { 'access-control-allow-origin': '*' } });
        });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      const cards = app === 'student' ? '.dictionary-card' : '.word-item';
      const resultsSelector =
        app === 'student' ? '.dictionary-card:not([hidden])' : '.result-item:not([hidden])';
      await expect(page.locator(cards)).toHaveCount(words.length);
      await page.evaluate(() => document.fonts.ready);
      const query = (value) =>
        page.evaluate(
          (value) =>
            new Promise((resolve) => {
              const input = document.querySelector('input[type=search]');
              const start = performance.now();
              Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(
                input,
                value
              );
              input.dispatchEvent(new Event('input', { bubbles: true }));
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve(performance.now() - start))
              );
            }),
          value
        );
      const narrowSearchMs = await query('食べる');
      await expect(page.locator(resultsSelector)).toHaveCount(1);
      const detailsMs = await page.evaluate(
        (selector) =>
          new Promise((resolve) => {
            const start = performance.now();
            document.querySelector(selector).click();
            requestAnimationFrame(() =>
              requestAnimationFrame(() => resolve(performance.now() - start))
            );
          }),
        resultsSelector
      );
      await expect(page.getByRole('dialog')).toContainText('たべる');
      await page.keyboard.press('Escape');
      const clearSearchMs = await query('');
      await expect(page.locator(resultsSelector)).toHaveCount(app === 'student' ? words.length : 0);
      const broadSearchMs = await query('e');
      await expect(page.locator(resultsSelector)).toHaveCount(words.length);
      const clearBroadSearchMs = await query('');
      const domNodes = await page.locator('*').count();
      const result = {
        app,
        run,
        narrowSearchMs,
        detailsMs,
        clearSearchMs,
        broadSearchMs,
        clearBroadSearchMs,
        domNodes,
      };
      results.push(result);
      console.log(JSON.stringify(result));
      if (run === 1) {
        await page.screenshot({ path: `${output}/${app}-mobile.png` });
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.screenshot({ path: `${output}/${app}-desktop.png` });
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
await writeFile(`${output}/interactions.json`, JSON.stringify(results, null, 2) + '\n');
