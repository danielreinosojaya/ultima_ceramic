import { VAT_RATE } from '../constants';
import type { GroupTechnique } from '../types';

export type CreativeVatMode = 'included' | 'plus';
export type CreativeCategoryId =
  | 'ceramics'
  | 'charm_bar'
  | 'tote_bag'
  | 'canvas'
  | 'brush'
  | 'leather_journal';

export interface CreativeSku {
  id: string;
  categoryId: CreativeCategoryId;
  /** Nombre visible en reserva / admin */
  label: string;
  shortDesc?: string;
  description?: string;
  duration?: string;
  schedule?: string;
  recommendation?: string;
  important?: string;
  includes?: string;
  imageUrl?: string;
  basePrice: number;
  vatMode: CreativeVatMode;
  /** Cupo interno: torno vs mesa (sin técnicas nuevas) */
  capacityTechnique: GroupTechnique;
  minParticipants: number;
  maxParticipants: number;
  /** Prefijo de precio en UI, ej. "Desde" */
  pricePrefix?: 'desde';
  includesNote?: string;
  showsExtrasNote?: boolean;
  extrasNote?: string;
}

export interface CreativeCategory {
  id: CreativeCategoryId;
  label: string;
  subtitle: string;
  description: string;
  duration: string;
  schedule: string;
  recommendation?: string;
  important?: string;
  includes: string;
  imageUrl: string;
  extrasNote?: string;
}

export interface CreativeDisplay {
  label: string;
  description: string;
  duration: string;
  schedule: string;
  recommendation?: string;
  important?: string;
  includes: string;
  imageUrl: string;
  extrasNote?: string;
}

export const CATALOG_INTRO = {
  headline: 'Nuevas experiencias creativas',
  tagline: 'No necesitas experiencia previa, solo ganas de crear.',
  imageUrl: '/images/experiences/cover.jpg',
  location: 'Km 2,5 vía Samborondón · Sol Plaza, Local #7',
  instagram: '@ceramicalma.ec',
};

export const CREATIVE_CATEGORIES: CreativeCategory[] = [
  {
    id: 'ceramics',
    label: 'Cerámica',
    subtitle: 'Pintar, modelar o torno. Para ti o con más gente.',
    description:
      'Pintar una pieza pre elaborada, modelar con las manos o trabajar en torno. No necesitas experiencia previa.',
    duration: '1:30 a 2 horas',
    schedule: 'Walk-in o reserva, según la técnica',
    includes: 'Materiales, herramientas, guía y horneadas',
    imageUrl: '/images/experiences/ceramics-painting.jpg',
  },
  {
    id: 'charm_bar',
    label: 'Charm Bar',
    subtitle: 'Llaveros, pulseras, collares o cases. Para ti o un grupo.',
    description:
      'Explora el arte de combinar charms para crear composiciones únicas de llaveros, pulseras, collares o cases.',
    duration: '1 hora a 1:30',
    schedule: 'Walk-in o reserva',
    recommendation: 'Reserva anticipada para asegurar tu espacio',
    includes: 'Materiales, herramientas y guía inicial',
    extrasNote: 'Charms extra tienen valor adicional',
    imageUrl: '/images/experiences/charm-bar.jpg',
  },
  {
    id: 'tote_bag',
    label: 'Tote Bag',
    subtitle: 'Pintura o patches. Para ti o un grupo.',
    description:
      'Personaliza tu tote bag con diseños únicos y creativos, con pintura o estampado de patches, para darle estilo y originalidad.',
    duration: '1 a 2 horas',
    schedule: 'Walk-in o reserva',
    recommendation: 'Reserva anticipada para asegurar tu espacio',
    includes: '1 tote bag, pintura o 5 patches (iron-on)',
    extrasNote: 'Patches extra tienen valor adicional',
    imageUrl: '/images/experiences/tote-bag.jpg',
  },
  {
    id: 'canvas',
    label: 'Pintura en Canvas',
    subtitle: 'Pintura en lienzo. Para ti o un grupo.',
    description:
      'Una actividad para la que no necesitas conocimientos previos: solo dejar fluir el pincel, los colores y tu imaginación.',
    duration: '1 a 2 horas',
    schedule: 'Walk-in o reserva',
    recommendation: 'Reserva anticipada para asegurar tu espacio',
    includes: '1 canvas, caballete, inspiración, pinturas y pinceles',
    imageUrl: '/images/experiences/canvas.jpg',
  },
  {
    id: 'brush',
    label: 'Personalización de cepillo',
    subtitle: 'Personaliza tu cepillo. Para ti o un grupo.',
    description:
      'Diseña un cepillo único, con colores, texturas, diferentes acabados y tu estilo personal. Al finalizar lo sellamos para que quede brillante y duradero.',
    duration: '1 hora a 1:30',
    schedule: 'Walk-in o reserva',
    recommendation: 'Reserva anticipada para asegurar tu espacio',
    includes: '1 cepillo, pinturas, sellado y guía inicial',
    extrasNote: 'Charms extra tienen valor adicional',
    imageUrl: '/images/experiences/brush.jpg',
  },
  {
    id: 'leather_journal',
    label: 'Leather Journal',
    subtitle: 'Grupos de 4 o más',
    description:
      'Aprende a hacer tu leather journal para que sea creativo y reflexivo: un lugar para ideas, emociones y metas en papel.',
    duration: '2 a 3 horas',
    schedule: 'Reserva anticipada',
    important: 'Para grupos a partir de 4 personas',
    includes: 'Materiales de scrap (stickers, stencils, marcadores, cintas), herramientas y guía inicial',
    imageUrl: '/images/experiences/leather-journal.jpg',
  },
];

