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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React - siempre cargado primero
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          
          // Chart libraries - solo para admin dashboard
          if (id.includes('node_modules/recharts') || 
              id.includes('node_modules/chart.js') ||
              id.includes('node_modules/d3')) {
            return 'vendor-charts';
          }
          
          // PDF generation - solo cuando genera PDFs
          if (id.includes('node_modules/html2canvas') || 
              id.includes('node_modules/jspdf') ||
              id.includes('node_modules/pdfmake') ||
              id.includes('node_modules/pdfkit')) {
            return 'vendor-pdf';
          }
          
          // Date utilities
          if (id.includes('node_modules/date-fns') ||
              id.includes('node_modules/dayjs') ||
              id.includes('node_modules/moment')) {
            return 'vendor-date';
          }
          
          // Icons - Heroicons y otros
          if (id.includes('node_modules/@heroicons')) {
            return 'vendor-icons';
          }
          
          // Admin components - lazy loaded
          if (id.includes('/components/admin/')) {
            return 'admin';
          }
          
          // GiftCard components
          if (id.includes('/components/giftcard/')) {
            return 'giftcard';
          }
          
          // Other node_modules go to vendor
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['html2canvas', 'jspdf'] // Exclude heavy libs from pre-bundling
  },
  
  // Proxy para API durante desarrollo
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
});