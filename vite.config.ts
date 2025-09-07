import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig(() => {
    return {
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.'),
        },
      },
      // ADD THIS 'server' BLOCK
      server: {
        proxy: {
          '/api': {
            target: 'https://ceraback-psi.vercel.app', // IMPORTANT: Replace with your actual URL
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
          },
        },
      },
    };
});