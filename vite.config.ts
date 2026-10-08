import { defineConfig } from 'vitest/config';

// GitHub Pages serves the site from /<repo-name>/.
export default defineConfig({
  base: '/Whisker-Rush/',
  build: { target: 'es2020', chunkSizeWarningLimit: 1500 },
  test: { include: ['tests/**/*.test.ts'] },
});
