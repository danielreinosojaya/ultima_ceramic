import React, { useState } from 'react';
import * as dataService from '../../services/dataService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onSaved?: () => void;
}

export const AuthorizeOverrideModal: React.FC<Props> = ({ isOpen, onClose, bookingId, onSaved }) => {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    setError(null);
    if (!reason.trim()) {
      setError('Debe indicar un motivo para la excepción');
      return;
    }
    setSaving(true);
    try {
      // TODO: replace with actual user id/email from auth context if available
      const overriddenBy = 'admin_ui';
      const res: any = await dataService.authorizeBookingOverride(bookingId, overriddenBy, reason, { via: 'admin_ui' });
      if (res && res.success) {
        onSaved && onSaved();
        onClose();
      } else {
        setError(res?.error || 'No se pudo autorizar la excepción');
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h3 className="text-lg font-bold mb-2">Autorizar excepción</h3>
        <p className="text-sm text-gray-600 mb-4">Indica la razón por la cual autorizas esta excepción. Esto quedará registrado en la auditoría.</p>
        <textarea className="w-full p-2 border rounded mb-2" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded bg-gray-100" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="px-4 py-2 rounded bg-brand-secondary text-white" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Autorizar'}</button>
        </div>
      </div>
    </div>
  );
};

export default AuthorizeOverrideModal;
