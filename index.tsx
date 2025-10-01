
import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Changed import from App.js to App, and LanguageContext.js to LanguageContext
import App from './App';
import ErrorBoundary from './components/admin/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary fallback={<div className="text-center text-red-600 font-bold p-8">Hubo un error inesperado en la aplicación. Por favor, recarga la página o contacta soporte.</div>}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);