const TABLE_MAX = 22;
const WHEEL_MAX = 8;

export const CREATIVE_SKUS: CreativeSku[] = [
  {
    id: 'ceramics_painting',
    categoryId: 'ceramics',
    label: 'Pintar piezas pre elaboradas',
    shortDesc: 'Nuestra actividad más solicitada. La pieza se elige en el taller.',
    description:
      'Pintar piezas de cerámica pre elaboradas. Escoges tu diseño favorito: hay gran variedad de colores y profes listas para guiarte en cada detalle.',
    duration: '1:30 a 2 horas',
    schedule: 'Walk-in o reserva',
    important: 'Retiras tu obra lista en 7 días aprox.',
    includes: 'Pieza de cerámica, pinturas y horneadas',
    imageUrl: '/images/experiences/ceramics-painting.jpg',
    basePrice: 25,
    vatMode: 'included',
    capacityTechnique: 'painting',
    minParticipants: 1,
    maxParticipants: TABLE_MAX,
    pricePrefix: 'desde',
  },
  {
    id: 'ceramics_hand_modeling',
    categoryId: 'ceramics',
    label: 'Modelado a mano',
    shortDesc: 'Crea una pieza desde cero, solo con tus manos.',
    description:
      'Crear una pieza de cerámica desde cero, únicamente con tus manos, nuestra guía y tu inspiración. Taza, vaso, bowl, joyero, plato, portavelas, portalápices… y tu toque personal.',
    duration: '1:30 a 2 horas',
    schedule: 'Walk-in o reserva',
    important: 'Material de alta calidad, apto para alimentos, microondas, horno y lavavajilla.',
    includes: 'Pasta cerámica, brillo transparente, herramientas, horneadas y guía',
    imageUrl: '/images/experiences/ceramics-hand.jpg',
    basePrice: 40,
    vatMode: 'plus',
    capacityTechnique: 'hand_modeling',
    minParticipants: 1,
    maxParticipants: TABLE_MAX,
  },
  {
    id: 'ceramics_potters_wheel',
    categoryId: 'ceramics',
    label: 'Torno alfarero',
    shortDesc: 'Transforma la arcilla en una pieza única.',
    description:
      'Transformar la arcilla en una pieza única, mientras conectas con el momento presente y tus sentidos. Una experiencia de mindfulness, creatividad y disfrute.',
    duration: '2 horas',
    schedule: 'Reserva anticipada',
    important: 'Material de alta calidad, apto para alimentos, microondas, horno y lavavajilla.',
    includes: 'Pasta cerámica, brillo transparente, herramientas, horneadas y guía',
    imageUrl: '/images/experiences/ceramics-wheel.jpg',
    basePrice: 50,
    vatMode: 'plus',
    capacityTechnique: 'potters_wheel',
    minParticipants: 1,
    maxParticipants: WHEEL_MAX,
  },
  {
    id: 'charm_keychain',
    categoryId: 'charm_bar',
    label: 'Charm Bar · Llavero',
    shortDesc: 'Arma tu llavero con charms.',
    description: 'Combina charms para crear un llavero único.',
    basePrice: 25,
    vatMode: 'plus',
    capacityTechnique: 'hand_modeling',
    minParticipants: 1,
    maxParticipants: TABLE_MAX,
    showsExtrasNote: true,
  },
  {
    id: 'charm_bracelet',
    categoryId: 'charm_bar',
    label: 'Charm Bar · Pulsera',
    shortDesc: 'Arma tu pulsera con charms.',
    description: 'Combina charms para crear una pulsera única.',
    basePrice: 25,
    vatMode: 'plus',
    capacityTechnique: 'hand_modeling',
    minParticipants: 1,
    maxParticipants: TABLE_MAX,
    showsExtrasNote: true,
  },
  {
    id: 'charm_necklace',
    categoryId: 'charm_bar',
    label: 'Charm Bar · Collar',
    shortDesc: 'Arma tu collar con charms.',
    description: 'Combina charms para crear un collar único.',
    basePrice: 32,
    vatMode: 'plus',
    capacityTechnique: 'hand_modeling',
    minParticipants: 1,
    maxParticipants: TABLE_MAX,
    showsExtrasNote: true,
  },
  {
    id: 'charm_case',
    categoryId: 'charm_bar',
    label: 'Charm Bar · Case',
    shortDesc: 'Personaliza tu case con charms.',
    description: 'Combina charms para personalizar tu case.',
    basePrice: 40,
    vatMode: 'plus',
    capacityTechnique: 'hand_modeling',
    minParticipants: 1,
    maxParticipants: TABLE_MAX,
    showsExtrasNote: true,
  },
  {
    id: 'tote_paint',
    categoryId: 'tote_bag',
    label: 'Tote Bag · Pintura',
    shortDesc: 'Personaliza tu tote con pintura.',
    description: 'Personaliza tu tote bag con pintura y diseños únicos.',
    includes: '1 tote bag, pintura y guía inicial',
    basePrice: 25,
    vatMode: 'plus',
    capacityTechnique: 'hand_modeling',
    minParticipants: 1,
    maxParticipants: TABLE_MAX,
    showsExtrasNote: true,
  },
  {
    id: 'tote_patches',
    categoryId: 'tote_bag',
    label: 'Tote Bag · Patches',
    shortDesc: 'Incluye 5 patches iron-on.',
    description: 'Personaliza tu tote bag con estampado de patches iron-on.',
    includes: '1 tote bag y 5 patches (iron-on)',
    includesNote: 'Incluye 5 patches',
    basePrice: 25,
    vatMode: 'plus',
    capacityTechnique: 'hand_modeling',
    minParticipants: 1,
    maxParticipants: TABLE_MAX,
    showsExtrasNote: true,
  },
  {
    id: 'canvas',
    categoryId: 'canvas',
    label: 'Pintura en Canvas',
    shortDesc: 'Lienzo, caballete y pinturas.',
    basePrice: 25,
    vatMode: 'plus',
    capacityTechnique: 'hand_modeling',
    minParticipants: 1,
    maxParticipants: TABLE_MAX,
  },
  {
    id: 'brush',
    categoryId: 'brush',
    label: 'Personalización de cepillo',
    shortDesc: 'Diseña y sella tu cepillo.',
    basePrice: 25,
    vatMode: 'plus',
    capacityTechnique: 'hand_modeling',
    minParticipants: 1,
    maxParticipants: TABLE_MAX,
    showsExtrasNote: true,
  },
  {
    id: 'leather_journal',
    categoryId: 'leather_journal',
    label: 'Leather Journal',
    shortDesc: 'Mínimo 4 personas por grupo.',
    basePrice: 45,
    vatMode: 'plus',
    capacityTechnique: 'hand_modeling',
    minParticipants: 4,
    maxParticipants: 22,
  },
];

