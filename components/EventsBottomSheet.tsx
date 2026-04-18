import React, { useEffect, useState, useRef } from 'react';
import {
  SparklesIcon,
  XMarkIcon,
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

type EventCategory = 'experience' | 'course' | 'workshop' | 'open-studio';

interface SpecialEvent {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  duration: string;
  spots: number;
  spotsLeft: number;
  category: EventCategory;
  description: string;
  image: string;
  price: string;
  eventDate: string; // ISO format: YYYY-MM-DD
  url?: string;
  hideReserveButton?: boolean;
  hideAvailableSpots?: boolean;
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
    id: 'popup-coffee-crew-17-abr',
    title: 'Pop Up x Coffee Crew',
    subtitle: 'Entrada libre · Viernes 17 de abril',
    date: 'Viernes, 17 Abril',
    time: '15:00',
    duration: '5 horas',
    spots: 50,
    spotsLeft: 50,
    category: 'experience',
    description: 'Una tarde especial con Coffee Crew en el estudio. Ven a explorar nuestra cerámica mientras disfrutas de un buen café. Entrada completamente libre.',
    image: '/images/events/coffee-crew.jpg',
    price: 'Entrada libre',
    eventDate: '2026-04-17',
    url: 'https://www.instagram.com/p/DWzoajwDltY/?img_index=1',
    hideReserveButton: true,
    hideAvailableSpots: true,
  },
  {
    id: 'aceites-esenciales-19-abr',
    title: 'Cerámica y Aceites Esenciales',
    subtitle: 'x Pura Essence · Domingo 19 de abril',
    date: 'Domingo, 19 Abril',
    time: '10:00',
    duration: '2 horas',
    spots: 12,
    spotsLeft: 8,
    category: 'workshop',
    description: 'Un taller sensorial donde la cerámica se fusiona con los aceites esenciales de Pura Essence y Aceites Esenciales Ecuador. Una experiencia única para cuerpo y mente.',
    image: '/images/events/aceites-esenciales.jpg',
    price: '$50 por persona',
    eventDate: '2026-04-19',
    url: 'https://www.instagram.com/p/DW6c8SAje2i/?img_index=1',
  },
  {
    id: 'flores-eternas-mama-29-abr',
    title: 'Flores Eternas para Mamá',
    subtitle: 'Taller especial · Miércoles 29 de abril',
    date: 'Miércoles, 29 Abril',
    time: '10:00',
    duration: '2 horas',
    spots: 14,
    spotsLeft: 10,
    category: 'workshop',
    description: 'Crea flores eternas en cerámica como el regalo perfecto para el Día de la Madre. Disponible individual o en pareja, una experiencia llena de amor y creatividad.',
    image: '/images/events/flores-eternas.jpg',
    price: 'Desde $70',
    eventDate: '2026-04-29',
  },
  {
    id: 'spill-the-tea-rum-30-abr',
    title: 'Spill the Tea x Rum-Com Club',
    subtitle: 'Colab especial · Jueves 30 de abril',
    date: 'Jueves, 30 Abril',
    time: '17:00',
    duration: '2 horas',
    spots: 20,
    spotsLeft: 15,
    category: 'experience',
    description: 'Una tarde de conversaciones, cerámica y buena vibra junto al Rum-Com Club. Una colab que no te puedes perder.',
    image: '/images/events/spill-the-tea.jpg',
    price: '$45 por persona',
    eventDate: '2026-04-30',
    url: 'https://www.instagram.com/p/DXSJwN_jp_G/',
  },
  {
    id: 'modelado-jaime-1-may',
    title: 'Workshop Modelado a Mano',
    subtitle: 'Con Jaime Aldas de PÁRAMO · Viernes 1 de mayo',
    date: 'Viernes, 1 Mayo',
    time: '17:00',
    duration: '3 horas',
    spots: 10,
    spotsLeft: 6,
    category: 'workshop',
    description: 'Aprende las técnicas de modelado a mano con el reconocido ceramista Jaime Aldas del colectivo PÁRAMO. Una oportunidad única de aprender de un maestro.',
    image: '/images/events/modelado-jaime.jpg',
    price: '$85 por persona',
    eventDate: '2026-05-01',
  },
  {
    id: 'torno-jaime-3-may',
    title: 'Workshop Torno Alfarero',
    subtitle: 'Con Jaime Aldas de PÁRAMO · Domingo 3 de mayo',
    date: 'Domingo, 3 Mayo',
    time: '14:00',
    duration: '3 horas',
    spots: 8,
    spotsLeft: 5,
    category: 'workshop',
    description: 'Domina el torno alfarero guiado por Jaime Aldas de PÁRAMO. Grupos reducidos para un aprendizaje profundo e íntimo con la arcilla.',
    image: '/images/events/torno-alfarero.jpg',
    price: '$120 por persona',
    eventDate: '2026-05-03',
  },
];

