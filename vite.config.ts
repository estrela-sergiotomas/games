import { defineConfig } from 'vite';

export default defineConfig({
  base: '/games/',
  build: {
    outDir: 'docs',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
  },
});
