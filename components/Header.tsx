import React from 'react';
import { Logo } from './Logo';

export const Header: React.FC = () => {
  // Traducción eliminada, usar texto en español directamente

  return (
    <header className="bg-brand-surface/80 backdrop-blur-sm sticky top-0 z-40 border-b border-brand-border/80">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="w-24">
          <Logo />
        </div>
      <h1 className="text-2xl sm:text-3xl font-sans font-semibold text-brand-text text-center tracking-wider">
        <a href="/" aria-label="Go to homepage">CeramicAlma</a>
      </h1>
      <div className="w-24 flex justify-end"></div>
      </div>
    </header>
  );
};