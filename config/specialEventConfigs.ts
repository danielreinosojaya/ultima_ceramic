import type { Technique } from '../types';

export interface SpecialEventPricingOption {
  id: string;
  label: string;
  description?: string;
  price: number;
}

export interface SpecialEventPricingTier {
  presaleUntil: string; // YYYY-MM-DD inclusive
  presaleDeadlineLabel: string;
  presalePrice: number;
  regularPrice: number;
}

export interface SpecialEventConfig {
  slug: string;
  bookingSource: string;
  title: string;
  subtitle: string;
  tagline: string;
  image: string;
  dateLabel: string;
  timeLabel: string;
  eventDate: string;
  eventTime: string;
  duration: string;
  technique: Technique;
  techniqueLabel: string;
  adminCode: string;
  price?: number;
  pricingTier?: SpecialEventPricingTier;
  pricingOptions?: SpecialEventPricingOption[];
  includes: string[];
  scheduleNote?: string;
}

export const SPECIAL_EVENT_CONFIGS: Record<string, SpecialEventConfig> = {
  'desobedecer-al-dolor': {
    slug: 'desobedecer-al-dolor',
    bookingSource: 'desobedecer-al-dolor',
    title: 'Desobedecer al Dolor',
    subtitle: 'Experiencia de escritura, poesía y cerámica',
    tagline:
      'Con la guía de Mayi Gómez y Carolina Massuh, transitamos recuerdos y emociones para canalizarlas por medio de la escritura y la cerámica.',
    image: '/images/events/desobedecer.png',
    dateLabel: 'Jueves, 16 Julio 2026',
    timeLabel: '10:00 – 13:00',
    eventDate: '2026-07-16',
    eventTime: '10:00',
    duration: '3 horas',
    technique: 'hand_modeling',
    techniqueLabel: 'Escritura y cerámica',
    adminCode: 'DESOBEDECER2026',
    pricingTier: {
      presaleUntil: '2026-07-11',
      presaleDeadlineLabel: '11 de julio',
      presalePrice: 55,
      regularPrice: 65,
    },
    includes: [
      'Meditación con aceites esenciales',
      'Materiales incluidos',
      'Guía personalizada',
      'Coffee break',
    ],
  },
  'huella-mascota': {
    slug: 'huella-mascota',
    bookingSource: 'huella-mascota',
    title: 'Una Huella que Queda para Siempre',
    subtitle: 'Experiencia especial con tu mascota',
    tagline:
      'Plasma la huella de tu compañero de cuatro patas en arcilla y crea un recuerdo único con su nombre, fecha y detalles especiales.',
    image: '/images/events/perrito.png',
    dateLabel: 'Martes, 21 Julio 2026',
    timeLabel: '10:00 – 18:00',
    eventDate: '2026-07-21',
    eventTime: '10:00',
    duration: 'Horario flexible',
    technique: 'hand_modeling',
    techniqueLabel: 'Huella en arcilla',
    adminCode: 'HUELLA2026',
    scheduleNote: 'Puedes llegar en cualquier momento entre las 10:00 y las 18:00.',
    pricingOptions: [
      {
        id: '1-huella',
        label: '1 huella',
        description: 'Una huella en arcilla personalizada',
        price: 45,
      },
      {
        id: '2-huellas',
        label: '2 huellas',
        description: 'Dos huellas (o dos perritos)',
        price: 55,
      },
    ],
    includes: [
      'Huella en arcilla personalizada',
      'Nombre, fecha y detalles especiales',
      'Spot de fotos con tu mascota',
      'Marcas auspiciantes y regalitos',
    ],
  },
};

export function getSpecialEventConfig(slug: string): SpecialEventConfig | undefined {
  return SPECIAL_EVENT_CONFIGS[slug];
}

export function getSpecialEventPricing(
  config: SpecialEventConfig,
  now: Date = new Date()
): {
  price: number;
  tier: 'presale' | 'regular';
  tierLabel: string;
  pricingNote?: string;
} {
  if (config.pricingTier) {
    const presaleEnd = new Date(`${config.pricingTier.presaleUntil}T23:59:59`);
    const isPresale = now <= presaleEnd;

    if (isPresale) {
      const { presaleDeadlineLabel, presalePrice, regularPrice } = config.pricingTier;
      return {
        price: presalePrice,
        tier: 'presale',
        tierLabel: `Preventa hasta el ${presaleDeadlineLabel}`,
        pricingNote: `Precio preventa de $${presalePrice} válido hasta el ${presaleDeadlineLabel} inclusive. Desde el 12 de julio el precio será $${regularPrice}.`,
      };
    }

    return {
      price: config.pricingTier.regularPrice,
      tier: 'regular',
      tierLabel: 'Precio regular',
      pricingNote: `Preventa finalizada. Precio actual: $${config.pricingTier.regularPrice} por persona.`,
    };
  }

  if (config.price != null) {
    return { price: config.price, tier: 'regular', tierLabel: 'Precio' };
  }

  return { price: 0, tier: 'regular', tierLabel: '' };
}

export function getSpecialEventPriceLabel(config: SpecialEventConfig): string {
  const { price, tier, tierLabel } = getSpecialEventPricing(config);
  if (tier === 'presale') {
    return `$${price} · ${tierLabel}`;
  }
  return `$${price} por persona`;
}

export function getSpecialEventDisplayName(bookingSource: string): string | undefined {
  return SPECIAL_EVENT_CONFIGS[bookingSource]?.title;
}
