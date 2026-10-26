// Recreate the committed social image from the application's existing CRT treatment.
import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const crt = await readFile(new URL('../../ui/src/crt.css', import.meta.url), 'utf8');
const output = new URL('../public/mandarinko-preview.png', import.meta.url);
await mkdir(new URL('../public/', import.meta.url), { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>
    ${crt}
    * { box-sizing: border-box; }
    body { margin: 0; background: #fbfaf7; color: #292723; font-family: system-ui, sans-serif; }
    header { height: 240px; display: flex; align-items: center; justify-content: center; gap: 26px; }
    .crt-text { font-size: 96px; }
    .crt-badge { font-size: 58px; padding: 6px 14px; }
    main { padding: 48px 80px; }
    h1 { font-size: 46px; font-weight: 600; margin: 0 0 22px; letter-spacing: -1px; }
    p { font-size: 30px; line-height: 1.5; color: #5e554c; margin: 0; }
    .footer { margin-top: 42px; display: flex; align-items: center; justify-content: space-between; border-top: 2px solid #d8cfc2; padding-top: 22px; }
    .characters { font: 42px serif; letter-spacing: 14px; color: #92205a; }
    .address { font-size: 22px; color: #6a6055; }
  </style><header class="crt-screen"><span class="crt-badge">国语こ</span><span class="crt-text">Mandarinko</span></header><main><h1>Chinese &amp; Japanese Dictionary</h1><p>Explore words, readings, character components<br>and their connections.</p><div class="footer"><span class="characters">字 · 語 · 学</span><span class="address">sqlcode917.github.io</span></div></main></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: output.pathname, animations: 'disabled' });
  console.log(`Wrote ${output.pathname}`);
} finally {
  await browser.close();
}
