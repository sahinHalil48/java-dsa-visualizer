import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         -> normal build in dist/ (GitHub Pages)
// `npm run build:single`  -> one self-contained HTML file in dist-single/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist' },
  test: { globals: true, environment: 'node' },
}));
