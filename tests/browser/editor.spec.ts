import { test, expect } from './fixtures';

for (const completion of ['pointer', 'keyboard', 'outstanding save'] as const) {
  test(`Done survives blur and delayed saving: ${completion}`, async ({ page, vocabulary }) => {
    vocabulary.delay = 350;
    await page.goto('/?word=female');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const field = page.getByRole('textbox', { name: 'Main word: Derivation', exact: true });
    await field.fill('changed');
    if (completion === 'pointer')
      await page.getByRole('button', { name: 'Done', exact: true }).click();
    else if (completion === 'keyboard') await field.press('Control+Enter');
    else {
      await field.press('Tab');
      await page.getByRole('button', { name: 'Done', exact: true }).click();
    }
    await expect(page.locator('#word-tree-title')).toHaveText('Word details');
    expect((await vocabulary.read()).female.derivation).toBe('changed');
    expect(vocabulary.writes).toBe(1);
  });
}

test('autocomplete separates languages, respects IME, Escape and normal Tab', async ({
  page,
  vocabulary,
}) => {
  await page.goto('/?newWord=1');
  await page.getByLabel('Main word: Spelling 1', { exact: true }).fill('好');
  await page.getByLabel('Component list').fill('學');
  await page.getByRole('button', { name: 'Add components', exact: true }).click();
  const reused = page.getByRole('article', { name: 'Child 1', exact: true });
  await expect(reused.getByLabel('Child 1: Pronunciation', { exact: true })).toHaveValue('xue2');
  await page.getByRole('button', { name: '+ Child', exact: true }).first().click();
  const entry = page.getByLabel('Child 2: Spelling 1', { exact: true });
  await entry.fill('学');
  await expect(page.getByRole('option').filter({ hasText: 'xue2' })).toBeVisible();
  await expect(page.getByRole('option').filter({ hasText: 'gaku' })).toHaveCount(0);
  await entry.dispatchEvent('compositionstart');
  await entry.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
  await expect(
    page
      .getByRole('article', { name: 'Child 2', exact: true })
      .getByLabel('Child 2: Pronunciation', { exact: true })
  ).toHaveValue('');
  await entry.dispatchEvent('compositionend');
  await entry.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await entry.fill('女');
  await entry.press('Enter');
  await expect(page.getByLabel('Child 2: Pronunciation', { exact: true })).toHaveValue('nü3');
  await expect(page.getByLabel('Child 3: Spelling 1', { exact: true })).toBeFocused();
  await page.getByLabel('Child 3: Spelling 1', { exact: true }).press('Tab');
  await expect(page.getByLabel('Child 3: Pronunciation', { exact: true })).toBeFocused();
  expect(vocabulary.writes).toBe(0);
});

test('nested drafts survive history, Close, reload and restore parent selection and scroll', async ({
  page,
  vocabulary,
}) => {
  await page.goto('/?newWord=1');
  await page.getByLabel('Main word: Spelling 1', { exact: true }).fill('学校');
  await page.getByLabel('Main word: Pronunciation', { exact: true }).fill('xue2xiao4');
  await page.getByLabel('Main word: Definition 1', { exact: true }).fill('school');
  await page.getByLabel('Component list').fill('教');
  await page.getByRole('button', { name: 'Add components', exact: true }).click();
  const parent = page.getByLabel('Main word: Derivation', { exact: true });
  await parent.fill('parent derivation\n'.repeat(24));
  await parent.focus();
  await parent.evaluate((e: HTMLTextAreaElement) => e.setSelectionRange(2, 7));
  const dialog = page.locator('.word-tree-content');
  await dialog.evaluate((e) => {
    (window as unknown as { savedShell: Element }).savedShell = e;
  });
  await page.getByRole('button', { name: 'Edit components', exact: true }).click();
  await expect(page.getByLabel('Main word: Spelling 1', { exact: true })).toHaveValue('教');
  const parentScroll = await page.evaluate(() => {
    const graph = JSON.parse(localStorage.getItem('mandarinko:editor:v1:new')!);
    return graph.views.find((v: [number, { scroll: number }]) => v[0] === graph.path[0])[1]
      .scroll as number;
  });
  expect(parentScroll).toBeGreaterThan(0);
  const nestedURL = page.url();
  await page.getByLabel('Main word: Pronunciation', { exact: true }).fill('jiao4');
  await page.goBack();
  await expect(parent).toHaveValue('parent derivation\n'.repeat(24));
  await expect(parent).toBeFocused();
  expect(
    Math.abs((await page.locator('.word-tree-body').evaluate((e) => e.scrollTop)) - parentScroll)
  ).toBeLessThanOrEqual(1);
  expect(
    await parent.evaluate((e: HTMLTextAreaElement) => [e.selectionStart, e.selectionEnd])
  ).toEqual([2, 7]);
  await page.goForward();
  await expect(page.getByLabel('Main word: Pronunciation', { exact: true })).toHaveValue('jiao4');
  expect(
    await dialog.evaluate((e) => (window as unknown as { savedShell: Element }).savedShell === e)
  ).toBe(true);
  await page.reload();
  await expect(page.getByLabel('Main word: Spelling 1', { exact: true })).toHaveValue('教');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  expect(vocabulary.writes).toBe(0);
  await page.goto(nestedURL);
  await expect(page.getByLabel('Main word: Pronunciation', { exact: true })).toHaveValue('jiao4');
  await page.getByRole('button', { name: 'Return to 学校', exact: true }).click();
  await expect(parent).toBeFocused();
  expect(vocabulary.writes).toBe(0);
});

