import { test, expect } from './fixtures';
import { readFile } from 'node:fs/promises';

test('Grid and Graph form one exclusive choice with arrow-key navigation', async ({ page }) => {
  await page.goto('/grammar');
  const choices = page.getByRole('radiogroup', { name: 'Grammar view' });
  const grid = choices.getByRole('radio', { name: 'Grid', exact: true });
  const graph = choices.getByRole('radio', { name: 'Graph', exact: true });
  await expect(grid).toBeChecked();
  await expect(choices.getByRole('radio', { checked: true })).toHaveCount(1);
  await grid.focus();
  await page.keyboard.press('ArrowRight');
  await expect(graph).toBeChecked();
  await expect(grid).not.toBeChecked();
  await expect(graph).toBeFocused();
  await expect(page.locator('.grammar-map-canvas')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(graph).toBeChecked();
  await expect(choices.getByRole('radio', { checked: true })).toHaveCount(1);
  await page.keyboard.press('ArrowLeft');
  await expect(grid).toBeChecked();
  await expect(graph).not.toBeChecked();
  await expect(grid).toBeFocused();
  await expect(page.locator('.grammar-map-canvas')).toBeHidden();
});

test('mouse wheel zooms the graph without modifiers and keeps the page still', async ({ page }) => {
  await page.goto('/grammar?view=graph');
  const canvas = page.locator('.grammar-map-canvas');
  await expect(canvas).toBeVisible();
  const zoom = () =>
    canvas
      .locator(':scope > g')
      .evaluate((node) => Number(node.getAttribute('transform')!.match(/scale\(([^)]+)\)/)![1]));
  await canvas.hover();
  const scroll = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, -120);
  await expect.poll(zoom).toBeGreaterThan(1);
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  await page.mouse.wheel(0, 120);
  await expect.poll(zoom).toBeCloseTo(1);
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  await canvas.dispatchEvent('wheel', { deltaX: 120, deltaY: 0 });
  expect(await zoom()).toBeCloseTo(1);
});