// ── Helper: Calcula el evento más próximo (para featured dinámico) ────────────
function getNextUpcomingEvent(events: SpecialEvent[]): SpecialEvent | undefined {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filtrar solo eventos futuros o de hoy
  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.eventDate);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today;
  });
  
  if (upcomingEvents.length === 0) return undefined;
  
  // Retornar el evento con la fecha más cercana
  return upcomingEvents.reduce((closest, current) => {
    const currentDate = new Date(current.eventDate);
    const closestDate = new Date(closest.eventDate);
    return currentDate < closestDate ? current : closest;
  });
}

// ── Featured Event Card ────────────────────────────────────────────────────────
function FeaturedEventCard({ event }: { event: SpecialEvent }) {
  const spotsPercent = ((event.spots - event.spotsLeft) / event.spots) * 100;
  const isAlmostFull = event.spotsLeft <= 3;
  const catColor = categoryColors[event.category];

  const handleClick = () => {
    if (event.url) window.open(event.url, '_blank');
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
          {isAlmostFull && (
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(196,112,78,0.2)', color: '#E8956B', border: '1px solid rgba(196,112,78,0.4)' }}
            >
              Solo {event.spotsLeft} lugares
            </span>
          )}
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
            {!event.hideAvailableSpots && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(250,245,238,0.8)' }}>
                <UsersIcon className="w-3.5 h-3.5" />
                <span>{event.spotsLeft} lugares disponibles</span>
              </div>
            )}
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

          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(250,245,238,0.5)' }}>
              <span>Disponibilidad</span>
              <span>{Math.round(spotsPercent)}% ocupado</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(250,245,238,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${spotsPercent}%`, background: isAlmostFull ? '#C4704E' : '#6B8C6B' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Regular Event Card ─────────────────────────────────────────────────────────
function RegularEventCard({ event }: { event: SpecialEvent }) {
  const isAlmostFull = event.spotsLeft <= 3;
  const catColor = categoryColors[event.category];

  const handleClick = () => {
    if (event.url) window.open(event.url, '_blank');
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
          {event.description.length > 80 ? event.description.substring(0, 80) + '...' : event.description}
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
          {isAlmostFull && (
            <span className="text-xs font-medium" style={{ color: '#C4704E' }}>
              Solo {event.spotsLeft} lugares
            </span>
          )}
          <button
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: 'rgba(196,112,78,0.12)', color: '#C4704E', border: '1px solid rgba(196,112,78,0.3)' }}
          >
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main EventsBottomSheet ─────────────────────────────────────────────────────
export const EventsBottomSheet: React.FC<EventsBottomSheetProps> = ({
  isOpen,
  onClose,
}) => {
  const [visible, setVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const sheetRef = useRef<HTMLDivElement>(null);

  // Evento más próximo (dinámico) será el featured
  const featuredEvent = getNextUpcomingEvent(SPECIAL_EVENTS);
  const otherEvents = SPECIAL_EVENTS.filter(e => !featuredEvent || e.id !== featuredEvent.id);

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
          {SPECIAL_EVENTS.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: '#A08060' }}>No hay eventos disponibles por el momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {showFeatured && <FeaturedEventCard event={featuredEvent!} />}

              {filteredOther.length > 0 && (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                  {filteredOther.map(event => (
                    <RegularEventCard key={event.id} event={event} />
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
            {SPECIAL_EVENTS.length} {SPECIAL_EVENTS.length === 1 ? 'evento disponible' : 'eventos disponibles'}
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
