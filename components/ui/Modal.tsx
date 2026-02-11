import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string | React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeButton?: boolean;
  closeOnBackdropClick?: boolean;
}

/**
 * Modern Modal component with Framer Motion animations
 * Features: smooth entrance/exit, backdrop blur, customizable size
 */
const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      variant = 'default',
      size = 'md',
      closeButton = true,
      closeOnBackdropClick = true,
    },
    ref
  ) => {
    const sizes = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
    };

    const variantClasses = {
      default: 'bg-white',
      glass: 'backdrop-blur-xl bg-white/[0.95] border border-white/20',
    };

    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => closeOnBackdropClick && onClose()}
              className="fixed inset-0 bg-black/40 z-40"
            />

            {/* Modal */}
            <motion.div
              ref={ref}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={cn(
                `fixed inset-0 z-50 flex items-center justify-center p-4`,
              )}
            >
              <div
                className={cn(
                  'rounded-2xl shadow-premium-lg w-full',
                  sizes[size],
                  variantClasses[variant],
                  'max-h-[90vh] overflow-y-auto'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                {(title || closeButton) && (
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    {typeof title === 'string' ? (
                      <h2 className="text-xl font-bold text-brand-text">{title}</h2>
                    ) : (
                      title
                    )}
                    {closeButton && (
                      <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-6">{children}</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
);

Modal.displayName = 'Modal';

export { Modal };
