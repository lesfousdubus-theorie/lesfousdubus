import { test, expect, devices } from '@playwright/test';

// Comportement UX du tiroir de navigation latérale sur téléphone.
test.use({ ...devices['Pixel 5'] });

test.beforeEach(async ({ page }) => {
  await page.goto('/theorie/resume');
});

test('le tiroir mobile souvre et se ferme via le bouton hamburger', async ({ page }) => {
  const drawer = page.locator('#sidebar-left-container');
  const toggle = page.locator('#mobile-menu-toggle');
  const overlay = page.locator('#sidebar-mobile-overlay');

  await expect(drawer).not.toHaveClass(/is-mobile-open/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.click();
  await expect(drawer).toHaveClass(/is-mobile-open/);
  await expect(overlay).toHaveClass(/is-open/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await overlay.click();
  await expect(drawer).not.toHaveClass(/is-mobile-open/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('la barre de navigation reste au-dessus du tiroir (z-index)', async ({ page }) => {
  await page.locator('#mobile-menu-toggle').click();
  await expect(page.locator('#sidebar-left-container')).toHaveClass(/is-mobile-open/);

  const zNav = await page
    .locator('.navbar')
    .evaluate((el) => Number.parseInt(getComputedStyle(el).zIndex, 10));
  const zDrawer = await page
    .locator('#sidebar-left-container')
    .evaluate((el) => Number.parseInt(getComputedStyle(el).zIndex, 10));
  expect(zNav).toBeGreaterThan(zDrawer);
});

test('le verrouillage de défilement est actif et désactivé à la fermeture', async ({ page }) => {
  await page.locator('#mobile-menu-toggle').click();
  await expect(page.locator('body')).toHaveClass(/mobile-nav-open/);
  await expect(page.locator('#main-content')).toHaveAttribute('inert', '');

  await page.locator('#sidebar-mobile-overlay').click();
  await expect(page.locator('body')).not.toHaveClass(/mobile-nav-open/);
  await expect(page.locator('#main-content')).not.toHaveAttribute('inert');
});

test('Échap ferme le tiroir', async ({ page }) => {
  await page.locator('#mobile-menu-toggle').click();
  await expect(page.locator('#sidebar-left-container')).toHaveClass(/is-mobile-open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#sidebar-left-container')).not.toHaveClass(/is-mobile-open/);
});

test('le bouton retour en haut est masqué pendant que le tiroir est ouvert', async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.locator('#mobile-menu-toggle').click();
  await expect(page.locator('#back-to-top')).toBeHidden();
  await page.locator('#sidebar-mobile-overlay').click();
});
