import { defineConfig } from 'vitest/config';

// GitHub Pages serves the site from /<repo-name>/; native (Capacitor) builds load from the app bundle.
export default defineConfig({
  base: process.env.CAPACITOR ? './' : '/Whisker-Rush/',
  build: { target: 'es2020', chunkSizeWarningLimit: 1500 },
  test: { include: ['tests/**/*.test.ts'] },
});
