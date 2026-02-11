import React from 'react';
import { motion } from 'framer-motion';
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
    <motion.header 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="backdrop-blur-xl bg-white/[0.72] sticky top-0 z-40 border-b border-white/20 shadow-glass"
    >
      <div className="w-full px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
        
        {/* Logo - responsive sizing */}
        <motion.div 
          className="w-12 sm:w-16 md:w-20 flex-shrink-0"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <Logo />
        </motion.div>

        {/* Title - responsive and centered */}
        <h1 className="flex-grow text-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-sans font-semibold text-brand-text tracking-wider">
          <motion.a 
            href="/" 
            aria-label="Go to homepage"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="block hover:opacity-80 transition-opacity"
          >
            CeramicAlma
          </motion.a>
        </h1>

        {/* Right section - responsive button area */}
        <motion.div 
          className="flex-shrink-0 flex justify-end items-center gap-1.5 sm:gap-2 md:gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Client Portal - Si está autenticado (vía AuthContext) */}
          {isAuthenticated && user && onMyClassesClick ? (
            <ClientPortal
              onViewClasses={onMyClassesClick}
            />
          ) : (
            <>
              {/* Login button - Si NO está autenticado */}
              {onClientLogin && (
                <motion.button
                  onClick={() => FEATURE_FLAGS.CURSO_TORNO && onClientLogin()}
                  disabled={!FEATURE_FLAGS.CURSO_TORNO}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm md:text-base transition-all whitespace-nowrap relative overflow-hidden group ${
                    FEATURE_FLAGS.CURSO_TORNO 
                      ? 'bg-gradient-to-r from-brand-primary to-brand-primary/90 text-white shadow-premium hover:shadow-premium-hover cursor-pointer' 
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed opacity-60'
                  }`}
                  title={FEATURE_FLAGS.CURSO_TORNO ? "Mi Cuenta" : "Próximamente"}
                  aria-label={FEATURE_FLAGS.CURSO_TORNO ? "Mi Cuenta" : "Próximamente"}
                >
                  <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">{FEATURE_FLAGS.CURSO_TORNO ? 'Mi Cuenta' : 'Próximamente'}</span>
                </motion.button>
              )}
              {/* Guest buttons */}
              {onGiftcardClick && (
                <motion.button
                  onClick={onGiftcardClick}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="border-2 border-brand-primary bg-white text-brand-primary font-semibold py-1.5 sm:py-2 px-2.5 sm:px-4 md:px-5 rounded-full shadow-premium hover:shadow-premium-hover hover:bg-brand-primary/5 transition-all text-xs sm:text-sm md:text-base whitespace-nowrap"
                  style={{letterSpacing: '0.03em'}} 
                >
                  Giftcard
                </motion.button>
              )}
            </>
          )}
        </motion.div>
      </div>
    </motion.header>
  );
};