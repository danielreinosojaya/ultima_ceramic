import React, { useEffect, useState, useRef } from 'react';

interface SpecialEvent {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  imageUrl: string;
  slug: string;
  color: string;
  url?: string; // Para links externos
}

interface EventsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onEventClick: (slug: string) => void;
}

// Eventos especiales - podrían venir de una API o constante
const SPECIAL_EVENTS: SpecialEvent[] = [
  {
    id: 'ceramica-cafe-12-mar',
    title: 'Cerámica y Café',
    subtitle: 'Ritual sensorial - Jueves 12 de marzo, 5:00 - 7:30pm',
    date: '12 Mar',
    imageUrl: '/images/events/ceramica-cafe.jpg',
    slug: 'ceramica-cafe',
    color: 'amber',
    url: 'https://www.instagram.com/p/DVeohr7CVwr/'
  },
  {
    id: 'ceramica-yoga-13-mar',
    title: 'Cerámica y Yoga',
    subtitle: 'Conectando cuerpo y mente - Viernes 13 de marzo, 10:00am - 12:00pm',
    date: '13 Mar',
    imageUrl: '/images/events/ceramica-yoga.jpg',
    slug: 'ceramica-yoga',
    color: 'rose',
    url: 'https://www.instagram.com/p/DVZoc9JCWgm/?img_index=1'
  },
  {
    id: 'modelado-jaime-19-mar',
    title: 'Taller de Modelado a Mano',
    subtitle: 'Con Jaime Aldas (Páramo) - Jueves 19 de marzo, 6:00 - 9:00pm',
    date: '19 Mar',
    imageUrl: '/images/events/modelado.jpg',
    slug: 'modelado-jaime',
    color: 'orange'
  },
  {
    id: 'torno-jaime-22-mar',
    title: 'Taller de Torno Alfarero',
    subtitle: 'Con Jaime Aldas (Páramo) - Domingo 22 de marzo, 3:00 - 6:00pm',
    date: '22 Mar',
    imageUrl: '/images/events/torno.jpg',
    slug: 'torno-jaime',
    color: 'pink'
  },
  {
    id: 'taller-rum-24-abr',
    title: 'Taller con Rum AM',
    subtitle: 'Viernes 24 de abril, 6:00 - 8:00pm',
    date: '24 Abr',
    imageUrl: '/images/events/rum.jpg',
    slug: 'taller-rum',
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
    // Guardar en sessionStorage que fue cerrado EN ESTA SESIÓN
    // Solo blockear el modal si fue cerrado manually en la sesión actual
    sessionStorage.setItem('eventsModalDismissedThisSession', 'true');
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
    // Buscar el evento
    const event = SPECIAL_EVENTS.find(e => e.slug === slug);
    
    // Si tiene URL externa, abrir en nueva pestaña
    if (event?.url) {
      handleClose();
      setTimeout(() => {
        window.open(event.url, '_blank');
      }, 350);
      return;
    }
    
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

  const getEventIcon = (slug: string, color: string) => {
    const icons: Record<string, string> = {
      'ceramica-cafe': '☕',
      'ceramica-yoga': '🧘',
      'modelado-jaime': '🏺',
      'torno-jaime': '🎨',
      'taller-rum': '🍹'
    };
    return icons[slug] || '🎉';
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
      {/* Modal Centrado - Responsivo */}
      <div
        ref={sheetRef}
        className={`bg-brand-surface w-full mx-2 sm:mx-4 rounded-2xl shadow-2xl transform transition-all duration-300 flex flex-col ${
          isVisible && !isClosing 
            ? 'scale-100 opacity-100' 
            : 'scale-95 opacity-0'
        }`}
        style={{
          maxWidth: '420px',
          maxHeight: 'min(85vh, calc(100vh - 40px))',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2 sm:pb-3 flex-shrink-0" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-grow">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-brand-text leading-tight">
                ¡Nuestros próximos eventos y colabs!
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200 ml-2"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Events List */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 overflow-y-auto flex-grow" style={{ overscrollBehavior: 'contain' }}>
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
                      {getEventIcon(event.slug, event.color)}
                    </span>
                  </div>
                  
                  {/* Event Info */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-brand-text truncate text-sm sm:text-base">
                        {event.title}
                      </h3>
                      <span className="flex-shrink-0 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded whitespace-nowrap">
                        {event.date}
                      </span>
                    </div>
                    <p className="text-brand-secondary text-xs mt-0.5 line-clamp-2">
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
// Muestra el modal después de 5 segundos o al hacer scroll 70%
export const useScrollEventsTrigger = (enabled: boolean = true) => {
  const [shouldShowEvents, setShouldShowEvents] = useState(false);
  const hasShownRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!enabled || hasShownRef.current) return;
    
    console.log('[useScrollEventsTrigger] Hook iniciado');
    
    // Revisar si el usuario cerró el modal EN ESTA SESIÓN
    // sessionStorage se limpia cuando cierras la pestaña, perfecto para este caso
    const dismissedThisSession = sessionStorage.getItem('eventsModalDismissedThisSession');
    
    // Si fue cerrado en ESTA sesión, no mostrar de nuevo
    if (dismissedThisSession) {
      console.log('[useScrollEventsTrigger] Modal fue cerrado en esta sesión, no mostrar');
      return;
    }
    
    console.log('[useScrollEventsTrigger] Mostrando modal - 5 segundos de delay');
    
    // Timer de 5 segundos como backup - mostrar modal aunque no haga scroll
    const timer5Seconds = setTimeout(() => {
      if (!hasShownRef.current) {
        console.log('[useScrollEventsTrigger] Modal abierto: timer 5 segundos');
        hasShownRef.current = true;
        setShouldShowEvents(true);
      }
    }, 5000);
    
    const handleScroll = () => {
      if (hasShownRef.current || scrollTimeoutRef.current) return;
      
      // Debounce para no ejecutar múltiples veces
      scrollTimeoutRef.current = setTimeout(() => {
        const scrollPosition = window.scrollY + window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Mostrar cuando el usuario haya scrolleado el 70% de la página
        const scrollPercentage = scrollPosition / documentHeight;
        
        if (scrollPercentage > 0.7) {
          console.log('[EventsBottomSheet] Showing modal - scrolled 70%');
          hasShownRef.current = true;
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
      clearTimeout(timer5Seconds);
    };
  }, [enabled]);
  
  return { shouldShowEvents, setShouldShowEvents };
};
