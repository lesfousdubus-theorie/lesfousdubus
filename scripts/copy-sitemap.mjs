import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const indexPath = join(dist, 'sitemap-index.xml');
const sitemap0 = join(dist, 'sitemap-0.xml');
const outPath = join(dist, 'sitemap.xml');

if (existsSync(indexPath)) {
  // Si l'index existe (cas standard avec >1 sitemap ou config par défaut), on le duplique vers /sitemap.xml
  // pour que https://lesfousdubus.sbs/sitemap.xml soit directement accessible (auditeur).
  copyFileSync(indexPath, outPath);
  console.log('[copy-sitemap] sitemap-index.xml -> sitemap.xml');
} else if (existsSync(sitemap0)) {
  // Fallback si Astro ne génère qu'un seul sitemap sans index
  copyFileSync(sitemap0, outPath);
  console.log('[copy-sitemap] sitemap-0.xml -> sitemap.xml');
} else {
  console.warn('[copy-sitemap] aucun sitemap trouvé à copier');
}

// Vérification rapide
if (existsSync(outPath)) {
  const content = readFileSync(outPath, 'utf8');
  console.log(`[copy-sitemap] sitemap.xml ok (${content.length} bytes)`);
}
