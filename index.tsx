
import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Changed import from App.js to App, and LanguageContext.js to LanguageContext
import App from './App';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);