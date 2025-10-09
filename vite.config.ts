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
        manualChunks: {
          // Core React libs
          vendor: ['react', 'react-dom'],
          
          // Admin components (lazy loaded)
          admin: [
            './components/admin/AdminConsole.tsx',
            './components/admin/ProductManager.tsx',
            './components/admin/CalendarOverview.tsx',
            './components/admin/CrmDashboard.tsx',
            './components/admin/InquiryManager.tsx',
            './components/admin/InvoiceManager.tsx'
          ],
          
          // PDF generation (only loaded when needed)
          pdf: ['html2canvas', 'dompurify'],
          
          // Data services and utilities
          utils: ['./services/dataService.ts', './utils/formatters.ts'],
          
          // Chart libraries (for admin dashboard)
          charts: ['chart.js']
        }
      }
    },
    chunkSizeWarningLimit: 400, // Reduce warning limit to encourage smaller chunks
    
    // Enable CSS code splitting
    cssCodeSplit: true
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['html2canvas'] // Exclude heavy libs from pre-bundling
  },
  
  // ✅ Sin proxy - Vercel Dev maneja todo
});