test('missing local workspace is explicit recovery and never allocates a replacement', async ({
  page,
  vocabulary,
}) => {
  await page.goto('/?newWord=1&editor=00000000-0000-4000-8000-000000000099&node=1');
  await expect(page.getByRole('alert')).toContainText('unavailable');
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(vocabulary.writes).toBe(0);
});

test('preview stages authoritative corrections and shared roots until explicit batch confirmation', async ({
  page,
  vocabulary,
}) => {
  await page.goto('/?newWord=1');
  await page.getByText('Paste spreadsheet', { exact: true }).click();
  await page
    .getByLabel('Spreadsheet TSV')
    .fill(
      'spelling\tpronunciation\tdefinitions\tchildren\n妈妈\tma1ma\tmother\t女,子,又\n好\thao3\tgood\t女,子\n学校\txue2xiao4\tschool\t學,又\n女\tnü3\twoman; female\t'
    );
  await page.getByRole('button', { name: 'Preview paste', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Batch preview' })).toContainText('Definitions');
  expect(vocabulary.writes).toBe(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  expect(vocabulary.writes).toBe(0);
  await page.getByRole('button', { name: '+ Create New Word', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Batch preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Create batch', exact: true }).click();
  await expect(page.locator('#word-tree-title')).toHaveText('Word details');
  const saved = await vocabulary.read(),
    values = Object.values(saved);
  expect(values).toHaveLength(8);
  expect(values.find((w) => w.spelling[0].text === '妈妈')!.childrenIds).toEqual([
    'female',
    'child',
    'again',
  ]);
  expect(values.find((w) => w.spelling[0].text === '学校')!.childrenIds).toEqual([
    'study',
    'again',
  ]);
  expect(saved.study.childrenIds).toEqual(['child']);
  expect(saved.female.definition).toEqual(['woman; female']);
});

for (const failure of ['create', 'lost', 'links'] as const) {
  test(`publication resumes only on explicit Retry after ${failure}`, async ({
    page,
    vocabulary,
  }) => {
    await page.goto('/?newWord=1');
    await page.getByLabel('Main word: Spelling 1', { exact: true }).fill('好');
    await page.getByLabel('Main word: Pronunciation', { exact: true }).fill('hao3');
    await page.getByLabel('Main word: Definition 1', { exact: true }).fill('good');
    await page.getByLabel('Component list').fill('女,子');
    await page.getByRole('button', { name: 'Add components', exact: true }).click();
    vocabulary.fail = failure;
    await page.getByRole('button', { name: 'Create word', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Retry save', exact: true })).toBeVisible();
    const writes = vocabulary.writes;
    await page.reload();
    await expect(page.getByRole('button', { name: 'Retry save', exact: true })).toBeVisible();
    expect(vocabulary.writes).toBe(writes);
    await page.getByRole('button', { name: 'Retry save', exact: true }).click();
    await expect(page.locator('#word-tree-title')).toHaveText('Word details');
    const saved = Object.values(await vocabulary.read());
    expect(saved.filter((w) => w.spelling[0].text === '好')).toHaveLength(1);
    expect(saved.find((w) => w.spelling[0].text === '好')!.childrenIds).toEqual([
      'female',
      'child',
    ]);
  });
}

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`compact 妈妈、好、学校 entry sample: ${viewport.name}`, async ({
    page,
    vocabulary,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      const metrics = { clicks: 0, scrollEvents: 0, wheelOperations: 0 };
      (window as unknown as { entryMetrics: typeof metrics }).entryMetrics = metrics;
      document.addEventListener('click', () => metrics.clicks++, true);
      document.addEventListener('scroll', () => metrics.scrollEvents++, true);
      document.addEventListener('wheel', () => metrics.wheelOperations++, true);
    });
    await page.goto('/?newWord=1');
    const measurements = [];
    for (const [index, scenario] of [
      {
        spelling: '妈妈',
        pronunciation: 'ma1ma',
        definition: 'mother',
        components: '女,又',
        ids: ['female', 'again'],
      },
      {
        spelling: '好',
        pronunciation: 'hao3',
        definition: 'good',
        components: '女,子',
        ids: ['female', 'child'],
      },
      {
        spelling: '学校',
        pronunciation: 'xue2xiao4',
        definition: 'school',
        components: '學,又',
        ids: ['study', 'again'],
      },
    ].entries()) {
      const before = await page.evaluate(
        () => (window as unknown as { entryMetrics: Record<string, number> }).entryMetrics
      );
      await page.getByLabel('Main word: Spelling 1', { exact: true }).fill(scenario.spelling);
      await page
        .getByLabel('Main word: Pronunciation', { exact: true })
        .fill(scenario.pronunciation);
      await page.getByLabel('Main word: Definition 1', { exact: true }).fill(scenario.definition);
      await page.getByLabel('Component list').fill(scenario.components);
      await page.getByRole('button', { name: 'Add components', exact: true }).click();
      for (const number of [1, 2]) {
        await expect(
          page.getByLabel(`Child ${number}: Pronunciation`, { exact: true })
        ).not.toHaveValue('');
        await expect(
          page.getByLabel(`Child ${number}: Definition 1`, { exact: true })
        ).not.toHaveValue('');
      }
      expect(
        await page.locator('.word-tree-content').evaluate((e) => e.scrollWidth <= e.clientWidth)
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${scenario.spelling}-${viewport.name}.png`),
      });
      await page
        .getByRole('button', {
          name: index < 2 ? 'Create and add another' : 'Create word',
          exact: true,
        })
        .click();
      if (index < 2) {
        await expect(page.getByLabel('Main word: Spelling 1', { exact: true })).toHaveValue('');
        await expect(page.getByLabel('Main word: Spelling 1', { exact: true })).toBeFocused();
      } else await expect(page.locator('#word-tree-title')).toHaveText('Word details');
      const after = await page.evaluate(
        () => (window as unknown as { entryMetrics: Record<string, number> }).entryMetrics
      );
      measurements.push({
        word: scenario.spelling,
        clicks: after.clicks - before.clicks,
        scrollEvents: after.scrollEvents - before.scrollEvents,
        wheelOperations: after.wheelOperations - before.wheelOperations,
        fieldFills: 4,
        reusedFieldFills: 0,
      });
      const saved = Object.values(await vocabulary.read()).find(
        (w) => w.spelling[0].text === scenario.spelling
      )!;
      expect(saved.childrenIds).toEqual(scenario.ids);
    }
    await testInfo.attach('entry-interactions', {
      body: JSON.stringify({ viewport, measurements }, null, 2),
      contentType: 'application/json',
    });
  });
}

test('related saved-word workspace reopens from its editor URL and Done returns to details', async ({
  page,
  vocabulary,
}) => {
  await page.goto('/?word=study');
  await page.getByRole('button', { name: 'Edit', exact: true }).last().click();
  await expect(page.getByLabel('Main word: Spelling 1', { exact: true })).toHaveValue('子');
  await page.getByLabel('Main word: Pronunciation', { exact: true }).fill('updated');
  await page.reload();
  await expect(page.getByLabel('Main word: Spelling 1', { exact: true })).toHaveValue('子');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('#word-tree-title')).toHaveText('Word details');
  expect((await vocabulary.read()).child.pronunciation).toBe('updated');
  await expect(page).toHaveURL(/word=child/);
});

test('catalog cards and the cached search index reflect teacher edits', async ({
  page,
  vocabulary,
}) => {
  await page.goto('/');
  const search = page.getByRole('searchbox');
  await search.fill('old');
  await page.locator('.result-item').click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Main word: Derivation', { exact: true }).fill('updated catalog phrase');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('#word-tree-title')).toHaveText('Word details');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('.result-item')).toHaveCount(0);
  await expect(page.locator('.word-item').filter({ hasText: 'nü3' })).toContainText(
    'updated catalog phrase'
  );
  await search.fill('updated catalog phrase');
  await expect(page.locator('.result-item')).toHaveCount(1);
  await expect(page.locator('.result-item')).toContainText('nü3');
  expect((await vocabulary.read()).female.derivation).toBe('updated catalog phrase');
});
