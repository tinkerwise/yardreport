import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.briancsmith.org',
  base: '/yardreport',
  output: 'static',
  build: {
    assets: 'assets',
  },
});
