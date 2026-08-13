import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';
import { unified } from '@astrojs/markdown-remark';
import rehypeImageDimensions from './src/plugins/rehype-image-dimensions.mjs';

export default defineConfig({
  site: 'https://lesfousdubus.sbs',
  output: 'static',
  // Une seule forme publique pour chaque page. Les canoniques et le sitemap
  // utilisent eux aussi le slash final.
  trailingSlash: 'always',
  prefetch: true,
  // `markdown.rehypePlugins` est déprécié depuis Astro 7.2 : les plugins passent
  // désormais par le processeur `unified({...})` de @astrojs/markdown-remark.
  markdown: {
    processor: unified({
      rehypePlugins: [rehypeImageDimensions],
    }),
  },
  server: { host: '0.0.0.0', allowedHosts: true },
  integrations: [tailwind({ applyBaseStyles: false }), sitemap(), pagefind()],
});