test('graph toggle, node details, keyboard focus, history and viewport survive navigation', async ({
  page,
}) => {
  await page.goto('/grammar');
  await expect(page.getByRole('radio', { name: 'Grid', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: 'Graph', exact: true }).click();
  await expect(page).toHaveURL(/view=graph/);
  const canvas = page.locator('.grammar-map-canvas');
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds!.x + 8, bounds!.y + 8);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + 68, bounds!.y + 38);
  await page.mouse.up();
  expect(await canvas.locator(':scope > g').getAttribute('transform')).not.toContain(
    'translate(0 0)'
  );
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const transform = await canvas.locator(':scope > g').getAttribute('transform');
  const node = canvas.locator('[data-pattern-id="de"]');
  await node.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/view=graph.*pattern=de/);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(node).toBeFocused();
  expect(await canvas.locator(':scope > g').getAttribute('transform')).toBe(transform);
  await page.getByRole('radio', { name: 'Grid', exact: true }).click();
  await expect(canvas).toBeHidden();
  await page.goBack();
  await expect(canvas).toBeVisible();
  expect(await canvas.locator(':scope > g').getAttribute('transform')).toBe(transform);
  await page.reload();
  await expect(canvas).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Graph', exact: true })).toBeChecked();
});
test('evidence, search, relation filters and accessible list share the real graph', async ({
  page,
}) => {
  await page.goto('/grammar?view=graph');
  const canvas = page.locator('.grammar-map-canvas');
  await expect(canvas).toBeVisible();
  const before = await canvas.locator('[data-pattern-id="de"] circle').getAttribute('cx');
  await page.getByRole('searchbox').fill('destination');
  await expect(canvas.locator('[data-pattern-id="ni"]')).toHaveClass(/match/);
  await expect(canvas.locator('[data-pattern-id="de"]')).toHaveClass(/muted/);
  expect(await canvas.locator('[data-pattern-id="de"] circle').getAttribute('cx')).toBe(before);
  await page.getByRole('searchbox').clear();
  const connection = canvas.getByRole('button', { name: /Inspect connections/ });
  await connection.focus();
  await page.keyboard.press('Enter');
  const evidence = page.getByRole('complementary', { name: 'Connection evidence' });
  await expect(evidence).toContainText('Editorial comparison.');
  await expect(evidence.getByRole('link', { name: 'Editorial', exact: true })).toHaveAttribute(
    'href',
    'https://example.com'
  );
  await page.getByLabel('Show all connections').check();
  await expect(page.getByLabel('Show all connections')).toBeChecked();
  await page.getByLabel('Explicitly compared', { exact: true }).uncheck();
  await expect(canvas.locator('.grammar-map-edge')).toHaveCount(0);
  await page.getByLabel('Introduced earlier', { exact: true }).check();
  expect(await canvas.locator('[data-pattern-id="de"] circle').getAttribute('cx')).toBe(before);
  await page.getByLabel('Explicitly compared', { exact: true }).check();
  await page.getByText('Browse patterns and connections as a list', { exact: true }).click();
  await expect(page.locator('.grammar-map-accessible')).toContainText('Destination');
});
test('reference failures leave grid usable and require explicit map retry', async ({ page }) => {
  let failed = true;
  await page.route('http://localhost:3000/api/grammar-map', async (route) => {
    if (failed) await route.fulfill({ status: 500, json: { error: 'Unavailable' } });
    else await route.fallback();
  });
  await page.goto('/grammar?view=graph');
  await expect(page.getByRole('alert')).toContainText('Failed to load grammar reference data');
  await page.getByRole('radio', { name: 'Grid', exact: true }).click();
  await expect(page.locator('.word-item')).toHaveCount(2);
  failed = false;
  await page.getByRole('radio', { name: 'Graph', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reload map', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reload map', exact: true }).click();
  await expect(page.locator('.grammar-map-canvas')).toBeVisible();
});
test('comparison edits persist outside grammar content and retain modal behavior', async ({
  page,
  vocabulary,
}) => {
  await page.goto('/grammar?pattern=de');
  await expect(page.getByRole('region', { name: 'Compare patterns' })).toContainText('Destination');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByText('Contrast patterns (1)', { exact: true }).click();
  await page.getByLabel('Destination', { exact: true }).uncheck();
  await expect(page.locator('.editor-toolbar [role="status"]')).toHaveText('Saved');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Compare patterns' })).toHaveCount(0);
  expect((await vocabulary.readGrammar())[0]).not.toHaveProperty('contrastIds');
});
test('actual catalog graph is finite and responsive on desktop and mobile', async ({
  page,
}, info) => {
  const base = new URL('../../packages/server/', import.meta.url);
  const grammar = JSON.parse(await readFile(new URL('grammar.json', base), 'utf8'));
  const data: Record<string, unknown> = { schemaVersion: 1 };
  for (const [file, key] of [
    ['sources', 'sources'],
    ['units', 'units'],
    ['source-items', 'items'],
    ['relationships', 'relationships'],
  ])
    data[key] = JSON.parse(await readFile(new URL(`grammar.${file}.json`, base), 'utf8'))[key];
  await page.route('http://localhost:3000/api/grammar', (route) =>
    route.fulfill({ json: grammar.patterns })
  );
  await page.route('http://localhost:3000/api/grammar-map', (route) =>
    route.fulfill({ json: data })
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/grammar?view=graph');
  const canvas = page.locator('.grammar-map-canvas');
  await expect(canvas.locator('.grammar-map-node')).toHaveCount(grammar.patterns.length);
  await expect(page.getByText(/Branch overview|Size shows connectivity/)).toHaveCount(0);
  expect((await canvas.boundingBox())!.width).toBeGreaterThan(1540);
  const listSummary = page.locator('.grammar-map-accessible > summary');
  const expectListAtBottom = async (height: number) => {
    const bounds = (await listSummary.boundingBox())!;
    expect(bounds.y + bounds.height).toBeGreaterThan(height - 32);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
  };
  await expectListAtBottom(1000);
  await page.setViewportSize({ width: 1600, height: 1300 });
  await expectListAtBottom(1300);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.evaluate(() => document.fonts.ready);
  expect(
    await canvas
      .locator('circle')
      .evaluateAll((nodes) =>
        nodes.every(
          (n) =>
            Number.isFinite(Number(n.getAttribute('cx'))) &&
            Number.isFinite(Number(n.getAttribute('cy')))
        )
      )
  ).toBe(true);
  await page.screenshot({ path: info.outputPath('grammar-map-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Fit all patterns', exact: true }).click();
  await page.screenshot({
    path: info.outputPath('grammar-map-all-patterns-desktop.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Fit map', exact: true }).click();
  await canvas.locator('.grammar-map-edge').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('complementary', { name: 'Connection evidence' })).toBeVisible();
  await page.screenshot({
    path: info.outputPath('grammar-map-evidence-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Close evidence', exact: true }).click();
  await expectListAtBottom(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await expect
    .poll(async () =>
      canvas
        .locator('text')
        .evaluateAll((nodes) =>
          Math.min(
            ...nodes.map(
              (node) =>
                parseFloat(getComputedStyle(node).fontSize) *
                ((node as SVGTextElement).getScreenCTM()?.a ?? 1)
            )
          )
        )
    )
    .toBeGreaterThanOrEqual(15.9);
  await page.screenshot({ path: info.outputPath('grammar-map-mobile.png'), fullPage: true });
  await canvas.locator('.grammar-map-edge').first().focus();
  await page.keyboard.press('Enter');
  const mobileEvidence = page.getByRole('complementary', { name: 'Connection evidence' });
  await expect(mobileEvidence).toBeVisible();
  await mobileEvidence.getByRole('link').first().scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath('grammar-map-evidence-mobile.png'),
    fullPage: true,
  });
});

test('new-pattern comparison failure retries the same creation without duplicating catalog entries', async ({
  page,
  vocabulary,
}) => {
  await page.goto('/grammar?newPattern=1');
  await page.getByLabel('Spelling 1', { exact: true }).fill('〜だけ');
  await page.getByLabel('Definition 1', { exact: true }).fill('Only');
  await page.getByLabel('Title', { exact: true }).fill('Only this');
  await page.getByText('Contrast patterns (0)', { exact: true }).click();
  await page.getByLabel('Destination', { exact: true }).check();
  vocabulary.fail = 'comparisons';
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry save', exact: true })).toBeVisible();
  const created = (await vocabulary.readGrammar()).filter((p) => p.title === 'Only this');
  expect(created).toHaveLength(1);
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  expect(
    (await vocabulary.readGrammar()).filter((p) => p.title === 'Only this').map((p) => p.id)
  ).toEqual([created[0].id]);
  await expect(page.getByRole('region', { name: 'Compare patterns' })).toContainText('Destination');
});
