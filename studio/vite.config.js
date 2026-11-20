import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project URL: https://equilibriumpress.github.io/motionforge/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : '/motionforge/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}));
