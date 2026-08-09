import { expect, test, devices } from '@playwright/test';

test.describe('Frise chronologique interactive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/theorie/chronologie/');
  });

  test('défile horizontalement, filtre les fils et ouvre un détail accessible', async ({
    page,
  }) => {
    const viewport = page.locator('[data-timeline-viewport]');
    const initialLeft = await viewport.evaluate((element) => element.scrollLeft);

    await page.getByRole('button', { name: 'Événement suivant' }).click();
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(initialLeft);

    await page.getByLabel('Filtrer par fil narratif').selectOption('armes');
    const visibleCards = page.locator('[data-event]:not([hidden])');
    await expect(visibleCards.first()).toHaveAttribute('data-thread', 'armes');

    await visibleCards.first().getByRole('button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-labelledby', /event-detail-title-/);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('Frise chronologique sur téléphone', () => {
  test.use({
    viewport: devices['Pixel 5'].viewport,
    userAgent: devices['Pixel 5'].userAgent,
    deviceScaleFactor: devices['Pixel 5'].deviceScaleFactor,
    isMobile: devices['Pixel 5'].isMobile,
    hasTouch: devices['Pixel 5'].hasTouch,
  });

  test('conserve le geste horizontal sans élargir la page', async ({ page }) => {
    await page.goto('/theorie/chronologie/');
    const viewport = page.locator('[data-timeline-viewport]');

    const dimensions = await viewport.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth * 5);

    const bodyWidth = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(bodyWidth.scrollWidth).toBe(bodyWidth.clientWidth);

    await page.getByRole('button', { name: 'Événement suivant' }).tap();
    await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  });
});
