import { defineConfig, transformWithOxc } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Components and content keep JSX in .js files (as CRA allowed), but Vite only parses JSX in .jsx.
// Compile src/**/*.js as JSX before anything else sees it. Edits to these files reload the page
// instead of hot-swapping, since React Fast Refresh only runs on .jsx files.
const jsxInJs = (mode) => ({
  name: 'jsx-in-js',
  enforce: 'pre',
  transform: {
    filter: { id: /\/src\/.*\.js$/ },
    handler: (code, id) =>
      transformWithOxc(code, id, {
        lang: 'jsx',
        jsx: { runtime: 'automatic', development: mode !== 'production' },
      }),
  },
});

export default defineConfig(({ mode }) => ({
  // The site is served from https://emeria.github.io/cheatsheet-monster-2.0/
  base: '/cheatsheet-monster-2.0/',
  plugins: [jsxInJs(mode), react()],
  server: { port: 3000 },
  // The dev server's dependency scan reads src/ without the Vite plugins, so it needs the JSX
  // compile too. moduleTypes alone isn't enough: the scanner forces any file using import.meta.glob
  // back to plain JS, so files like widgets/TalentTree.js failed to parse and pre-bundling was skipped.
  optimizeDeps: {
    entries: ['index.html'],
    rolldownOptions: { plugins: [jsxInJs(mode)] },
  },
  // Bundles go in static/ so they don't mix with the content files copied from public/assets.
  build: { outDir: 'build', assetsDir: 'static' },
  test: {
    environment: 'jsdom',
    // Playwright owns e2e/.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    globals: true,
    setupFiles: './src/setupTests.js',
  },
}));
