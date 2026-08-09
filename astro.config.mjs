import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';
import rehypeImageDimensions from './src/plugins/rehype-image-dimensions.mjs';

export default defineConfig({
  site: 'https://lesfousdubus.sbs',
  output: 'static',
  prefetch: true,
  markdown: {
    rehypePlugins: [rehypeImageDimensions],
  },
  server: { host: '0.0.0.0', allowedHosts: true },
  redirects: {
    '/explorer/chronologie-comparative': '/theorie/chronologie',
    '/theorie/ponelyphes': '/theorie/poneglyphes',
    '/theorie/imu-nerona-fiche': '/theorie/imu-nerona',
    '/theorie/ponelyphes-futur': '/theorie/poneglyphes-futur',
    '/theorie/rio-ponelyphe': '/theorie/rio-poneglyphe',
    '/theorie/road-ponelyphes': '/theorie/road-poneglyphes',
    '/theorie/le-deluge-et-all-blue': '/theorie/deluge-all-blue',
    // Anciennes pages de conclusion fusionnées dans leurs dossiers neutres.
    '/theorie/lili-vivi-et-les-poneglyphes': '/theorie/vivi',
    '/theorie/zoro-est-ryuma': '/theorie/ryuma',
    '/theorie/davy-jones': '/theorie/barbe-noire-davy-jones',
    '/theorie/emeth-robot-du-futur': '/theorie/emeth-futur',
    '/theorie/zunesha': '/theorie/zunesha-fiche',
    '/theorie/poseidon': '/theorie/poseidon-fiche',
    '/theorie/pluton': '/theorie/pluton-fiche',
  },
  integrations: [tailwind({ applyBaseStyles: false }), sitemap(), pagefind()],
});
