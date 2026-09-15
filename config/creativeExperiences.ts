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
}

export interface CreativeCategory {
  id: CreativeCategoryId;
  label: string;
  subtitle: string;
}

export const CREATIVE_CATEGORIES: CreativeCategory[] = [
  { id: 'ceramics', label: 'Cerámica', subtitle: 'Pintar, modelar o torno. Para ti o con más gente.' },
  { id: 'charm_bar', label: 'Charm Bar', subtitle: 'Llaveros, pulseras, collares o cases. Para ti o un grupo.' },
  { id: 'tote_bag', label: 'Tote Bag', subtitle: 'Pintura o patches. Para ti o un grupo.' },
  { id: 'canvas', label: 'Canvas', subtitle: 'Pintura en lienzo. Para ti o un grupo.' },
  { id: 'brush', label: 'Cepillo', subtitle: 'Personaliza tu cepillo. Para ti o un grupo.' },
  { id: 'leather_journal', label: 'Leather Journal', subtitle: 'Grupos de 4 o más' },
];

const TABLE_MAX = 22;
const WHEEL_MAX = 8;

export const CREATIVE_SKUS: CreativeSku[] = [
  {
    id: 'ceramics_painting',
    categoryId: 'ceramics',
    label: 'Pintar piezas pre elaboradas',
    shortDesc: 'La pieza se elige en el taller.',
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
    shortDesc: 'Crea una pieza con tus manos.',
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
    shortDesc: 'Técnica en torno. Reserva anticipada.',
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
    shortDesc: 'Incluye 8 patches.',
    basePrice: 25,
    vatMode: 'plus',
    capacityTechnique: 'hand_modeling',
    minParticipants: 1,
    maxParticipants: TABLE_MAX,
    includesNote: 'Incluye 8 patches',
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