/** Primera pantalla: cada experiencia del catálogo, no un bloque genérico de cerámica. */
export type CatalogHomeItem =
  | { type: 'sku'; skuId: string }
  | { type: 'category'; categoryId: CreativeCategoryId };

export const CATALOG_HOME_ITEMS: CatalogHomeItem[] = [
  { type: 'sku', skuId: 'ceramics_painting' },
  { type: 'sku', skuId: 'ceramics_potters_wheel' },
  { type: 'sku', skuId: 'ceramics_hand_modeling' },
  { type: 'category', categoryId: 'charm_bar' },
  { type: 'category', categoryId: 'canvas' },
  { type: 'category', categoryId: 'tote_bag' },
  { type: 'category', categoryId: 'brush' },
  { type: 'category', categoryId: 'leather_journal' },
];

export function getCreativeCategory(id: CreativeCategoryId): CreativeCategory | undefined {
  return CREATIVE_CATEGORIES.find((c) => c.id === id);
}

export function getCategoryDisplay(category: CreativeCategory): CreativeDisplay {
  return {
    label: category.label,
    description: category.description,
    duration: category.duration,
    schedule: category.schedule,
    recommendation: category.recommendation,
    important: category.important,
    includes: category.includes,
    imageUrl: category.imageUrl,
    extrasNote: category.extrasNote,
  };
}

