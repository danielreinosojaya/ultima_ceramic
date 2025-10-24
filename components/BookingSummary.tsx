import React from 'react';
import type { BookingDetails, Product, AppData } from '../types.js';
import { CalendarIcon } from './icons/CalendarIcon.js';
import { DownloadIcon } from './icons/DownloadIcon.js';
// Eliminado useLanguage, la app ahora es monolingüe en español
import { InstructorTag } from './InstructorTag.js';
import { UserIcon } from './icons/UserIcon.js';
import { MailIcon } from './icons/MailIcon.js';
import { PhoneIcon } from './icons/PhoneIcon.js';
import { InfoCircleIcon } from './icons/InfoCircleIcon.js';
import { formatPrice } from '../utils/formatters';

interface BookingSummaryProps {
  bookingDetails: BookingDetails;
  onProceedToConfirmation: () => void;
  onBack: () => void;
  appData: AppData;
  onUseGiftcard?: (holdInfo: { holdId: string; expiresAt?: string; amount: number }) => void;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  bookingDetails,
  onProceedToConfirmation,
  onBack,
  appData,
  onUseGiftcard
}) => {
  // Eliminado useLanguage, la app ahora es monolingüe en español
  const language = 'es-ES';
  const { product, slots, userInfo } = bookingDetails;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return adjustedDate.toLocaleDateString(language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const sortedSlots = [...slots].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    return a.time.localeCompare(b.time);
  });

  return (
    <div className="p-8 bg-brand-surface rounded-xl shadow-subtle animate-fade-in-up max-w-2xl mx-auto">
      <button onClick={onBack} className="text-brand-secondary hover:text-brand-text mb-4 transition-colors font-semibold">
        &larr; Editar Selección
      </button>
      <div className="text-center">
        <h2 className="text-3xl font-semibold text-brand-text mb-2">Resumen de la Reserva</h2>
        <p className="text-brand-secondary mb-8">Por favor, revisa tu selección antes de confirmar.</p>
      </div>

      <div className="bg-brand-background rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-brand-text border-b border-brand-border pb-2 mb-4">Torno Alfarero</h3>
          <div className="flex justify-between items-center text-lg">
            <span className="text-brand-secondary">{slots.length} Clases</span>
            <span className="font-bold text-brand-text">${formatPrice(product.price)}</span>
          </div>
      </div>

      {userInfo && (
        <div className="bg-brand-background rounded-lg p-6 mb-6 animate-fade-in">
          <h3 className="text-xl font-bold text-brand-text border-b border-brand-border pb-2 mb-4">Datos del cliente</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center"><UserIcon className="w-4 h-4 mr-3 text-brand-secondary" /> {userInfo.firstName} {userInfo.lastName}</div>
            <div className="flex items-center"><MailIcon className="w-4 h-4 mr-3 text-brand-secondary" /> {userInfo.email}</div>
            <div className="flex items-center"><PhoneIcon className="w-4 h-4 mr-3 text-brand-secondary" /> {userInfo.countryCode} {userInfo.phone}</div>
          </div>
        </div>
      )}

      {slots && slots.length > 0 && (
        <div className="bg-brand-background rounded-lg p-6">
          <h3 className="text-xl font-bold text-brand-text border-b border-brand-border pb-2 mb-4">Horario Seleccionado</h3>
          <ul className="space-y-2">
            {sortedSlots.map((slot, index) => (
              <li key={index} className="flex items-center text-brand-text py-2">
                <CalendarIcon className="w-5 h-5 mr-4 text-brand-secondary flex-shrink-0" />
                <div className="flex-grow flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{formatDate(slot.date)}</p>
                    <p className="text-sm text-brand-secondary">{slot.time}</p>
                  </div>
                  <InstructorTag instructorId={slot.instructorId} instructors={appData.instructors} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-4 justify-center">
        {/* Giftcard redeem UI */}
        <GiftcardRedeemSection product={product} onUseGiftcard={onUseGiftcard} />
        <button
          onClick={onProceedToConfirmation}
          className="w-full md:w-auto bg-brand-primary text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity duration-300"
        >
          Continuar a Confirmación
        </button>
      </div>
    </div>
  );
};

// Small internal component to redeem a giftcard and create a hold
const GiftcardRedeemSection: React.FC<{ product: Product; onUseGiftcard?: (holdInfo: { holdId: string; expiresAt?: string; amount: number }) => void }> = ({ product, onUseGiftcard }) => {
  const [code, setCode] = React.useState('');
  const [checking, setChecking] = React.useState(false);
  const [giftcardInfo, setGiftcardInfo] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [creatingHold, setCreatingHold] = React.useState(false);

  const handleValidate = async () => {
    setChecking(true);
    setError(null);
    try {
      // Dynamically import dataService to avoid circular imports in some build setups
      const ds = await import('../services/dataService');
      const res = await ds.validateGiftcard(code.trim());
      if (res && (res.valid === true || res.valid === false)) {
        setGiftcardInfo(res);
      } else if (res && res.reason === 'request_found') {
        setGiftcardInfo(res);
      } else {
        setError('Giftcard no encontrada');
        setGiftcardInfo(null);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
      setGiftcardInfo(null);
    } finally {
      setChecking(false);
    }
  };

  const handleUse = async () => {
    if (!giftcardInfo) return;
    setCreatingHold(true);
    setError(null);
    try {
      const ds = await import('../services/dataService');
      const amount = Math.min(Number(product.price || 0), Number(giftcardInfo.balance || 0));
      const payload: any = { amount, ttlMinutes: 15 };
      if (giftcardInfo.giftcardId) payload.giftcardId = giftcardInfo.giftcardId;
      else payload.code = giftcardInfo.code || code.trim();

      const res = await ds.createGiftcardHold(payload);
      if (res && res.success && res.hold) {
        onUseGiftcard && onUseGiftcard({ holdId: res.hold.id, expiresAt: res.hold.expires_at, amount: Number(res.hold.amount) });
      } else {
        setError(res?.error || 'No se pudo crear el hold');
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setCreatingHold(false);
    }
  };

  // Create a hold using an issuedCode returned inside a request response
  const handleUseIssuedCode = async (issuedCode: string) => {
    if (!issuedCode) return;
    setCreatingHold(true);
    setError(null);
    try {
      const ds = await import('../services/dataService');
      const amount = Math.min(Number(product.price || 0), Number(giftcardInfo?.balance || 0) || Number(product.price || 0));
      const payload: any = { amount, ttlMinutes: 15, code: issuedCode };
      const res = await ds.createGiftcardHold(payload);
      if (res && res.success && res.hold) {
        onUseGiftcard && onUseGiftcard({ holdId: res.hold.id, expiresAt: res.hold.expires_at, amount: Number(res.hold.amount) });
      } else {
        setError(res?.error || 'No se pudo crear el hold con el código emitido');
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setCreatingHold(false);
    }
  };

  return (
    <div className="w-full max-w-xl bg-white/60 border border-dashed border-brand-border p-4 rounded-lg mb-4">
      <h4 className="font-semibold mb-2">Pagar con Giftcard</h4>
      <div className="flex gap-2 items-center">
        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ingresa código de giftcard" className="flex-grow px-3 py-2 border rounded" />
        <button onClick={handleValidate} disabled={!code || checking} className="bg-brand-primary text-white px-4 py-2 rounded">{checking ? 'Verificando…' : 'Validar'}</button>
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {giftcardInfo && (
        <div className="mt-3 text-sm text-brand-secondary">
          {giftcardInfo.valid ? (
            <>
              <div>Saldo disponible: <span className="font-bold text-brand-text">${giftcardInfo.balance}</span></div>
              <div>Válida hasta: <span className="font-medium">{giftcardInfo.expiresAt || '—'}</span></div>
              <div className="mt-2">
                <button onClick={handleUse} disabled={creatingHold || Number(giftcardInfo.balance) <= 0} className="bg-green-600 text-white px-3 py-2 rounded">Usar giftcard</button>
              </div>
            </>
          ) : (
            <div>
              {/* Friendly handling for request cases */}
              {giftcardInfo.reason === 'approved_request_has_issued_code' ? (
                <div>
                  <div className="mb-2">Tu solicitud fue aprobada. Código emitido: <span className="font-mono font-semibold">{giftcardInfo.issuedCode}</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => { setCode(giftcardInfo.issuedCode); handleUseIssuedCode(giftcardInfo.issuedCode); }} disabled={creatingHold} className="bg-green-600 text-white px-3 py-2 rounded">Usar código emitido</button>
                    <button onClick={() => { navigator.clipboard?.writeText(giftcardInfo.issuedCode); alert('Código copiado'); }} className="px-3 py-2 border rounded">Copiar</button>
                  </div>
                </div>
              ) : giftcardInfo.reason === 'request_found' && giftcardInfo.request ? (
                <div>
                  <div className="mb-1">Se encontró una solicitud con estado: <strong>{giftcardInfo.request.status}</strong></div>
                  {giftcardInfo.request.metadata && (giftcardInfo.request.metadata.issuedCode || giftcardInfo.request.metadata.issued_code) ? (
                    <div className="mt-2">
                      <div className="mb-1">Código emitido en la solicitud: <span className="font-mono">{giftcardInfo.request.metadata.issuedCode || giftcardInfo.request.metadata.issued_code}</span></div>
                      <div className="flex gap-2">
                        <button onClick={() => { const issued = giftcardInfo.request.metadata.issuedCode || giftcardInfo.request.metadata.issued_code; setCode(issued); handleUseIssuedCode(issued); }} disabled={creatingHold} className="bg-green-600 text-white px-3 py-2 rounded">Usar código emitido</button>
                        <button onClick={() => { const issued = giftcardInfo.request.metadata.issuedCode || giftcardInfo.request.metadata.issued_code; navigator.clipboard?.writeText(issued); alert('Código copiado'); }} className="px-3 py-2 border rounded">Copiar</button>
                      </div>
                    </div>
                  ) : (
                    <div>Estado de la solicitud: <strong>{giftcardInfo.request.status}</strong></div>
                  )}
                </div>
              ) : (
                <div>Giftcard no válida: {giftcardInfo.reason || '—'}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};