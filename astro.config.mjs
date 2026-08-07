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
  },
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    sitemap(),
    pagefind()
  ]
});
