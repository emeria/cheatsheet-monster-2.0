// Opens each game's tools page (/<game>/tools) and each tree's read-only embed, and checks the
// tree really draws. Run this after
// npm run sync:tree-kit: the Vitest suite covers the kit's maths, not what reaches the canvas.
const { test, expect } = require('@playwright/test');

const trees = [
  { game: 'wow', section: 'warrior-talents' },
  { game: 'poe', section: 'passive-tree' },
  { game: 'poe2', section: 'passive-tree' },
];

// More than a stray glyph, far fewer than any real tree.
const MIN_PAINTED_PIXELS = 500;

// Counts pixels with any ink. The kit clears the canvas rather than filling it, so a canvas that
// drew nothing has none.
const paintedPixels = (canvas) =>
  canvas.evaluate((c) => {
    if (!c.width || !c.height) return 0;
    const { data } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    let n = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]) n += 1;
    return n;
  });

for (const { game, section } of trees) {
  test(`${game}: ${section} draws`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(`${game}/tools`);
    const details = page.locator(`details#${section}`);
    if (!(await details.evaluate((d) => d.open))) await details.locator('summary').click();
    await expect(details).toHaveJSProperty('open', true);

    const canvas = details.locator('canvas.tree-canvas');
    await expect(canvas).toBeVisible();
    await expect(details.getByRole('alert')).toHaveCount(0);
    await expect.poll(() => paintedPixels(canvas), { timeout: 15_000 }).toBeGreaterThan(MIN_PAINTED_PIXELS);
    expect(errors).toEqual([]);
  });

  test(`${game}: ${section} embed draws read-only`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(`${game}/embed/${section}`);
    const canvas = page.locator('.talent-tree.read-only canvas.tree-canvas');
    await expect(canvas).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset' })).toHaveCount(0);
    await expect.poll(() => paintedPixels(canvas), { timeout: 15_000 }).toBeGreaterThan(MIN_PAINTED_PIXELS);
    expect(errors).toEqual([]);
  });
}
