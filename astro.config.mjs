import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';

export default defineConfig({
  site: 'https://lesfousdubus.sbs',
  output: 'static',
  prefetch: true,
  server: { host: '0.0.0.0', allowedHosts: true },
  redirects: {
    '/theorie/ponelyphes': '/theorie/poneglyphes',
    '/theorie/ponelyphes/': '/theorie/poneglyphes',
    '/theorie/imu-nerona-fiche': '/theorie/imu-nerona',
    '/theorie/imu-nerona-fiche/': '/theorie/imu-nerona',
    '/theorie/ponelyphes-futur': '/theorie/poneglyphes-futur',
    '/theorie/ponelyphes-futur/': '/theorie/poneglyphes-futur',
    '/theorie/rio-ponelyphe': '/theorie/rio-poneglyphe',
    '/theorie/rio-ponelyphe/': '/theorie/rio-poneglyphe',
    '/theorie/road-ponelyphes': '/theorie/road-poneglyphes',
    '/theorie/road-ponelyphes/': '/theorie/road-poneglyphes',
    '/theorie/le-deluge-et-all-blue': '/theorie/deluge-all-blue',
    '/theorie/le-deluge-et-all-blue/': '/theorie/deluge-all-blue',
  },
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    sitemap(),
    pagefind()
  ]
});
