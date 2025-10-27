import React from 'react';
import type { ClassPackage, TimeSlot, Product, BookingMode } from '../types';
// Eliminado useLanguage, la app ahora es monolingüe en español
import { CalendarIcon } from './icons/CalendarIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SINGLE_CLASS_PRICE, VAT_RATE } from '../constants';

interface BookingSidebarProps {
  product: Product;
  selectedSlots: TimeSlot[];
  onRemoveSlot: (slot: TimeSlot) => void;
  onConfirm: () => void;
  bookingMode?: BookingMode;
}

export const BookingSidebar: React.FC<BookingSidebarProps> = ({ product, selectedSlots, onRemoveSlot, onConfirm, bookingMode }) => {
  // Eliminado useLanguage, la app ahora es monolingüe en español
  const language = 'es-ES';

  // Validación defensiva: normalizar price
  let safeProduct = { ...product };
  if ('price' in safeProduct) {
    safeProduct.price = typeof (safeProduct as any).price === 'number' ? (safeProduct as any).price : parseFloat((safeProduct as any).price) || 0;
  }

 if (safeProduct.type !== 'CLASS_PACKAGE') {
  return null; // This sidebar is only for class packages
}

// Type cast seguro
const pkg = safeProduct as ClassPackage;

// Calcula las variables necesarias usando `pkg`
const classesRemaining = pkg.classes - selectedSlots.length;
const originalPrice = pkg.classes * SINGLE_CLASS_PRICE;
const discount = originalPrice - pkg.price;
const subtotal = pkg.price / (1 + VAT_RATE);
const vat = pkg.price - subtotal;

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
  return adjustedDate.toLocaleDateString(language, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  });
};

return (
  <div className="bg-brand-background p-6 rounded-lg sticky top-24 h-fit">
    <h3 className="text-xl font-serif text-brand-text mb-1">Resumen de compra</h3>
    <div className="border-t border-brand-border pt-4">
      <div className="space-y-3 mb-4 text-sm">
        <h4 className="font-bold text-brand-text text-base">{pkg.name}</h4>            
            {/* Savings Breakdown */}
            <div className="space-y-1">
                <div className="flex justify-between">
                    <span className="text-brand-secondary">Precio original ({pkg.classes} x ${SINGLE_CLASS_PRICE})</span>
                    <span className="text-brand-secondary line-through">${originalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-brand-success font-semibold">Descuento de paquete</span>
                    <span className="text-brand-success font-semibold">-${(originalPrice - subtotal).toFixed(2)}</span>
                </div>
            </div>

            {/* Final Price Breakdown */}
            <div className="space-y-1 border-t border-brand-border pt-2 mt-2">
                 <div className="flex justify-between">
                    <span className="text-brand-secondary">Subtotal</span>
                    <span className="text-brand-secondary">${subtotal.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-brand-secondary">IVA</span>
                    <span className="text-brand-secondary">${vat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-brand-text pt-1 mt-1">
                    <span>Total a pagar</span>
                    <span>${price.toFixed(2)}</span>
                    <span>
                      {typeof pkg.price === 'number' && !isNaN(pkg.price)
                        ? `$${pkg.price.toFixed(2)}`
                        : (() => { console.error('BookingSidebar: pkg.price inválido', pkg); return '---'; })()}
                    </span>
                </div>
            </div>
        </div>

        <div className="mb-4">
            <p className={`text-sm font-bold ${classesRemaining === 0 ? 'text-brand-success' : 'text-brand-text'}`}>
            {classesRemaining > 0
              ? `Te faltan ${classesRemaining} clases por seleccionar`
              : 'Todas las clases seleccionadas'
            }
            </p>
        </div>

        <div className="space-y-2 min-h-[50px]">
            {selectedSlots.map((slot, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-2 rounded-md animate-fade-in-fast">
                    <div>
                        <p className="text-sm font-semibold text-brand-text">{formatDate(slot.date)}</p>
                        <p className="text-xs text-brand-secondary">{slot.time}</p>
                    </div>
                    {bookingMode !== 'monthly' && (
                        <button onClick={() => onRemoveSlot(slot)} className="p-1 text-brand-secondary hover:text-red-500">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ))}
        </div>
        
        <button
          onClick={onConfirm}
          disabled={classesRemaining > 0}
          className="mt-6 w-full bg-brand-primary text-white font-bold py-3 px-6 rounded-lg disabled:bg-stone-400 disabled:cursor-not-allowed hover:bg-brand-text transition-colors duration-300"
        >
          {`Confirmar (${selectedSlots.length}/${pkg.classes})`}
        </button>
      </div>
    </div>
  );
};
