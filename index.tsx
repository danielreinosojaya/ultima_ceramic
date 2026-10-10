
import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Changed import from App.js to App, and LanguageContext.js to LanguageContext
import App from './App';
import ErrorBoundary from './components/admin/ErrorBoundary';
import { BootFailure } from './components/BootFailure';
import { APP_BOOT_OK } from './config/appBoot';
import { clearStaleChunkReloadFlag, isStaleChunkError, reloadForStaleChunk } from './utils/staleChunkReload';
import './index.css';

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadForStaleChunk();
});

window.addEventListener('unhandledrejection', (event) => {
  if (isStaleChunkError(event.reason) && reloadForStaleChunk()) {
    event.preventDefault();
  }
});

window.setTimeout(clearStaleChunkReloadFlag, 15000);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {APP_BOOT_OK ? (
      <ErrorBoundary fallback={<div className="text-center text-red-600 font-bold p-8">Hubo un error inesperado en la aplicación. Por favor, recarga la página o contacta soporte.</div>}>
        <App />
      </ErrorBoundary>
    ) : (
      <BootFailure />
    )}
  </React.StrictMode>
);