export function getSkuDisplay(sku: CreativeSku): CreativeDisplay {
  const category = getCreativeCategory(sku.categoryId);
  const fallback = category ? getCategoryDisplay(category) : undefined;
  return {
    label: sku.label,
    description: sku.description || sku.shortDesc || fallback?.description || '',
    duration: sku.duration || fallback?.duration || 'hasta 2 horas',
    schedule: sku.schedule || fallback?.schedule || 'Reserva',
    recommendation: sku.recommendation || fallback?.recommendation,
    important: sku.important || fallback?.important,
    includes: sku.includes || sku.includesNote || fallback?.includes || '',
    imageUrl: sku.imageUrl || fallback?.imageUrl || CATALOG_INTRO.imageUrl,
    extrasNote: sku.extrasNote || (sku.showsExtrasNote ? fallback?.extrasNote : undefined),
  };
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Precio unitario cobrado en la reserva (con IVA según modo). */
export function unitPriceCharged(sku: CreativeSku): number {
  if (sku.vatMode === 'included') return roundMoney(sku.basePrice);
  return roundMoney(sku.basePrice * (1 + VAT_RATE));
}

export function totalPriceCharged(sku: CreativeSku, participants: number): number {
  return roundMoney(unitPriceCharged(sku) * participants);
}

export function formatSkuPriceLabel(sku: CreativeSku): string {
  const unit = unitPriceCharged(sku);
  const perPerson = sku.maxParticipants > 1 ? ' / persona' : '';
  if (sku.vatMode === 'included') {
    const prefix = sku.pricePrefix === 'desde' ? 'Desde ' : '';
    return `${prefix}$${formatMoney(unit)} (IVA incluido)${perPerson}`;
  }
  return `$${formatMoney(sku.basePrice)} + IVA${perPerson}`;
}

export function formatMoney(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

export function skusForCategory(categoryId: CreativeCategoryId): CreativeSku[] {
  return CREATIVE_SKUS.filter((s) => s.categoryId === categoryId);
}

export function getCreativeSku(id: string): CreativeSku | undefined {
  return CREATIVE_SKUS.find((s) => s.id === id);
}

export function categoryNeedsOptionStep(categoryId: CreativeCategoryId): boolean {
  return skusForCategory(categoryId).length > 1;
}

/** Preguntar cuántas personas si se puede reservar más de una. */
export function skuNeedsParticipantsStep(sku: CreativeSku): boolean {
  return sku.maxParticipants > 1;
}
