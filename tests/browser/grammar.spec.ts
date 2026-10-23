import { test, expect, grammarPatterns } from './fixtures';
import { readFile } from 'node:fs/promises';
import type { GrammarData } from '@mandarinko/core';

test('grammar details use readable sections and available width on desktop and mobile', async ({
  page,
}, testInfo) => {
  await page.goto('/grammar?pattern=de');
  const dialog = page.getByRole('dialog');
  const content = dialog.locator('.word-tree-content');
  const meaning = dialog.getByRole('region', { name: 'Meaning & usage' });
  const examples = dialog.getByRole('region', { name: 'Examples' });
  await expect(meaning).toContainText('Marks the location of an action');
  await expect(examples).toContainText('図書館で読みます。');
  await expect(examples).toContainText('I read at the library.');
  await expect(dialog.getByRole('region', { name: 'Compare patterns' })).toContainText(
    'Destination'
  );
  expect((await content.boundingBox())!.width).toBeGreaterThanOrEqual(760);
  expect(
    await meaning
      .locator('p')
      .first()
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
  ).toBeGreaterThanOrEqual(18);
  expect(
    await examples
      .locator('.grammar-translation')
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
  ).toBeGreaterThanOrEqual(18);
  await page.screenshot({ path: testInfo.outputPath('grammar-details-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await content.boundingBox())!.width).toBeLessThanOrEqual(390);
  expect(await content.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true
  );
  await expect(dialog.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('grammar-details-mobile.png') });
  await page.getByRole('link', { name: 'Destination', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Meaning & usage' })).toContainText(
    'Marks a destination'
  );
  await expect(dialog.getByRole('region', { name: 'Examples' })).toHaveCount(0);
});

test('long grammar details scroll while the close control stays reachable', async ({
  page,
}, testInfo) => {
  const pattern = {
    ...grammarPatterns[0],
    examples: Array.from({ length: 8 }, () => grammarPatterns[0].examples[0]),
  };
  await page.route('http://localhost:3000/api/grammar', (route) =>
    route.fulfill({ json: [pattern] })
  );
  for (const [layout, width, height] of [
    ['desktop', 1280, 720],
    ['mobile', 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/grammar?pattern=de');
    const dialog = page.getByRole('dialog');
    const body = dialog.locator('.word-tree-body');
    await expect(page.locator('.word-list .grammar-card-quote')).toHaveCount(1);
    await expect(dialog.locator('.grammar-example')).toHaveCount(8);
    expect(await body.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
      true
    );
    await dialog.locator('.grammar-example').last().scrollIntoViewIfNeeded();
    await expect(dialog.locator('.grammar-example').last()).toBeInViewport();
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeInViewport();
    expect(
      await dialog
        .locator('.word-tree-content')
        .evaluate((element) => element.scrollWidth <= element.clientWidth)
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`grammar-details-long-${layout}.png`) });
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
});

test('two pages share compact entries and search every grammar field', async ({
  page,
  vocabulary,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Grammar', exact: true }).click();
  await expect(page).toHaveURL(/\/grammar$/);
  await expect(page.getByRole('heading', { name: 'All Grammar Patterns (2)' })).toBeVisible();
  const card = page.locator('.word-item').filter({ hasText: 'Location of action' });
  await expect(card.locator('.grammar-card-quote')).toContainText('図書館で読みます。');
  await expect(card.locator('.grammar-card-quote')).toContainText('I read at the library.');
  await expect(card).not.toContainText('Particles');
  await expect(card).not.toContainText('JLPT 5');
  await expect(page.locator('.word-list .word-entry-level')).toHaveCount(0);
  await expect(
    page.locator('.word-item').filter({ hasText: 'Destination' }).locator('.grammar-card-quote')
  ).toHaveCount(0);
  const search = page.getByRole('searchbox');
  for (const query of ['library', '図書館', 'Location', 'Particles', 'JLPT 5', 'de']) {
    await search.fill(query);
    await expect(page.locator('.search-results .result-item').first()).toContainText('で');
    await expect(
      page.locator('.search-results .result-item').first().locator('.grammar-card-quote')
    ).toContainText('I read at the library.');
    await expect(page.locator('.search-results .word-entry-level')).toHaveCount(0);
  }
  await search.fill('no-match');
  await expect(page.getByText('No results', { exact: true })).toBeVisible();
  await search.fill('');
  await page.screenshot({ path: testInfo.outputPath('grammar-desktop.png'), fullPage: true });
  await page.locator('.word-item').filter({ hasText: 'Location of action' }).click();
  await expect(page.getByRole('dialog')).toContainText('I read at the library.');
  await expect(page.getByRole('dialog')).toContainText('図書館で読みます。');
  await expect(page.getByRole('dialog')).toContainText('Particles');
  await expect(page.getByRole('dialog')).toContainText('JLPT 5');
  await page.getByRole('link', { name: 'Destination', exact: true }).click();
  await expect(page).toHaveURL(/pattern=ni/);
  await page.goBack();
  await expect(page.getByRole('dialog')).toContainText('Location of action');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('.word-item').filter({ hasText: 'Location of action' })).toBeFocused();
  expect(await vocabulary.readGrammar()).toEqual(grammarPatterns);
  await page.getByRole('link', { name: 'Dictionary', exact: true }).click();
  await page.getByRole('searchbox').fill('old');
  await expect(page.locator('.search-results')).toContainText('女');
});

test('new grammar remains a local draft until Create and persists all fields', async ({
  page,
  vocabulary,
}) => {
  await page.goto('/grammar');
  await page.getByRole('button', { name: '+ Create New Grammar Pattern' }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('title');
  await page.getByLabel('Spelling 1', { exact: true }).fill('〜たい');
  await page.getByLabel('Definition 1', { exact: true }).fill('Want to do something');
  await page.getByLabel('Title', { exact: true }).fill('Desire');
  await page.getByLabel('Category', { exact: true }).fill('Verb forms');
  await page.getByLabel('JLPT level').fill('5');
  await page.getByRole('button', { name: '+ Example', exact: true }).click();
  await page.getByLabel('Example 1 Spelling 1', { exact: true }).fill('日本に行きたいです。');
  await page.getByLabel('Example 1 Definition 1', { exact: true }).fill('I want to go to Japan.');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  expect(await vocabulary.readGrammar()).toHaveLength(2);
  await page.reload();
  await page.getByRole('button', { name: '+ Create New Grammar Pattern' }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Desire');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('I want to go to Japan.');
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  const saved = (await vocabulary.readGrammar()).find((pattern) => pattern.title === 'Desire')!;
  expect(saved).toMatchObject({
    spelling: [{ language: 'ja', text: '〜たい' }],
    definition: ['Want to do something'],
    category: 'Verb forms',
    metadata: { jlptLevel: 5 },
    examples: [
      {
        spelling: [{ language: 'ja', text: '日本に行きたいです。' }],
        definition: ['I want to go to Japan.'],
      },
    ],
  });
  await page.reload();
  await expect(page.getByRole('dialog')).toContainText('Desire');
  expect((await vocabulary.read())['female'].definition).toEqual(['woman']);
});

test('existing grammar autosaves and Done completes a delayed blur save with one click', async ({
  page,
  vocabulary,
}) => {
  await page.goto('/grammar?pattern=de');
  const dialog = page.getByRole('dialog');
  const shell = await dialog.evaluate((element) => {
    element.setAttribute('data-retained-shell', 'true');
    return true;
  });
  expect(shell).toBe(true);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(dialog).toHaveAttribute('data-retained-shell', 'true');
  vocabulary.delay = 350;
  await page.getByLabel('Title', { exact: true }).fill('Location, revised');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  await expect(dialog).toHaveAttribute('data-retained-shell', 'true');
  expect((await vocabulary.readGrammar())[0]).toEqual({
    ...grammarPatterns[0],
    title: 'Location, revised',
  });
});

test('lost grammar creation resumes only through explicit retry, using the original identity', async ({
  page,
  vocabulary,
}) => {
  await page.goto('/grammar?newPattern=1');
  await page.getByLabel('Spelling 1', { exact: true }).fill('から');
  await page.getByLabel('Definition 1', { exact: true }).fill('Because');
  await page.getByLabel('Title', { exact: true }).fill('Reason');
  vocabulary.fail = 'lost';
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible();
  expect(await vocabulary.readGrammar()).toHaveLength(3);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible();
  expect(vocabulary.writes).toBe(1);
  await page.getByRole('button', { name: 'Retry save' }).click();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  expect(await vocabulary.readGrammar()).toHaveLength(3);
});

test('mobile grammar cards and editor fit and retain keyboard focus', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/grammar?pattern=de');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Spelling 1', { exact: true })).toBeFocused();
  const text = 'A longer explanation of the grammar pattern. '.repeat(12);
  await page.getByLabel('Definition 1', { exact: true }).fill(text);
  await expect(page.getByLabel('Definition 1', { exact: true })).toHaveValue(text);
  expect(
    await page
      .locator('.word-tree-content')
      .evaluate((element) => element.scrollWidth <= element.clientWidth)
  ).toBe(true);
  expect(
    await page
      .getByLabel('Definition 1', { exact: true })
      .evaluate((element) => element.scrollHeight <= element.clientHeight + 2)
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('grammar-mobile-editor.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('invalid grammar links and API failures stay explicit', async ({ page }) => {
  for (const query of [
    '?pattern=missing',
    '?pattern=',
    '?pattern=de&newPattern=1',
    '?newPattern=no',
  ]) {
    await page.goto(`/grammar${query}`);
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
    await expect(page.locator('.grammar-editor')).toHaveCount(0);
  }
  await page.route('http://localhost:3000/api/grammar', (route) =>
    route.fulfill({ status: 500, json: { error: 'Unavailable' } })
  );
  await page.goto('/grammar');
  await expect(page.getByRole('alert')).toContainText('Failed to fetch grammar patterns');
  await page.getByRole('button', { name: '+ Create New Grammar Pattern' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('shipped grammar samples retain a compact desktop and mobile presentation', async ({
  page,
}, testInfo) => {
  const data: GrammarData = JSON.parse(
    await readFile(new URL('../../packages/server/grammar.json', import.meta.url), 'utf8')
  );
  await page.route('http://localhost:3000/api/grammar', (route) =>
    route.fulfill({ json: data.patterns })
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/grammar');
  await expect(page.locator('.word-item')).toHaveCount(data.patterns.length);
  const firstCard = page.locator('.word-item').first();
  expect((await firstCard.boundingBox())!.width).toBeGreaterThanOrEqual(520);
  await expect(firstCard.locator('.word-entry-spellings')).toHaveCount(0);
  await expect(firstCard.locator('.grammar-title')).toHaveText(data.patterns[0].title);
  await expect(firstCard.locator('.grammar-title')).toHaveCSS('font-weight', '700');
  await expect(firstCard.locator('.grammar-title')).toHaveCSS('font-size', '22px');
  await expect(firstCard.locator('.grammar-card-quote [lang="ja"]')).toHaveCSS('font-size', '22px');
  const exampleContrast = await firstCard.locator('.grammar-card-quote').evaluate((element) => {
    const luminance = (color: string) => {
      const channels = color
        .match(/\d+/g)!
        .slice(0, 3)
        .map((channel) => {
          const value = Number(channel) / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const text = luminance(getComputedStyle(element).color);
    const background = luminance(getComputedStyle(document.body).backgroundColor);
    return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
  });
  expect(exampleContrast).toBeGreaterThanOrEqual(8);
  await page.screenshot({ path: testInfo.outputPath('shipped-grammar-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await expect(firstCard.locator('.grammar-card-quote [lang="ja"]')).toHaveCSS('font-size', '22px');
  await page.screenshot({ path: testInfo.outputPath('shipped-grammar-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('.word-item').first().click();
  await expect(page.getByRole('dialog').locator('.word-entry-spellings')).toHaveText(
    data.patterns[0].spelling[0].text
  );
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('shipped-grammar-desktop-editor.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('shipped-grammar-mobile-editor.png') });
  expect(
    await page
      .locator('.word-tree-content')
      .evaluate((element) => element.scrollWidth <= element.clientWidth)
  ).toBe(true);
  await page.getByLabel('Title', { exact: true }).press('Control+Enter');
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();

  for (const [id, spelling] of [
    ['ni-naru-become', '〜になる'],
    ['meireikei-imperative', '命令形'],
    ['nara-topic-conditional', '〜なら'],
  ]) {
    await page.goto(`/grammar?pattern=${id}`);
    await expect(page.getByRole('dialog').locator('.word-entry-spellings')).toHaveText(spelling);
    for (const [layout, width, height] of [
      ['desktop', 1280, 720],
      ['mobile', 390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.screenshot({ path: testInfo.outputPath(`corrected-${id}-${layout}.png`) });
    }
  }
});

test('Japanese grammar examples and titles render with Furifont while English keeps the body font', async ({
  page,
}, testInfo) => {
  const data: GrammarData = JSON.parse(
    await readFile(new URL('../../packages/server/grammar.json', import.meta.url), 'utf8')
  );
  await page.route('http://localhost:3000/api/grammar', (route) =>
    route.fulfill({ json: data.patterns })
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  for (const [id, sentence] of [
    ['kinshikei-prohibitive', 'ここでたばこを吸うな。'],
    ['nakunarimashita-no-longer', '目が悪くなって、小さい字が読めなくなりました。'],
  ]) {
    await page.goto(`/grammar?pattern=${id}`);
    const example = page.getByRole('dialog').locator('.grammar-example [lang="ja"]');
    await expect(example).toHaveText(sentence);
    await expect(example).toHaveCSS('font-size', '22px');
    await expect(example).toHaveCSS('font-family', /Furifont Serif/);
    await expect(example).toHaveCSS('font-variant-ligatures', 'common-ligatures contextual');
    await page.evaluate(() => document.fonts.ready);
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: '.grammar-example [lang="ja"]',
    });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    expect(
      fonts.some(
        (font) => font.isCustomFont && font.familyName.includes('Furifont') && font.glyphCount > 0
      )
    ).toBe(true);
    await expect(page.getByRole('dialog').locator('.grammar-translation')).not.toHaveCSS(
      'font-family',
      /Furifont/
    );
    for (const [layout, width, height] of [
      ['desktop', 1280, 720],
      ['mobile', 390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.screenshot({ path: testInfo.outputPath(`furifont-${id}-${layout}.png`) });
    }
  }
  await page.goto('/grammar?pattern=you-ni-iu-indirect-instruction');
  const title = page.getByRole('dialog').locator('h2');
  await expect(title).toHaveText('〜ように言う / 注意する (to tell/instruct someone to ~)');
  await expect(title.locator('[lang="ja"]')).toHaveText(['ように言う', '注意する']);
  const cardTitle = page.locator('.grammar-title').filter({ hasText: 'to tell/instruct someone' });
  await expect(cardTitle.locator('[lang="ja"]')).toHaveText(['ように言う', '注意する']);
  for (const container of [title, cardTitle]) {
    await expect(container.locator('[lang="ja"]').first()).toHaveCSS(
      'font-family',
      /Furifont Serif/
    );
    await expect(
      container.locator('span').filter({ hasText: '(to tell/instruct someone' })
    ).not.toHaveCSS('font-family', /Furifont/);
  }
  await page.evaluate(() => document.fonts.ready);
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: '.grammar-details h2 [lang="ja"]',
  });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  expect(
    fonts.some(
      (font) => font.isCustomFont && font.familyName.includes('Furifont') && font.glyphCount > 0
    )
  ).toBe(true);
  for (const [layout, width, height] of [
    ['desktop', 1280, 720],
    ['mobile', 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: testInfo.outputPath(`furifont-title-${layout}.png`) });
  }
});
