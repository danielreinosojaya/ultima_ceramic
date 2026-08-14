import React, { useState } from 'react';
import { applyGiftcardToBooking, validateGiftcard } from '../../services/dataService';
import { formatPrice } from '../../utils/formatters';

export interface GiftcardApplyResult {
  appliedAmount: number;
  pendingBalance: number;
  giftcardRemaining: number;
  isPaid: boolean;
}

interface GiftcardApplyToBookingProps {
  bookingCode: string;
  pendingAmount: number;
  onApplied: (result: GiftcardApplyResult) => void;
}

export const GiftcardApplyToBooking: React.FC<GiftcardApplyToBookingProps> = ({
  bookingCode,
  pendingAmount,
  onApplied,
}) => {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{
    valid: boolean;
    balance: number;
    expiresAt?: string;
    code: string;
  } | null>(null);
  const [done, setDone] = useState<GiftcardApplyResult | null>(null);

  if (pendingAmount <= 0.009) return null;

  const handleValidate = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Ingresa el código de tu gift card');
      return;
    }
    setChecking(true);
    setError(null);
    setInfo(null);
    try {
      const res = await validateGiftcard(trimmed);
      if (res && typeof res.balance === 'number' && (res.valid === true || res.giftcardId)) {
        if (res.valid === false && res.status === 'expired') {
          setError('Esta gift card está vencida');
          return;
        }
        if (Number(res.balance) <= 0) {
          setError('Esta gift card no tiene saldo disponible');
          return;
        }
        setInfo({
          valid: true,
          balance: Number(res.balance),
          expiresAt: res.expiresAt,
          code: res.code || trimmed,
        });
      } else if (res?.reason === 'request_found') {
        setError('Esta gift card aún no está emitida o está pendiente de aprobación');
      } else if (res?.reason === 'approved_request_has_issued_code' && res.issuedCode) {
        setError(`Usa el código emitido: ${res.issuedCode}`);
        setCode(res.issuedCode);
      } else {
        setError(res?.error || res?.message || 'Gift card no encontrada');
      }
    } catch (e: any) {
      setError(e?.message || 'No se pudo validar la gift card');
    } finally {
      setChecking(false);
    }
  };

  const handleApply = async () => {
    const trimmed = (info?.code || code).trim().toUpperCase();
    if (!trimmed) return;
    setApplying(true);
    setError(null);
    try {
      const res = await applyGiftcardToBooking({ bookingCode, giftcardCode: trimmed });
      if (!res.success) {
        setError(res.error || 'No se pudo aplicar la gift card');
        return;
      }
      const result: GiftcardApplyResult = {
        appliedAmount: Number(res.appliedAmount) || 0,
        pendingBalance: Number(res.pendingBalance) || 0,
        giftcardRemaining: Number(res.giftcardRemaining) || 0,
        isPaid: Boolean(res.isPaid),
      };
      setDone(result);
      onApplied(result);
    } catch (e: any) {
      setError(e?.message || 'No se pudo aplicar la gift card');
    } finally {
      setApplying(false);
    }
  };

  if (done) {
    return (
      <div className="bg-green-50 border-2 border-green-400 rounded-xl p-5">
        <p className="font-bold text-green-900 mb-2">🎁 Gift card aplicada: {formatPrice(done.appliedAmount)}</p>
        {done.isPaid ? (
          <p className="text-sm text-green-800">Tu reserva quedó pagada por completo. No necesitas transferir.</p>
        ) : (
          <p className="text-sm text-green-800">
            Faltante a transferir: <strong>{formatPrice(done.pendingBalance)}</strong>
          </p>
        )}
        {done.giftcardRemaining > 0.009 && (
          <p className="text-sm text-green-800 mt-1">
            Sobrante en tu gift card: <strong>{formatPrice(done.giftcardRemaining)}</strong> (queda para otra visita).
          </p>
        )}
      </div>
    );
  }

  const willCover = info ? Math.min(info.balance, pendingAmount) : 0;
  const faltante = info ? Math.max(0, pendingAmount - info.balance) : pendingAmount;
  const sobrante = info ? Math.max(0, info.balance - pendingAmount) : 0;

  return (
    <div className="bg-violet-50 border-2 border-violet-300 rounded-xl p-5">
      <h4 className="font-bold text-violet-950 mb-1 flex items-center gap-2">
        <span>🎁</span> Pagar con gift card
      </h4>
      <p className="text-sm text-violet-900 mb-3">
        Puedes redimirla <strong>de forma virtual</strong>. Ingresa el código, vemos el saldo y lo aplicamos a esta reserva.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
            setInfo(null);
          }}
          placeholder="Ej: GC-ABC123"
          className="flex-1 px-3 py-2 border border-violet-300 rounded-lg font-mono uppercase text-sm"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={handleValidate}
          disabled={checking || applying}
          className="px-4 py-2 bg-violet-700 text-white font-semibold rounded-lg hover:bg-violet-800 disabled:opacity-50"
        >
          {checking ? 'Validando…' : 'Validar'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2 font-semibold">{error}</p>}
      {info && (
        <div className="mt-3 bg-white rounded-lg border border-violet-200 p-3 text-sm space-y-1">
          <p>
            Saldo disponible: <strong>{formatPrice(info.balance)}</strong>
          </p>
          <p>
            Se aplicará ahora: <strong>{formatPrice(willCover)}</strong>
          </p>
          {faltante > 0.009 ? (
            <p className="text-amber-800">
              Faltante a transferir: <strong>{formatPrice(faltante)}</strong>
            </p>
          ) : (
            <p className="text-green-800 font-semibold">Cubre el total de esta reserva.</p>
          )}
          {sobrante > 0.009 && (
            <p className="text-violet-800">
              Sobrante que queda en la gift card: <strong>{formatPrice(sobrante)}</strong>
            </p>
          )}
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="mt-3 w-full bg-green-600 text-white font-bold py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {applying ? 'Aplicando…' : `Aplicar ${formatPrice(willCover)} a esta reserva`}
          </button>
        </div>
      )}
    </div>
  );
};
