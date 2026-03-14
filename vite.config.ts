import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/games/',
  build: {
    outDir: 'docs',
    assetsDir: 'assets',
  },
  resolve: {
    alias: {
      'phaser-box2d': path.resolve(__dirname, 'node_modules/phaser-box2d/dist/PhaserBox2D.js'),
    },
  },
  server: {
    port: 3000,
  },
});
