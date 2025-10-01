import * as path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const isDev = process.env.VERCEL_DEV === '1' || process.env.NODE_ENV === 'development';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: isDev ? 'http://localhost:3000' : 'https://ceramicalma-backend.vercel.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});