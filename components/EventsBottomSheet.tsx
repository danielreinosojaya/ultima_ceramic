import React, { useEffect, useState, useRef } from 'react';

interface SpecialEvent {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  imageUrl: string;
  slug: string;
  color: string;
}

interface EventsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onEventClick: (slug: string) => void;
}

// Eventos especiales - podrían venir de una API o constante
const SPECIAL_EVENTS: SpecialEvent[] = [
  {
    id: 'san-valentin-2026',
    title: 'San Valentín',
    subtitle: 'Taller romántico en pareja - 14 de febrero',
    date: '14 Feb',
    imageUrl: '/images/events/san-valentin.jpg',
    slug: 'sanvalentin',
    color: 'rose'
  },
  {
    id: 'halloween-2026',
    title: 'Halloween',
    subtitle: 'Taller temático de miedo',
    date: '31 Oct',
    imageUrl: '/images/events/halloween.jpg',
    slug: 'halloween',
    color: 'orange'
  },
  {
    id: 'dia-madre-2026',
    title: 'Día de la Madre',
    subtitle: 'Regala una experiencia única',
    date: 'Mayo',
    imageUrl: '/images/events/dia-madre.jpg',
    slug: 'dia-madre',
    color: 'pink'
  },
  {
    id: 'aniversario-2026',
    title: 'Aniversario Ceramicalma',
    subtitle: 'Celebramos juntos nuestro cumpleaños',
    date: 'Junio',
    imageUrl: '/images/events/aniversario.jpg',
    slug: 'aniversario',
    color: 'amber'
  }
];

export const EventsBottomSheet: React.FC<EventsBottomSheetProps> = ({
  isOpen,
  onClose,
  onEventClick
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Animación de entrada
  useEffect(() => {
    if (isOpen) {
      // Pequeño delay para la animación
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevenir scroll del body cuando está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleEventSelect = (slug: string) => {
    handleClose();
    // Delay para que cierre el modal antes de navegar
    setTimeout(() => {
      onEventClick(slug);
    }, 350);
  };

  if (!isOpen && !isVisible) return null;

  const getEventColor = (color: string) => {
    const colors: Record<string, string> = {
      rose: 'from-rose-400 to-rose-600',
      orange: 'from-orange-400 to-orange-600',
      pink: 'from-pink-400 to-pink-600',
      amber: 'from-amber-400 to-amber-600'
    };
    return colors[color] || colors.amber;
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
      style={{
        backgroundColor: isVisible && !isClosing ? 'rgba(0, 0, 0, 0.6)' : 'transparent',
        backdropFilter: isVisible && !isClosing ? 'blur(4px)' : 'none'
      }}
    >
      {/* Modal Centrado - Más pequeño */}
      <div
        ref={sheetRef}
        className={`bg-brand-surface w-full mx-4 rounded-2xl shadow-2xl transform transition-all duration-300 ${
          isVisible && !isClosing 
            ? 'scale-100 opacity-100' 
            : 'scale-95 opacity-0'
        }`}
        style={{
          maxWidth: '420px',
          maxHeight: '70vh'
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎉</span>
              <h2 className="font-serif text-xl font-bold text-brand-text">
                Eventos Especiales
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Events List */}
        <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 80px)' }}>
          <div className="space-y-3">
            {SPECIAL_EVENTS.map((event) => (
              <button
                key={event.id}
                onClick={() => handleEventSelect(event.slug)}
                className="group w-full text-left bg-white rounded-xl overflow-hidden shadow-subtle hover:shadow-lifted transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Event Icon */}
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getEventColor(event.color)} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-xl">
                      {event.color === 'rose' ? '💕' : 
                       event.color === 'orange' ? '🎃' : 
                       event.color === 'pink' ? '🌸' : '🎂'}
                    </span>
                  </div>
                  
                  {/* Event Info */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-brand-text truncate">
                        {event.title}
                      </h3>
                      <span className="flex-shrink-0 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded">
                        {event.date}
                      </span>
                    </div>
                    <p className="text-brand-secondary text-xs mt-0.5 truncate">
                      {event.subtitle}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook personalizado para detectar scroll y mostrar el bottom sheet
// Versión simplificada con scroll event
export const useScrollEventsTrigger = (enabled: boolean = true) => {
  const [shouldShowEvents, setShouldShowEvents] = useState(false);
  const hasShownRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!enabled || hasShownRef.current) return;
    
    const handleScroll = () => {
      if (hasShownRef.current || scrollTimeoutRef.current) return;
      
      // Debounce para no ejecutar múltiples veces
      scrollTimeoutRef.current = setTimeout(() => {
        const scrollPosition = window.scrollY + window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Mostrar cuando el usuario haya scrolleado el 70% de la página
        const scrollPercentage = scrollPosition / documentHeight;
        
        if (scrollPercentage > 0.7) {
          hasShownRef.current = true; // Marcar como mostrado INMEDIATAMENTE
          setShouldShowEvents(true);
        }
        
        scrollTimeoutRef.current = null;
      }, 200);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [enabled]);
  
  return { shouldShowEvents, setShouldShowEvents };
};
