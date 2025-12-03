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
      <div className="w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
        
        {/* Logo - responsive sizing */}
        <div className="w-12 sm:w-16 md:w-20 flex-shrink-0">
          <Logo />
        </div>

        {/* Title - responsive and centered */}
        <h1 className="flex-grow text-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-sans font-semibold text-brand-text tracking-wider">
          <a href="/" aria-label="Go to homepage" className="hover:opacity-80 transition-opacity">
            CeramicAlma
          </a>
        </h1>

        {/* Right section - responsive button area */}
        <div className="flex-shrink-0 flex justify-end items-center gap-1.5 sm:gap-2 md:gap-3">
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
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed opacity-60 font-semibold text-xs sm:text-sm md:text-base transition-opacity whitespace-nowrap"
                  title="Mi Cuenta (próximamente disponible)"
                  aria-label="Mi Cuenta (próximamente disponible)"
                >
                  <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">Mi Cuenta</span>
                  <span className="text-xs bg-gray-400 text-white px-1 sm:px-1.5 py-0.5 rounded">Próx.</span>
                </button>
              )}
              {/* Guest buttons */}
              {onGiftcardClick && (
                <button
                  className="border border-brand-primary bg-white text-brand-primary font-semibold py-1.5 sm:py-2 px-2.5 sm:px-4 md:px-5 rounded-full shadow-sm hover:bg-brand-primary/10 transition-colors text-xs sm:text-sm md:text-base whitespace-nowrap"
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