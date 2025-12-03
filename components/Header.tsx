import React from 'react';
import { Logo } from './Logo';
import { UserIcon } from '@heroicons/react/24/outline';
import { ClientPortal } from './ClientPortal';

interface HeaderProps {
  onGiftcardClick?: () => void;
  onMyClassesClick?: () => void;
  onClientLogin?: () => void;
  clientEmail?: string | null;
  onClientLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onGiftcardClick, onMyClassesClick, onClientLogin, clientEmail, onClientLogout }) => {
  return (
    <header className="bg-brand-surface/80 backdrop-blur-sm sticky top-0 z-40 border-b border-brand-border/80">
      <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="w-16 sm:w-24">
          <Logo />
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-sans font-semibold text-brand-text text-center tracking-wider">
          <a href="/" aria-label="Go to homepage">CeramicAlma</a>
        </h1>
        <div className="w-auto sm:w-24 flex justify-end items-center gap-2">
          {/* Client Portal - Si está autenticado */}
          {clientEmail && onClientLogout && onMyClassesClick ? (
            <ClientPortal
              clientEmail={clientEmail}
              onViewClasses={onMyClassesClick}
              onLogout={onClientLogout}
            />
          ) : (
            <>
              {/* Login button - Si NO está autenticado */}
              {onClientLogin && (
                <button
                  disabled
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed opacity-60 font-semibold text-sm sm:text-base"
                  title="Mi Cuenta (próximamente disponible)"
                  aria-label="Mi Cuenta (próximamente disponible)"
                >
                  <UserIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Mi Cuenta</span>
                  <span className="text-xs bg-gray-400 text-white px-1.5 py-0.5 rounded ml-1">Próx.</span>
                </button>
              )}
              {/* Guest buttons */}
              {onGiftcardClick && (
                <button
                  className="border border-brand-primary bg-white text-brand-primary font-semibold py-1.5 px-3 sm:px-4 rounded-full shadow-sm hover:bg-brand-primary/10 transition-colors text-sm sm:text-base whitespace-nowrap"
                  style={{letterSpacing: '0.03em'}} 
                  onClick={onGiftcardClick}
                >
                  Giftcard
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};