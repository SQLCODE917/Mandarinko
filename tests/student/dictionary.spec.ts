import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const raw = JSON.parse(
  await readFile(new URL('../../packages/server/vocabulary.json', import.meta.url), 'utf8')
);
const eatId = Object.entries(raw).find(([, w]) =>
  (w as { spelling: { text: string }[] }).spelling.some((s) => s.text === '食べる')
)![0];
test('prerendered preview works without JavaScript and without fonts or third parties', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.locator('.dictionary-card')).toHaveCount(24);
  await expect(
    page.getByRole('heading', { name: `All Words (${Object.keys(raw).length})` })
  ).toBeVisible();
  await context.close();
});
test('continuous browsing, search, IME, details and history work at a project subpath', async ({
  page,
  baseURL,
}, info) => {
  const invalid: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => {
    if (
      r.method() !== 'GET' ||
      !r.url().startsWith(baseURL!) ||
      /\.(woff2?|ttf)|localhost:3000|stroke|grammar/i.test(r.url())
    )
      invalid.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  const cards = page.locator('.dictionary-card:not([hidden])');
  await expect(cards).toHaveCount(Object.keys(raw).length);
  await expect(page.getByRole('navigation', { name: 'Dictionary pages' })).toHaveCount(0);
  await cards.last().scrollIntoViewIfNeeded();
  await expect(cards.last()).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, 0));
  const input = page.getByRole('searchbox');
  const originalCard = await cards.filter({ hasText: 'たべる' }).first().elementHandle();
  await input.fill('食べる');
  await expect(cards).toHaveCount(1);
  expect(
    await originalCard!.evaluate(
      (node) => node === document.querySelector('.dictionary-card:not([hidden])')
    )
  ).toBe(true);
  await expect(page).not.toHaveURL(/page=/);
  await cards.first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('たべる');
  await expect(dialog.getByRole('region', { name: 'Components' })).toContainText('食');
  await dialog.getByRole('region', { name: 'Components' }).getByRole('link').first().click();
  await expect(dialog).not.toContainText('たべる');
  await page.goBack();
  await expect(dialog).toContainText('たべる');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(cards.first()).toBeFocused();
  await input.fill('nothing-unmatched');
  await expect(page.getByText('No results', { exact: true })).toBeVisible();
  await input.dispatchEvent('compositionstart');
  await input.fill('食');
  await expect(page).toHaveURL(/nothing-unmatched/);
  await input.dispatchEvent('compositionend');
  await expect(page).not.toHaveURL(/nothing-unmatched/);
  await input.fill('');
  await expect(cards).toHaveCount(Object.keys(raw).length);
  await page.screenshot({ path: info.outputPath('student-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('student-mobile.png') });
  await page.goto(`?word=${eatId}`);
  await expect(dialog).toContainText('たべる');
  await page.screenshot({ path: info.outputPath('student-details-mobile.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.goto('?word=missing');
  await expect(dialog).toContainText('Word not found.');
  expect(invalid).toEqual([]);
  expect(errors).toEqual([]);
});
test('snapshot failures require explicit retry and do not hide prerendered entries', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/data/dictionary.*.json', (route) => {
    calls++;
    return calls === 1 ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue();
  });
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('Please retry');
  await expect(page.locator('.dictionary-card')).toHaveCount(24);
  expect(calls).toBe(1);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.dictionary-card')).toHaveCount(Object.keys(raw).length);
  expect(calls).toBe(2);
});
test('keyboard focus remains in word details and returns to its trigger', async ({ page }) => {
  await page.goto('./');
  const card = page.locator('.dictionary-card').first();
  await card.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.word-tree-title')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((e) => e.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
});
test('cold direct-word loading preserves the dialog frame', async ({ page }) => {
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/data/dictionary.*.json', async (route) => {
    await delayed;
    await route.continue();
  });
  await page.goto(`?word=${eatId}`);
  const frame = page.locator('.student-details .word-tree-content');
  await expect(page.getByRole('dialog')).toContainText('Loading word');
  const before = (await frame.boundingBox())!;
  release();
  await expect(page.getByRole('dialog')).toContainText('たべる');
  const after = (await frame.boundingBox())!;
  expect(after.y).toBeCloseTo(before.y, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
});

test('Chinese derivation references prefer Chinese homographs over Japanese entries', async ({
  page,
}) => {
  await page.goto('?word=c40d22f6-d48d-400d-a3e6-f31b6249d869');
  const dialog = page.getByRole('dialog');
  const link = dialog
    .locator('.word-entry-derivation')
    .getByRole('link', { name: '八', exact: true });
  await expect(link).toHaveAttribute('href', /word=c4d70470-1a5f-4231-af61-2bf56e688796/);
  await link.click();
  await expect(page).toHaveURL(/word=c4d70470-1a5f-4231-af61-2bf56e688796/);
  await expect(dialog).toContainText('bā');
  await expect(dialog).toContainText('Ideograph representing division.');
  await page.goBack();
  await expect(dialog).toContainText('separated by 八');
});

test('query links expose static social metadata and a published image without JavaScript', async ({
  browser,
  baseURL,
  request,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}?q=%E7%A7%8B`);
    const canonical = new URL(new URL(baseURL!).pathname, 'https://sqlcode917.github.io/').href;
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Mandarinko — Chinese & Japanese Dictionary'
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', canonical);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      `${canonical}mandarinko-preview.png`
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image'
    );
    expect(
      await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .some((r) => r.name.endsWith('mandarinko-preview.png'))
      )
    ).toBe(false);
    const image = await request.get(new URL('mandarinko-preview.png', baseURL).href);
    expect(image.ok()).toBe(true);
    expect(image.headers()['content-type']).toContain('image/png');
    expect((await image.body()).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  } finally {
    await context.close();
  }
});

for (const width of [1280, 390]) {
  test(`component branches collapse independently with pointer and keyboard at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('**/data/dictionary.*.json', (route) =>
      route.fulfill({
        json: [
          {
            id: 'collapse-root',
            spelling: [{ language: 'zh-Hant', text: '林' }],
            pronunciation: 'lín',
            definition: ['forest'],
            childrenIds: ['branch', 'next'],
          },
          {
            id: 'branch',
            spelling: [{ language: 'zh-Hant', text: '木' }],
            pronunciation: 'mù',
            definition: ['branch definition'],
            derivation: 'A tree with roots. '.repeat(35),
            childrenIds: ['nested'],
          },
          {
            id: 'nested',
            spelling: [{ language: 'zh-Hant', text: '十' }],
            pronunciation: 'shí',
            definition: ['nested definition'],
          },
          {
            id: 'next',
            spelling: [{ language: 'zh-Hant', text: '八' }],
            pronunciation: 'bā',
            definition: ['next component definition'],
          },
        ],
      })
    );
    await page.goto('?word=collapse-root');
    const dialog = page.getByRole('dialog');
    const components = dialog.getByRole('region', { name: 'Components' });
    const branch = components
      .locator('.component-branch')
      .filter({ has: page.getByRole('button', { name: /^(Collapse|Expand) 木 component$/ }) })
      .first();
    const branchToggle = branch.locator(':scope > .component-toggle');
    const nestedToggle = components.getByRole('button', {
      name: /^(Collapse|Expand) 十 component$/,
    });
    const nextToggle = components.getByRole('button', { name: /^(Collapse|Expand) 八 component$/ });
    for (const toggle of [branchToggle, nestedToggle, nextToggle]) {
      const box = (await toggle.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await expect(components.getByText('Open details', { exact: true })).toHaveCount(0);
    await expect(components.getByText('nested definition', { exact: true })).toBeVisible();
    const expandedHeight = (await branch.boundingBox())!.height;
    await page.screenshot({ path: info.outputPath('components-expanded.png') });
    await nestedToggle.click();
    await branchToggle.click();
    await expect(branchToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(components.getByText('branch definition', { exact: true })).not.toBeVisible();
    await expect(components.getByText('next component definition', { exact: true })).toBeVisible();
    expect((await branch.boundingBox())!.height).toBeLessThan(expandedHeight);
    await expect(page).toHaveURL(/word=collapse-root/);
    await branchToggle.focus();
    await page.keyboard.press('Enter');
    await expect(branchToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(components.getByText('nested definition', { exact: true })).not.toBeVisible();
    await page.keyboard.press('Space');
    await nextToggle.click();
    await dialog.locator('.word-tree-title').focus();
    await page.keyboard.press('Shift+Tab');
    await expect(components.getByRole('link').filter({ hasText: '八' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
    await page.screenshot({ path: info.outputPath('components-collapsed.png') });
    await components
      .getByRole('link')
      .filter({ hasText: '木' })
      .locator('.word-entry-spellings')
      .click();
    await expect(page).toHaveURL(/word=branch/);
    await page.goBack();
    await expect(page).toHaveURL(/word=collapse-root/);
    await expect(branchToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(components.getByText('nested definition', { exact: true })).toBeVisible();
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
}

for (const [wordId, nested] of [
  ['4', false],
  ['2', true],
] as const) {
  test(`derivation-only references navigate independently from ${nested ? 'component' : 'main'} details`, async ({
    page,
  }) => {
    await page.goto(`?word=${wordId}`);
    const dialog = page.getByRole('dialog');
    const derivation = nested
      ? dialog
          .getByRole('button', { name: 'Collapse 长 / 長 component', exact: true })
          .locator('..')
          .locator('.component-body > .word-entry > .word-entry-derivation')
      : dialog.locator('.word-tree-body > .word-entry > .word-entry-derivation');
    for (const [character, id] of [
      ['丌', '4029f903-19f7-4578-bd7e-102e57162863'],
      ['匕', 'd14ef064-3b70-419d-b0bb-6451c13c5c2a'],
      ['亡', '873d8d64-a057-4d4d-bf46-0333a9db8e9c'],
    ]) {
      const link = derivation.getByRole('link', { name: character, exact: true });
      await expect(link).toHaveAttribute('href', new RegExp(`word=${id}`));
      await link.click();
      await expect(page).toHaveURL(new RegExp(`word=${id}`));
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`word=${wordId}$`));
    }
    expect(await dialog.locator('a a').count()).toBe(0);
  });
}

test('related-word derivations expose their own links without wrapping them in a parent link', async ({
  page,
}) => {
  const tableId = '4029f903-19f7-4578-bd7e-102e57162863';
  const personId = 'd14ef064-3b70-419d-b0bb-6451c13c5c2a';
  const deathId = '873d8d64-a057-4d4d-bf46-0333a9db8e9c';
  await page.route('**/data/dictionary.*.json', (route) =>
    route.fulfill({
      json: [
        {
          id: 'related-root',
          spelling: [{ language: 'zh-Hant', text: '木' }],
          pronunciation: 'mù',
          definition: ['fixture root'],
          siblingIds: ['4'],
        },
        ...['4', tableId, personId, deathId].map((id) => ({ ...raw[id], id })),
      ],
    })
  );
  await page.goto('?word=related-root');
  const dialog = page.getByRole('dialog');
  const related = dialog.getByRole('region', { name: 'Related words' });
  await expect(dialog.getByRole('region', { name: 'Components' })).toHaveCount(0);
  for (const [character, id] of [
    ['丌', tableId],
    ['匕', personId],
    ['亡', deathId],
  ]) {
    const link = related
      .locator('.word-entry-derivation')
      .getByRole('link', { name: character, exact: true });
    await expect(link).toHaveAttribute('href', new RegExp(`word=${id}`));
    await expect(link).toHaveCSS('display', 'inline');
  }
  expect(await dialog.locator('a a').count()).toBe(0);
  await related.getByRole('link', { name: '匕', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`word=${personId}`));
  await page.goBack();
  await expect(page).toHaveURL(/word=related-root/);
  await expect(related.getByRole('link', { name: '匕', exact: true })).toBeVisible();
});
