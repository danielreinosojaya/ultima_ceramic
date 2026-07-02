import React, { useEffect, useState, useRef } from 'react';
import {
  SparklesIcon,
  XMarkIcon,
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

type EventCategory = 'experience' | 'course' | 'workshop' | 'open-studio';

interface SpecialEvent {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  duration: string;
  category: EventCategory;
  description: string;
  image: string;
  price: string;
  eventDate: string; // ISO format: YYYY-MM-DD
  url?: string;
  internalSlug?: string;
  hideReserveButton?: boolean;
}

const categoryLabels: Record<EventCategory, string> = {
  experience: 'Experiencia',
  course: 'Curso',
  workshop: 'Taller',
  'open-studio': 'Open Studio',
};

const categoryColors: Record<EventCategory, string> = {
  experience: '#C4704E',
  course: '#7A5C45',
  workshop: '#A08060',
  'open-studio': '#6B8C6B',
};

interface EventsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onEventClick: (slug: string) => void;
}

// ── Eventos actuales ──────────────────────────────────────────────────────────
const SPECIAL_EVENTS: SpecialEvent[] = [
  {
    id: 'desobedecer-al-dolor-16-jul',
    title: 'Desobedecer al Dolor',
    subtitle: 'Escritura, poesía y cerámica · Jueves 16 de julio',
    date: 'Jueves, 16 Julio',
    time: '10:00',
    duration: '3 horas',
    category: 'workshop',
    description: 'Experiencia guiada por Mayi Gómez y Carolina Massuh: escritura, meditación con aceites esenciales y cerámica para canalizar emociones y darles forma.',
    image: '/images/events/desobedecer.png',
    price: '$55 por persona',
    eventDate: '2026-07-16',
    internalSlug: 'desobedecer-al-dolor',
  },
  {
    id: 'huella-mascota-21-jul',
    title: 'Una Huella que Queda para Siempre',
    subtitle: 'Experiencia con mascotas · Martes 21 de julio',
    date: 'Martes, 21 Julio',
    time: '10:00',
    duration: '10:00 – 18:00',
    category: 'experience',
    description: 'Plasma la huella de tu compañero de cuatro patas en arcilla. Personalízala con nombre, fecha y detalles. Spot de fotos, marcas auspiciantes y regalitos.',
    image: '/images/events/perrito.png',
    price: 'Desde $45',
    eventDate: '2026-07-21',
    internalSlug: 'huella-mascota',
  },
  {
    id: 'feria-cidap-alhambra-24-jul',
    title: 'Feria CIDAP – Alhambra',
    subtitle: '24 al 26 de julio · Merch y recuerdos para bebés',
    date: '24 – 26 Julio',
    time: '10:00',
    duration: '10:00 – 20:00',
    category: 'experience',
    description: 'Stand con merch y precios especiales. Actividad para bebés: marca la manito o piecito en arcilla. Sin reserva — atendemos por orden de llegada. Visítanos temprano.',
    image: '/images/events/bebe.png',
    price: 'Por orden de llegada',
    eventDate: '2026-07-24',
    hideReserveButton: true,
  },
];

// ── Helpers: filtra eventos futuros ─────────────────────────────────────────
export function getUpcomingEvents(events: SpecialEvent[] = SPECIAL_EVENTS): SpecialEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return events.filter(e => {
    const eventDate = new Date(e.eventDate);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today;
  });
}

export function hasUpcomingEvents(): boolean {
  return getUpcomingEvents().length > 0;
}

function getNextUpcomingEvent(events: SpecialEvent[]): SpecialEvent | undefined {
  const upcomingEvents = getUpcomingEvents(events);
  if (upcomingEvents.length === 0) return undefined;

  return upcomingEvents.reduce((closest, current) => {
    const currentDate = new Date(current.eventDate);
    const closestDate = new Date(closest.eventDate);
    return currentDate < closestDate ? current : closest;
  });
}

