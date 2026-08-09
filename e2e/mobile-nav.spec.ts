import { test, expect, devices } from '@playwright/test';

// Comportement UX du tiroir de navigation latérale sur téléphone.
test.use({ ...devices['Pixel 5'] });

test.beforeEach(async ({ page }) => {
  await page.goto('/theorie/resume');
});

test('le tiroir mobile s’ouvre et se ferme via le bouton hamburger', async ({ page }) => {
  const drawer = page.locator('#sidebar-left');
  const toggle = page.locator('#mobile-menu-toggle');
  const overlay = page.locator('#sidebar-overlay');

  await expect(drawer).not.toHaveClass(/is-open/);
  await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.click();
  await expect(drawer).toHaveClass(/is-open/);
  await expect(drawer).toHaveAttribute('aria-hidden', 'false');
  await expect(overlay).toHaveClass(/is-open/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await overlay.click();
  await expect(drawer).not.toHaveClass(/is-open/);
  await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('la liste de navigation reste réellement défilable en hauteur', async ({ page }) => {
  await page.locator('#mobile-menu-toggle').click();

  for (const summary of await page.locator('#sidebar-left details > summary').all()) {
    const closed = await summary.evaluate(
      (element) => !(element.parentElement as HTMLDetailsElement).open,
    );
    if (closed) await summary.click();
  }

  const scrollArea = page.locator('[data-sidebar-scroll]');
  await expect(scrollArea).toHaveCSS('overflow-y', 'scroll');
  const dimensions = await scrollArea.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);

  await scrollArea.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => scrollArea.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test('le tiroir est au-dessus de son voile sans recouvrir la navbar', async ({ page }) => {
  await page.locator('#mobile-menu-toggle').click();
  const drawer = page.locator('#sidebar-left');
  const overlay = page.locator('#sidebar-overlay');

  const [drawerStyle, overlayStyle, drawerBox, navBox] = await Promise.all([
    drawer.evaluate((element) => getComputedStyle(element).zIndex),
    overlay.evaluate((element) => getComputedStyle(element).zIndex),
    drawer.boundingBox(),
    page.locator('.navbar').boundingBox(),
  ]);

  expect(Number(drawerStyle)).toBeGreaterThan(Number(overlayStyle));
  expect(drawerBox?.y).toBe(navBox?.height);
});

test('le document est verrouillé puis libéré à la fermeture', async ({ page }) => {
  await page.locator('#mobile-menu-toggle').click();
  await expect(page.locator('html')).toHaveClass(/nav-drawer-open/);
  await expect(page.locator('#main-content')).toHaveAttribute('inert', '');

  await page.locator('#sidebar-overlay').click();
  await expect(page.locator('html')).not.toHaveClass(/nav-drawer-open/);
  await expect(page.locator('#main-content')).not.toHaveAttribute('inert');
});

test('Échap ferme le tiroir et rend le focus au bouton', async ({ page }) => {
  const toggle = page.locator('#mobile-menu-toggle');
  await toggle.click();
  await expect(page.locator('#sidebar-left')).toHaveClass(/is-open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#sidebar-left')).not.toHaveClass(/is-open/);
  await expect(toggle).toBeFocused();
});

test('les indicateurs fixes sont masqués pendant que le tiroir est ouvert', async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.locator('#mobile-menu-toggle').click();
  await expect(page.locator('#back-to-top')).toBeHidden();
  await expect(page.locator('#reading-progress')).toHaveCSS('opacity', '0');
});
