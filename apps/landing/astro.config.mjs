import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://pageview.neruz.tech',
  output: 'static',
  i18n: {
    locales: ['pt-BR', 'en', 'es'],
    defaultLocale: 'pt-BR',
    routing: { prefixDefaultLocale: false },
  },
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
});