// ── Featured Event Card ────────────────────────────────────────────────────────
function FeaturedEventCard({ event, onEventClick }: { event: SpecialEvent; onEventClick?: (slug: string) => void }) {
  const catColor = categoryColors[event.category];

  const handleClick = () => {
    if (event.internalSlug && onEventClick) {
      onEventClick(event.internalSlug);
    } else if (event.url) {
      window.open(event.url, '_blank');
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      style={{ background: '#1a1209' }}
      onClick={handleClick}
    >
      <div className="absolute inset-0">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-all duration-500 group-hover:scale-105"
          style={{ transition: 'transform 0.6s ease, opacity 0.5s ease' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(15,8,2,0.95) 0%, rgba(15,8,2,0.5) 50%, transparent 100%)' }}
        />
      </div>

      <div className="relative p-5 flex flex-col justify-between" style={{ minHeight: '300px' }}>
        <div className="flex items-start justify-between">
          <span
            className="text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full"
            style={{ background: catColor, color: '#FAF5EE' }}
          >
            {categoryLabels[event.category]}
          </span>
        </div>

        <div>
          <p className="text-sm mb-1" style={{ color: '#C4704E' }}>{event.subtitle}</p>
          <h3 className="text-xl font-bold mb-2 leading-tight" style={{ color: '#FAF5EE' }}>{event.title}</h3>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(250,245,238,0.7)' }}>{event.description}</p>

          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(250,245,238,0.8)' }}>
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(250,245,238,0.8)' }}>
              <ClockIcon className="w-3.5 h-3.5" />
              <span>{event.time} · {event.duration}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs mb-1" style={{ color: 'rgba(250,245,238,0.5)' }}>Desde</p>
              <p className="text-2xl font-bold" style={{ color: '#FAF5EE' }}>{event.price}</p>
            </div>
            {!event.hideReserveButton && (
              <button
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: '#C4704E', color: '#FAF5EE' }}
              >
                Reservar ahora
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Regular Event Card ─────────────────────────────────────────────────────────
function RegularEventCard({ event, onEventClick }: { event: SpecialEvent; onEventClick?: (slug: string) => void }) {
  const catColor = categoryColors[event.category];

  const handleClick = () => {
    if (event.internalSlug && onEventClick) {
      onEventClick(event.internalSlug);
    } else if (event.url) {
      window.open(event.url, '_blank');
    }
  };

  return (
    <div
      className="group cursor-pointer rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:translate-y-[-2px]"
      style={{ background: 'rgba(196,112,78,0.06)', border: '1px solid rgba(196,112,78,0.12)' }}
      onClick={handleClick}
    >
      <div className="relative overflow-hidden" style={{ height: '130px' }}>
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(26,18,9,0.7) 100%)' }}
        />
        <span
          className="absolute top-2.5 left-2.5 text-xs font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full"
          style={{ background: catColor, color: '#FAF5EE', fontSize: '10px' }}
        >
          {categoryLabels[event.category]}
        </span>
      </div>

      <div className="p-3.5 flex flex-col flex-1">
        <h4 className="font-bold text-sm mb-0.5 leading-snug" style={{ color: '#3D2410' }}>{event.title}</h4>
        <p className="text-xs mb-3 leading-relaxed flex-1" style={{ color: '#7A5C45' }}>
          {event.description}
        </p>

        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#A08060' }}>
            <CalendarIcon className="w-3 h-3" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#A08060' }}>
            <ClockIcon className="w-3 h-3" />
            <span>{event.time} · {event.duration}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <p className="font-bold text-base" style={{ color: '#C4704E' }}>{event.price}</p>
          {!event.hideReserveButton && (
            <button
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: 'rgba(196,112,78,0.12)', color: '#C4704E', border: '1px solid rgba(196,112,78,0.3)' }}
            >
              Reservar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main EventsBottomSheet ─────────────────────────────────────────────────────
export const EventsBottomSheet: React.FC<EventsBottomSheetProps> = ({
  isOpen,
  onClose,
  onEventClick,
}) => {
  const [visible, setVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const sheetRef = useRef<HTMLDivElement>(null);

  const upcomingEvents = getUpcomingEvents();
  const featuredEvent = getNextUpcomingEvent(upcomingEvents);
  const otherEvents = upcomingEvents.filter(e => !featuredEvent || e.id !== featuredEvent.id);

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'experience', label: 'Experiencias' },
    { key: 'course', label: 'Cursos' },
    { key: 'workshop', label: 'Talleres' },
    { key: 'open-studio', label: 'Open Studio' },
  ];

  const filteredOther = activeFilter === 'all'
    ? otherEvents
    : otherEvents.filter(e => e.category === activeFilter);

  const showFeatured = featuredEvent && (activeFilter === 'all' || activeFilter === featuredEvent.category);

  // Animación entrada
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Block body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setVisible(false);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 350);
  };

  if (!isOpen && !visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{
        background: 'rgba(15,8,2,0.75)',
        backdropFilter: 'blur(8px)',
        transition: 'opacity 0.35s ease',
        opacity: visible && !isClosing ? 1 : 0,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        ref={sheetRef}
        className="relative w-full overflow-hidden flex flex-col"
        style={{
          maxWidth: '860px',
          maxHeight: '90vh',
          background: '#FAF5EE',
          borderRadius: '24px',
          boxShadow: '0 32px 80px rgba(15,8,2,0.4), 0 8px 24px rgba(15,8,2,0.2)',
          transform: visible && !isClosing ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease',
          opacity: visible && !isClosing ? 1 : 0,
        }}
      >
        {/* ── Header ── */}
        <div
          className="relative flex-shrink-0 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(196,112,78,0.15)' }}
        >
          {/* Decorative blobs */}
          <div className="absolute inset-0 overflow-hidden rounded-t-[24px] pointer-events-none">
            <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #C4704E, transparent)' }} />
            <div className="absolute -top-8 right-24 w-32 h-32 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #7A5C45, transparent)' }} />
          </div>

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                style={{ background: 'rgba(196,112,78,0.12)', border: '1px solid rgba(196,112,78,0.2)' }}
              >
                <SparklesIcon className="w-5 h-5" style={{ color: '#C4704E' }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#C4704E' }}>
                    Ceramica Alma
                  </p>
                  <span className="w-1 h-1 rounded-full" style={{ background: '#C4704E', opacity: 0.4 }} />
                  <p className="text-xs tracking-wide" style={{ color: '#A08060' }}>Holistic Pottery Studio</p>
                </div>
                <h2 className="text-xl font-bold leading-tight" style={{ color: '#3D2410' }}>
                  Próximos Eventos
                </h2>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: 'rgba(61,36,16,0.07)', color: '#7A5C45' }}
              aria-label="Cerrar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Filter tabs */}
          <div
            className="relative flex items-center gap-2 mt-4 overflow-x-auto pb-0.5"
            style={{ scrollbarWidth: 'none' }}
          >
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className="flex-shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all duration-200"
                style={
                  activeFilter === f.key
                    ? { background: '#C4704E', color: '#FAF5EE' }
                    : { background: 'rgba(196,112,78,0.08)', color: '#7A5C45', border: '1px solid rgba(196,112,78,0.15)' }
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div
          className="overflow-y-auto flex-1 p-5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(196,112,78,0.3) transparent' }}
        >
          {upcomingEvents.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: '#A08060' }}>No hay eventos disponibles por el momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {showFeatured && <FeaturedEventCard event={featuredEvent!} onEventClick={onEventClick} />}

              {filteredOther.length > 0 && (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                  {filteredOther.map(event => (
                    <RegularEventCard key={event.id} event={event} onEventClick={onEventClick} />
                  ))}
                </div>
              )}

              {!showFeatured && filteredOther.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm" style={{ color: '#A08060' }}>No hay eventos en esta categoría.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-5 py-4 gap-4"
          style={{ borderTop: '1px solid rgba(196,112,78,0.15)', background: 'rgba(196,112,78,0.03)' }}
        >
          <p className="text-xs" style={{ color: '#A08060' }}>
            {upcomingEvents.length} {upcomingEvents.length === 1 ? 'evento disponible' : 'eventos disponibles'}
          </p>
          <button
            className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: '#3D2410', color: '#FAF5EE' }}
            onClick={handleClose}
          >
            Ver todos los eventos
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook personalizado para detectar scroll y mostrar el bottom sheet
// Muestra el modal después de 5 segundos en la página de welcome
export const useScrollEventsTrigger = (enabled: boolean = true) => {
  const [shouldShowEvents, setShouldShowEvents] = useState(false);
  const hasShownRef = useRef(false);
  
  useEffect(() => {
    if (!enabled || hasShownRef.current) return;
    
    // Simple: mostrar el modal después de 5 segundos
    const timer5Seconds = setTimeout(() => {
      if (!hasShownRef.current) {
        hasShownRef.current = true;
        setShouldShowEvents(true);
      }
    }, 5000);
    
    return () => {
      clearTimeout(timer5Seconds);
    };
  }, [enabled]);
  
  return { shouldShowEvents, setShouldShowEvents };
};
