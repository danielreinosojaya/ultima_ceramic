import React from 'react';
import { Logo } from './Logo';

interface HeaderProps {
  onGiftcardClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onGiftcardClick }) => {
  return (
    <header className="bg-brand-surface/80 backdrop-blur-sm sticky top-0 z-40 border-b border-brand-border/80">
      <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="w-16 sm:w-24">
          <Logo />
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-sans font-semibold text-brand-text text-center tracking-wider">
          <a href="/" aria-label="Go to homepage">CeramicAlma</a>
        </h1>
        <div className="w-16 sm:w-24 flex justify-end">
          {onGiftcardClick && (
            <button
              className="border border-brand-primary bg-white text-brand-primary font-semibold py-1.5 px-3 sm:px-4 rounded-full shadow-sm hover:bg-brand-primary/10 transition-colors text-sm sm:text-base whitespace-nowrap"
              style={{letterSpacing: '0.03em'}} 
              onClick={onGiftcardClick}
            >
              Giftcard
            </button>
          )}
        </div>
      </div>
    </header>
  );
};