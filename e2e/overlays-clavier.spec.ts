import { test, expect } from '@playwright/test';

// Non-régressions clavier / overlays issues de l'audit UI-UX-A11Y du 09/08/2026 :
// Échap ferme tout, Ctrl/⌘K ouvre la recherche avec focus, les drawers piègent le focus.

test.describe('Modale de recherche', () => {
  test('Ctrl+K ouvre la recherche avec le focus dans le champ', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    const input = page.getByRole('combobox', { name: 'Rechercher' });
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
  });

  test('Échap ferme la recherche', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('combobox', { name: 'Rechercher' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('combobox', { name: 'Rechercher' })).not.toBeVisible();
  });

  test('le bouton loupe ouvre la recherche (y compris avant hydratation complète)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('.search-trigger').click();
    await expect(page.getByRole('combobox', { name: 'Rechercher' })).toBeVisible();
  });
});

test.describe('Drawer sommaire (TOC)', () => {
  test.use({ viewport: { width: 900, height: 800 } });

  test('ouverture : focus déplacé dans le drawer, Échap referme et rend le focus au FAB', async ({
    page,
  }) => {
    await page.goto('/theorie/resume');
    const fab = page.locator('#toc-fab');
    await expect(fab).toBeVisible();

    await fab.click();
    await expect(page.locator('#toc-drawer')).toHaveClass(/is-open/);
    await expect(page.locator('#toc-drawer-close')).toBeFocused();

    // Le contenu derrière est neutralisé (inert)
    const layoutInert = await page.locator('.layout').evaluate((el) => el.hasAttribute('inert'));
    expect(layoutInert).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('#toc-drawer')).not.toHaveClass(/is-open/);
    await expect(fab).toBeFocused();
  });
});

test.describe('Navigation tablette tactile', () => {
  test.use({ hasTouch: true, viewport: { width: 1180, height: 820 } });

  test('deux taps sur une rubrique naviguent vers sa page', async ({ page }) => {
    await page.goto('/');
    const dossiers = page
      .locator('.nav-link')
      .filter({ hasText: 'Dossiers' })
      .first();

    await dossiers.tap();
    // 1ᵉʳ tap : dropdown ouvert, pas de navigation
    await expect(page.locator('.nav-item--open')).toHaveCount(1);
    expect(page.url()).not.toContain('/dossiers');

    await dossiers.tap();
    await page.waitForURL(/\/dossiers/);
    expect(page.url()).toContain('/dossiers');
  });
});

test.describe('Tiroir mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('la navbar est inerte derrière le tiroir ouvert', async ({ page }) => {
    await page.goto('/theorie/resume');
    await page.locator('#mobile-menu-toggle').click();
    await expect(page.locator('#sidebar-left-container')).toHaveClass(/is-mobile-open/);

    const navActionsInert = await page
      .locator('.navbar .nav-actions')
      .evaluate((el) => el.hasAttribute('inert'));
    expect(navActionsInert).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('#sidebar-left-container')).not.toHaveClass(/is-mobile-open/);
    const after = await page
      .locator('.navbar .nav-actions')
      .evaluate((el) => el.hasAttribute('inert'));
    expect(after).toBe(false);
  });
});
