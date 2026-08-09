import { test, expect } from '@playwright/test';

// Non-régressions clavier / overlays : Échap ferme tout, Ctrl/⌘K ouvre la
// recherche avec focus, et les tiroirs gardent le focus dans leur surface.

test.describe('Modale de recherche', () => {
  test('Ctrl+K ouvre la recherche avec le focus dans le champ', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    const input = page.getByRole('combobox', { name: 'Rechercher' });
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
  });

  test('Échap ferme, réinitialise et rend le focus au déclencheur', async ({ page }) => {
    await page.goto('/');
    const trigger = page.locator('.search-trigger');
    await trigger.click();
    const input = page.getByRole('combobox', { name: 'Rechercher' });
    await input.fill('Nika');
    await expect(page.locator('.wiki-layout')).toHaveAttribute('inert', '');
    await page.keyboard.press('Escape');

    await expect(input).not.toBeVisible();
    await expect(page.locator('.wiki-layout')).not.toHaveAttribute('inert');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await expect(input).not.toHaveAttribute('aria-activedescendant');
    await expect(trigger).toBeFocused();
  });

  test('le raccourci répété ne perd pas le déclencheur à qui rendre le focus', async ({ page }) => {
    await page.goto('/');
    const trigger = page.locator('.search-trigger');
    await trigger.focus();
    await page.keyboard.press('Control+k');
    await page.keyboard.press('Control+k');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  });
});

test.describe('Drawer sommaire (TOC)', () => {
  test.use({ viewport: { width: 900, height: 800 } });

  test('ouverture : focus déplacé, arrière-plan inerte et Échap réversible', async ({ page }) => {
    await page.goto('/theorie/resume');
    const fab = page.locator('#toc-fab');
    await expect(fab).toBeVisible();

    await fab.click();
    await expect(page.locator('#toc-drawer')).toHaveClass(/is-open/);
    await expect(page.locator('#toc-close')).toBeFocused();
    await expect(page.locator('.wiki-layout')).toHaveAttribute('inert', '');

    await page.keyboard.press('Escape');
    await expect(page.locator('#toc-drawer')).not.toHaveClass(/is-open/);
    await expect(page.locator('.wiki-layout')).not.toHaveAttribute('inert');
    await expect(fab).toBeFocused();
  });
});

test.describe('Navigation tablette tactile', () => {
  test.use({ hasTouch: true, viewport: { width: 1180, height: 820 } });

  test('le lien navigue directement et le bouton séparé ouvre le sous-menu', async ({ page }) => {
    await page.goto('/');
    const item = page.locator('.nav-item').filter({ hasText: 'Dossiers' }).first();
    const trigger = item.locator('.nav-menu-trigger');

    await trigger.tap();
    await expect(page.locator('.nav-item--open')).toHaveCount(1);
    expect(page.url()).not.toContain('/dossiers');

    await item.locator('.nav-link').tap();
    await page.waitForURL(/\/dossiers/);
    expect(page.url()).toContain('/dossiers');
  });
});

test.describe('Tiroir mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('le chrome de la navbar est inerte derrière le tiroir ouvert', async ({ page }) => {
    await page.goto('/theorie/resume');
    await page.locator('#mobile-menu-toggle').click();
    await expect(page.locator('#sidebar-left')).toHaveClass(/is-open/);
    await expect(page.locator('.navbar .nav-actions')).toHaveAttribute('inert', '');

    await page.keyboard.press('Escape');
    await expect(page.locator('#sidebar-left')).not.toHaveClass(/is-open/);
    await expect(page.locator('.navbar .nav-actions')).not.toHaveAttribute('inert');
  });
});
