import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.WIKI_BASE_PATH ? process.env.WIKI_BASE_PATH + '/' : '/',
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [vinext(), sites()],
});
