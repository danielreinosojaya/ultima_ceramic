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
import { CheckCircleIcon } from './icons/CheckCircleIcon.js';
import { formatPrice } from '../utils/formatters';

interface BookingSummaryProps {
  bookingDetails: BookingDetails;
  onProceedToConfirmation: () => void;
  onBack: () => void;
  appData: AppData;
  onUseGiftcard?: (holdInfo: { holdId?: string; expiresAt?: string; amount: number; giftcardId?: string; code?: string } | null) => void;
  activeGiftcardHold?: { holdId?: string; expiresAt?: string; amount: number; giftcardId?: string; code?: string } | null;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  bookingDetails,
  onProceedToConfirmation,
  onBack,
  appData,
  onUseGiftcard,
  activeGiftcardHold
}) => {
  // Eliminado useLanguage, la app ahora es monolingüe en español
  const language = 'es-ES';
  const { product, slots, userInfo } = bookingDetails;
  
    // --- INTEGRACIÓN GIFT CARD ---
    const renderGiftcardBadge = (hold: any) => {
      if (hold && (hold.amount || hold.giftcardId)) {
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 ml-2">
            Giftcard: ${hold.amount}
            {hold.giftcardId ? ` · ID:${hold.giftcardId}` : ''}
          </span>
        );
      }
      return null;
    };
    // Modal de auditoría de giftcard
    const [showGiftcardAudit, setShowGiftcardAudit] = React.useState(false);
    const handleOpenAudit = () => setShowGiftcardAudit(true);
    const handleCloseAudit = () => setShowGiftcardAudit(false);
    // Simulación de datos de auditoría (reemplazar por fetch real si aplica)
    const giftcardAuditData = activeGiftcardHold ? [{
      fecha: '2024-06-01',
      accion: 'Reserva creada',
      monto: activeGiftcardHold.amount,
      id: activeGiftcardHold.giftcardId || activeGiftcardHold.code
    }] : [];
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
        <GiftcardRedeemSection product={product} onUseGiftcard={onUseGiftcard} activeGiftcardHold={activeGiftcardHold} />
          {/* Visualización robusta de giftcard */}
          {activeGiftcardHold && renderGiftcardBadge(activeGiftcardHold)}
        {activeGiftcardHold && (
          <button onClick={handleOpenAudit} className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 ml-2 shadow transition" title="Ver auditoría de giftcard">
            Auditoría Giftcard
          </button>
        )}
        {/* Modal auditoría giftcard */}
        {showGiftcardAudit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full relative">
              <button onClick={handleCloseAudit} className="absolute top-4 right-4 text-gray-500 hover:text-brand-primary text-xl">×</button>
              <h3 className="text-2xl font-bold mb-4 text-brand-text">Auditoría de Giftcard</h3>
              {giftcardAuditData.length > 0 ? (
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-2">Fecha</th>
                      <th className="text-left py-2 px-2">Acción</th>
                      <th className="text-left py-2 px-2">Monto</th>
                      <th className="text-left py-2 px-2">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giftcardAuditData.map((row, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2 px-2">{row.fecha}</td>
                        <td className="py-2 px-2">{row.accion}</td>
                        <td className="py-2 px-2">${row.monto}</td>
                        <td className="py-2 px-2">{row.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-brand-secondary">No hay movimientos registrados.</div>
              )}
              <button onClick={handleCloseAudit} className="mt-4 px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-secondary">Cerrar</button>
            </div>
          </div>
        )}
        {activeGiftcardHold && (Number(activeGiftcardHold.amount || 0) >= Number(product.price || 0)) ? (
          <div className="w-full md:w-auto flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full font-bold">
              <CheckCircleIcon className="w-5 h-5" />
              <span>Reserva pagada con Giftcard</span>
            </div>
            <button
              onClick={onProceedToConfirmation}
              className="w-full md:w-auto bg-brand-primary text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity duration-300"
            >
              Completar Reserva
            </button>
          </div>
        ) : (
          <button
            onClick={onProceedToConfirmation}
            className="w-full md:w-auto bg-brand-primary text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity duration-300"
          >
            Continuar a Confirmación
          </button>
        )}
      </div>
    </div>
  );
};

