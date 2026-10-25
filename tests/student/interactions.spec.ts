import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const raw = JSON.parse(
  await readFile(new URL('../../packages/server/vocabulary.json', import.meta.url), 'utf8')
);

// Trace snapshots force off-screen layout; measure paints without that instrumentation.
test.use({ trace: 'off' });
test('typing, clearing and details paint within 200ms at 4x CPU slowdown', async ({
  page,
}, info) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('./');
  await expect(page.locator('.dictionary-card')).toHaveCount(Object.keys(raw).length);
  const timings: Record<string, number> = {};
  // Measure inside the browser from event dispatch through the next paint, avoiding test-driver latency.
  timings.search = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const input = document.querySelector('input')!;
        const start = performance.now();
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
          input,
          '食べる'
        );
        input.dispatchEvent(new Event('input', { bubbles: true }));
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve(performance.now() - start))
        );
      })
  );
  await expect(page.locator('.dictionary-card:not([hidden])')).toHaveCount(1);
  timings.details = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const start = performance.now();
        (document.querySelector('.dictionary-card:not([hidden])') as HTMLButtonElement).click();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve(performance.now() - start))
        );
      })
  );
  await expect(page.getByRole('dialog')).toContainText('たべる');
  await page.keyboard.press('Escape');
  timings.clearSearch = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const input = document.querySelector('input')!;
        const start = performance.now();
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve(performance.now() - start))
        );
      })
  );
  await expect(page.locator('.dictionary-card')).toHaveCount(Object.keys(raw).length);
  await info.attach('interaction-timings', {
    body: JSON.stringify(timings),
    contentType: 'application/json',
  });
  for (const duration of Object.values(timings)) expect(duration).toBeLessThanOrEqual(200);
});
