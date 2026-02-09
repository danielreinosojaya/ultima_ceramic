import React from 'react';
import { Logo } from './Logo';
import { UserIcon } from '@heroicons/react/24/outline';
import { ClientPortal } from './ClientPortal';
import { useAuth } from '../context/AuthContext';
import { FEATURE_FLAGS } from '../featureFlags';

interface HeaderProps {
  onGiftcardClick?: () => void;
  onMyClassesClick?: () => void;
  onClientLogin?: () => void;
  clientEmail?: string | null;
  onClientLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onGiftcardClick, onMyClassesClick, onClientLogin, clientEmail, onClientLogout }) => {
  const { isAuthenticated, user } = useAuth();

  return (
    <header className="bg-brand-surface/80 backdrop-blur-sm sticky top-0 z-40 border-b border-brand-border/80">
      <div className="w-full px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
        
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
          {/* Client Portal - Si está autenticado (vía AuthContext) */}
          {isAuthenticated && user && onMyClassesClick ? (
            <ClientPortal
              onViewClasses={onMyClassesClick}
            />
          ) : (
            <>
              {/* Login button - Si NO está autenticado */}
              {onClientLogin && (
                <button
                  onClick={() => FEATURE_FLAGS.CURSO_TORNO && onClientLogin()}
                  disabled={!FEATURE_FLAGS.CURSO_TORNO}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm md:text-base transition-opacity whitespace-nowrap ${
                    FEATURE_FLAGS.CURSO_TORNO 
                      ? 'bg-brand-primary text-white hover:opacity-90 cursor-pointer' 
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed opacity-60'
                  }`}
                  title={FEATURE_FLAGS.CURSO_TORNO ? "Mi Cuenta" : "Próximamente"}
                  aria-label={FEATURE_FLAGS.CURSO_TORNO ? "Mi Cuenta" : "Próximamente"}
                >
                  <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">{FEATURE_FLAGS.CURSO_TORNO ? 'Mi Cuenta' : 'Próximamente'}</span>
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