// Small internal component to redeem a giftcard and create a hold
const GiftcardRedeemSection: React.FC<{ product: Product; onUseGiftcard?: (holdInfo: { holdId?: string; expiresAt?: string; amount: number; giftcardId?: string; code?: string } | null) => void; activeGiftcardHold?: { holdId?: string; expiresAt?: string; amount: number; giftcardId?: string; code?: string } | null }> = ({ product, onUseGiftcard, activeGiftcardHold }) => {
  const [code, setCode] = React.useState('');
  const [checking, setChecking] = React.useState(false);
  const [giftcardInfo, setGiftcardInfo] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [creatingHold, setCreatingHold] = React.useState(false);
  const [manualHoldAmount, setManualHoldAmount] = React.useState<number | null>(null);
  const [appliedHold, setAppliedHold] = React.useState<{ holdId?: string; expiresAt?: string; amount: number; giftcardId?: string; code?: string } | null>(null);
  // Feedback visual inmediato tras aplicar saldo parcial
  const [justApplied, setJustApplied] = React.useState(false);

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

      // Re-validate to get most recent balance/available before attempting the hold
      const currentCode = giftcardInfo.giftcardId ? undefined : (giftcardInfo.code || code.trim());
      let latestInfo: any = giftcardInfo;
      try {
        if (currentCode) {
          const v = await ds.validateGiftcard(currentCode);
          if (v) latestInfo = v;
        } else if (giftcardInfo.giftcardId) {
          const maybeCode = giftcardInfo.code;
          if (maybeCode) {
            const v = await ds.validateGiftcard(maybeCode);
            if (v) latestInfo = v;
          }
        }
      } catch {
        // ignore validation errors and fallback to existing giftcardInfo
      }

      // Decide initial amount to attempt
      const desiredAmount = Math.min(Number(product.price || 0), Number(latestInfo.balance || 0));
      if (!desiredAmount || desiredAmount <= 0) {
        setError('Saldo disponible: 0 — no se puede aplicar la giftcard');
        setCreatingHold(false);
        return;
      }

      const payloadBase: any = { ttlMinutes: 15 };
      if (giftcardInfo.giftcardId) payloadBase.giftcardId = giftcardInfo.giftcardId;
      else payloadBase.code = latestInfo.code || code.trim();

      // Attempt to create hold for desired amount.
      const attemptCreate = async (amountToTry: number) => {
        const payload = { ...payloadBase, amount: amountToTry };
        const res = await ds.createGiftcardHold(payload);
        if (res && res.success && res.hold) {
          const holdInfo: any = { holdId: res.hold.id, expiresAt: res.hold.expires_at, amount: Number(res.hold.amount) };
          if (giftcardInfo?.giftcardId) holdInfo.giftcardId = giftcardInfo.giftcardId;
          if (giftcardInfo?.code) holdInfo.code = giftcardInfo.code || code.trim();
          setAppliedHold(holdInfo);
          onUseGiftcard && onUseGiftcard(holdInfo);
          return { ok: true, res };
        }
        return { ok: false, res };
      };

      const result = await attemptCreate(desiredAmount);
      if (result.ok) {
        setCreatingHold(false);
        return;
      }

      const res = result.res;
      if (res && res.error === 'insufficient_funds') {
        const available = typeof res.available === 'number' ? Number(res.available) : 0;
        if (available > 0) {
          setGiftcardInfo({ ...giftcardInfo, available });
          setError(null);
          setManualHoldAmount(available);
        } else {
          setGiftcardInfo({ ...giftcardInfo, available: available, locked: true, balance: Number(res.balance ?? giftcardInfo?.balance ?? 0) });
          // Clear, friendly message when balance > 0 but available == 0
          if (Number(res.balance ?? giftcardInfo?.balance ?? 0) > 0 && available === 0) {
            setError('Fondos bloqueados por otra reserva o uso simultáneo. Espera unos minutos o contacta soporte.');
          } else {
            setError(null);
          }
        }
      } else {
        setError(res?.error || res?.message || 'No se pudo crear el hold');
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setCreatingHold(false);
    }
  };

  // Apply a specific available amount as a hold
  const handleApplyAvailable = async (amount: number) => {
    if (!giftcardInfo) return;
    setCreatingHold(true);
    setError(null);
    try {
      const ds = await import('../services/dataService');
      const payload: any = { ttlMinutes: 15, amount };
      if (giftcardInfo.giftcardId) payload.giftcardId = giftcardInfo.giftcardId;
      else payload.code = giftcardInfo.code || code.trim();

      const res = await ds.createGiftcardHold(payload);
      if (res && res.success && res.hold) {
        const holdInfo: any = { holdId: res.hold.id, expiresAt: res.hold.expires_at, amount: Number(res.hold.amount) };
        if (giftcardInfo?.giftcardId) holdInfo.giftcardId = giftcardInfo.giftcardId;
        if (giftcardInfo?.code) holdInfo.code = giftcardInfo.code || code.trim();
        setAppliedHold(holdInfo);
        onUseGiftcard && onUseGiftcard(holdInfo);
        setJustApplied(true);
        // small visual feedback duration
        setTimeout(() => setJustApplied(false), 1800);
      } else {
        setError(res?.error || res?.message || 'No se pudo crear el hold');
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setCreatingHold(false);
    }
  };

  // Use an issued code directly (validate + attempt hold)
  const handleUseIssuedCode = async (issuedCode: string) => {
    setCode(issuedCode);
    setCreatingHold(true);
    setError(null);
    try {
      const ds = await import('../services/dataService');
      const v = await ds.validateGiftcard(issuedCode);
      if (!v) {
        setError('No se pudo validar el código emitido');
        setCreatingHold(false);
        return;
      }
      setGiftcardInfo(v);

      const amountToTry = Math.min(Number(product.price || 0), Number(v.balance || 0));
      if (!amountToTry || amountToTry <= 0) {
        setError('Saldo disponible: 0 — no se puede aplicar la giftcard');
        setCreatingHold(false);
        return;
      }

      const payload: any = { ttlMinutes: 15, code: issuedCode, amount: amountToTry };
      const res = await ds.createGiftcardHold(payload);
      if (res && res.success && res.hold) {
        const holdInfo: any = { holdId: res.hold.id, expiresAt: res.hold.expires_at, amount: Number(res.hold.amount) };
        if (giftcardInfo?.giftcardId) holdInfo.giftcardId = giftcardInfo.giftcardId;
        if (giftcardInfo?.code) holdInfo.code = giftcardInfo.code || code.trim();
        setAppliedHold(holdInfo);
        onUseGiftcard && onUseGiftcard(holdInfo);
      } else {
        setError(res?.error || res?.message || 'No se pudo crear el hold');
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setCreatingHold(false);
    }
  };

  // Release an applied hold
  const handleReleaseHold = async () => {
    if (!appliedHold?.holdId) return;
    setCreatingHold(true);
    setError(null);
    try {
      const ds = await import('../services/dataService');
      const res = await ds.releaseGiftcardHold({ holdId: appliedHold.holdId });
      if (res && res.success) {
        setAppliedHold(null);
        onUseGiftcard && onUseGiftcard(null);
        setError(null);
      } else {
        setError(res?.error || res?.message || 'No se pudo liberar el hold');
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setCreatingHold(false);
    }
  };

  // Sync with parent-provided active hold if available
  React.useEffect(() => {
    if (activeGiftcardHold) {
      setAppliedHold(activeGiftcardHold);
    }
  }, [activeGiftcardHold]);

  const formatExpiry = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return iso;
    }
  };

  // Render helper to keep JSX tidy and avoid complex nested ternaries
  const renderGiftcardContent = () => {
    if (!giftcardInfo) return null;

    // If a hold has been applied, always show the applied state first
    if (appliedHold) {
      return (
        <div className="mt-3 text-sm text-brand-secondary">
          <div className="flex items-center gap-3 mb-2 animate-fade-in-fast">
            <div className="px-3 py-2 bg-green-50 border border-green-200 rounded text-sm text-green-800 font-semibold">Giftcard aplicada • {formatPrice(appliedHold.amount || 0)}</div>
            <button onClick={handleReleaseHold} disabled={creatingHold} className="px-3 py-2 border rounded">Quitar</button>
          </div>
          <div className="text-sm text-brand-secondary">Se aplicará al pagar. Expira: <span className="font-medium">{formatExpiry(appliedHold.expiresAt)}</span></div>
        </div>
      );
    }

    // Just applied feedback
    if (justApplied && appliedHold) {
      return (
        <div className="mt-3 text-sm text-brand-secondary">
          <div className="flex items-center gap-3 mb-2 animate-fade-in-fast">
            <div className="px-3 py-2 bg-green-50 border border-green-200 rounded text-sm text-green-800 font-semibold">Giftcard aplicada • {formatPrice(appliedHold?.amount || 0)}</div>
            <button onClick={handleReleaseHold} disabled={creatingHold} className="px-3 py-2 border rounded">Quitar</button>
          </div>
        </div>
      );
    }

    // Locked / partial balance
    if (!justApplied && giftcardInfo.locked) {
      return (
        <div className="mt-3 text-sm text-brand-secondary">
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 mb-2 animate-fade-in-fast">
            <div className="flex items-center gap-2 mb-2">
              <InfoCircleIcon className="w-5 h-5 text-yellow-600" />
              <span className="font-bold text-yellow-800">Tu giftcard no cubre el total.</span>
            </div>
            <div className="text-brand-text mb-1">Saldo disponible: <span className="font-bold">{formatPrice(Number(giftcardInfo.balance || 0))}</span></div>
            <div className="text-sm text-brand-secondary mb-2">Puedes aplicar el saldo parcial y pagar el resto con otro método.</div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleApplyAvailable(Number(giftcardInfo.balance || 0))} disabled={creatingHold || !!appliedHold} className="bg-green-600 text-white px-3 py-2 rounded shadow hover:bg-green-700 transition">Aplicar saldo parcial</button>
              <button onClick={() => { setGiftcardInfo(null); setCode(''); setManualHoldAmount(null); setError(null); }} disabled={creatingHold} className="px-3 py-2 border rounded shadow">No usar giftcard</button>
              <a href={`mailto:soporte@ceramicalma.com?subject=Ayuda%20con%20giftcard%20${encodeURIComponent(code || (giftcardInfo.code||''))}`} className="px-3 py-2 border rounded shadow bg-white hover:bg-gray-50">Contactar soporte</a>
            </div>
          </div>
        </div>
      );
    }

    // Available partial funds
    if (!justApplied && typeof giftcardInfo.available === 'number' && giftcardInfo.available > 0) {
      return (
        <div className="mt-3 text-sm text-brand-secondary">
          <div className="text-red-600 font-semibold mb-1">Fondos insuficientes para cubrir el importe total.</div>
          <div>Saldo disponible: <span className="font-bold text-brand-text">{formatPrice(giftcardInfo.available)}</span></div>
          <div className="text-sm text-brand-secondary">Puedes aplicar el saldo disponible o continuar sin usar la giftcard.</div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => handleApplyAvailable(Number(giftcardInfo.available))} disabled={creatingHold || !!appliedHold} className="bg-green-600 text-white px-3 py-2 rounded">Aplicar {formatPrice(giftcardInfo.available)}</button>
            <button onClick={() => { setGiftcardInfo(null); setCode(''); setManualHoldAmount(null); setError(null); }} disabled={creatingHold} className="px-3 py-2 border rounded">No usar giftcard</button>
          </div>
        </div>
      );
    }

    // Balance less than price
    if (!justApplied && Number(giftcardInfo?.balance) < Number(product.price)) {
      return (
        <div className="mt-3 text-sm text-brand-secondary">
          <div className="text-red-600 font-semibold mb-1">Fondos insuficientes para cubrir el importe total.</div>
          <div>Saldo disponible: <span className="font-bold text-brand-text">{formatPrice(Number(giftcardInfo.balance))}</span></div>
          <div className="text-sm text-brand-secondary">Puedes aplicar el saldo disponible o continuar sin usar la giftcard.</div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => handleApplyAvailable(Number(giftcardInfo.balance))} disabled={creatingHold || !!appliedHold} className="bg-green-600 text-white px-3 py-2 rounded">Aplicar {formatPrice(Number(giftcardInfo.balance))}</button>
            <button onClick={() => { setGiftcardInfo(null); setCode(''); setManualHoldAmount(null); setError(null); }} disabled={creatingHold} className="px-3 py-2 border rounded">No usar giftcard</button>
          </div>
        </div>
      );
    }

    // Valid full balance
    if (!justApplied && giftcardInfo.valid) {
      return (
        <div className="mt-3 text-sm text-brand-secondary">
          <div>Saldo disponible: <span className="font-bold text-brand-text">{formatPrice(giftcardInfo.balance)}</span></div>
          <div>Válida hasta: <span className="font-medium">{formatExpiry(giftcardInfo.expiresAt || giftcardInfo.expires_at)}</span></div>
          <div className="mt-2">
            {!appliedHold ? (
              <button onClick={handleUse} disabled={creatingHold || Number(giftcardInfo.balance) <= 0} className="bg-green-600 text-white px-3 py-2 rounded">Usar giftcard</button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="px-3 py-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">Giftcard aplicada • {formatPrice(appliedHold?.amount || 0)}</div>
                <button onClick={handleReleaseHold} disabled={creatingHold} className="px-3 py-2 border rounded">Quitar</button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Fallback / request cases
    return (
      <div className="mt-3 text-sm text-brand-secondary">
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
    );
  };

  

  return (
  <div className="w-full max-w-xl bg-white/60 border border-dashed border-brand-border p-4 rounded-lg mb-4">
      <h4 className="font-semibold mb-2">Pagar con Giftcard</h4>
      <div className="flex gap-2 items-center">
        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ingresa código de giftcard" className="flex-grow px-3 py-2 border rounded" />
        <button onClick={handleValidate} disabled={!code || checking} className="bg-brand-primary text-white px-4 py-2 rounded">{checking ? 'Verificando…' : 'Validar'}</button>
      </div>
      {error && (
        <div className="mt-2">
          <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded px-3 py-2 animate-fade-in-fast">
            <InfoCircleIcon className="w-5 h-5 text-red-600" />
            <span className="text-red-700 font-semibold">{error}</span>
            {error.includes('bloqueados') && (
              <button
                onClick={handleValidate}
                disabled={checking}
                className="ml-4 bg-brand-primary text-white px-3 py-1 rounded shadow hover:bg-brand-secondary transition"
              >
                Reintentar
              </button>
            )}
          </div>
          {checking && (
            <div className="mt-2 flex items-center gap-2 text-brand-secondary text-sm">
              <svg className="animate-spin h-4 w-4 text-brand-primary" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>
              Verificando disponibilidad…
            </div>
          )}
        </div>
      )}
  {renderGiftcardContent()}
    </div>
  );
};