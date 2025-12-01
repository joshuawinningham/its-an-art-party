// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import basicSsl from '@vitejs/plugin-basic-ssl';

const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');

// https://astro.build/config
export default defineConfig({
  // Site URL for canonical URLs and sitemap generation
  site: 'https://www.itsanartparty.com',

  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      // Customize priority for specific pages
      serialize(item) {
        // Homepage gets highest priority
        if (item.url === 'https://www.itsanartparty.com/') {
          item.priority = 1.0;
          item.changefreq = 'weekly';
        }
        // Main service pages
        else if (
          item.url.includes('/kids-birthdays') ||
          item.url.includes('/art-lessons') ||
          item.url.includes('/about') ||
          item.url.includes('/contact')
        ) {
          item.priority = 0.9;
          item.changefreq = 'monthly';
        }
        // Blog listing page
        else if (item.url === 'https://www.itsanartparty.com/blog/') {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        }
        // Individual blog posts
        else if (item.url.includes('/how-to-') || item.url.includes('/homeschool-')) {
          item.priority = 0.6;
          item.changefreq = 'monthly';
        }
        return item;
      },
    }),
  ],

  vite: {
    plugins: [
      tailwindcss(),
      process.env.HTTPS === 'true' ? basicSsl() : null
    ].filter(Boolean),
  },
});
