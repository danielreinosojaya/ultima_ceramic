
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
            target: 'https://ceramicalma-backend.vercel.app', // IMPORTANT: Replace with your actual URL
            changeOrigin: true,
            secure: false, // You might need this if you are proxying to a HTTPS server with a self-signed certificate
          },
        },
      },
    };
});