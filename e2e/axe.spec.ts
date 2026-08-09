import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Filet de sécurité WCAG 2.2 AA sur les pages types (audit du 09/08/2026, §6.3).
const PAGES = [
  '/',
  '/theorie/joy-boy/',
  '/chapitres/',
  '/dossiers/',
  '/explorer/',
];

for (const path of PAGES) {
  test(`axe — pas de violation A/AA sur ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const violations = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    }));

    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}
