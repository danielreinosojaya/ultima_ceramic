import React, { useState } from 'react';
// Replace UI library imports with basic HTML elements
import { PaymentDetails } from '../../types';
import { useAdminData } from '../../context/AdminDataContext';

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentDetails;
  paymentIndex: number;  // Mantener para retrocompatibilidad, pero preferir paymentId
  bookingId: string;
  onSave: (updated: Partial<PaymentDetails>) => void;
}

const paymentMethods = [
  { value: 'Cash', label: 'Efectivo' },
  { value: 'Transfer', label: 'Transferencia' },
  { value: 'Card', label: 'Tarjeta' },
];

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({ isOpen, onClose, payment, onSave, bookingId, paymentIndex }) => {
  const adminData = useAdminData();
  const [amount, setAmount] = useState(payment?.amount || 0);
  const [method, setMethod] = useState<string>(payment?.method || 'Cash');
  const [receivedAt, setReceivedAt] = useState(payment?.receivedAt || '');
  const [showDelete, setShowDelete] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSave = () => {
    onSave({ amount, method: method as any, receivedAt });
    onClose();
  };

  const handleDelete = async () => {
    if (!cancelReason) return;
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const dataService = await import('../../services/dataService');
      
      // Prefer paymentId if available, fallback to index-based approach
      if (payment.id) {
        console.log('[EditPaymentModal] Deleting payment by ID:', payment.id);
        const result = await dataService.deletePaymentFromBooking(bookingId, payment.id, cancelReason);
        
        if (!result.success) {
          // Manejo específico para booking no encontrado
          const errorMsg = (result as any).error || (result as any).message || 'Error desconocido';
          if (errorMsg.includes('Booking not found') || errorMsg.includes('eliminada')) {
            alert('La reserva asociada a este pago ya no existe. El pago será removido de la vista automáticamente.');
            setShowConfirm(false);
            onClose();
            // Refresh critical data without full reload
            adminData.refreshCritical();
            return;
          }
          throw new Error(errorMsg);
        }

        if (result.booking) {
          adminData.optimisticUpsertBooking(result.booking as any);
        } else {
          adminData.optimisticRemoveBookingPayment(bookingId, payment.id);
        }
      } else {
        console.warn('[EditPaymentModal] Payment has no ID, falling back to index-based deletion');
        // Refetch booking to get fresh payment array and correct index
        const freshBookings = await dataService.getBookings();
        const freshBooking = freshBookings.find((b: any) => b.id === bookingId);
        
        if (!freshBooking || !freshBooking.paymentDetails) {
          console.error('[EditPaymentModal] Could not find booking or payment details');
          alert('La reserva ya no existe. El pago será removido de la vista automáticamente.');
          setShowConfirm(false);
          onClose();
          adminData.refreshCritical();
          return;
        }

        // Find the real index by matching payment properties
        const realIndex = freshBooking.paymentDetails.findIndex((p: any) => 
          p.amount === payment.amount && 
          p.method === payment.method && 
          p.receivedAt === payment.receivedAt
        );

        if (realIndex === -1) {
          console.error('[EditPaymentModal] Could not find matching payment in fresh data');
          alert('El pago ya no existe en los datos actualizados. La vista se actualizará automáticamente.');
          setShowConfirm(false);
          onClose();
          adminData.refreshCritical();
          return;
        }

        console.log('[EditPaymentModal] Deleting payment with realIndex:', realIndex, 'from', freshBooking.paymentDetails.length, 'payments');

        const result = await dataService.deletePaymentFromBooking(bookingId, realIndex, cancelReason);
        if (result?.success && result.booking) {
          adminData.optimisticUpsertBooking(result.booking as any);
        } else {
          adminData.optimisticRemoveBookingPayment(bookingId, realIndex);
        }
      }
      
      setShowConfirm(false);
      onClose();
    } catch (error: any) {
      console.error('[EditPaymentModal] Error deleting payment:', error);
      
      // Manejo específico para errores de booking no encontrado
      if (error.message?.includes('Booking not found') || error.message?.includes('eliminada')) {
        alert('La reserva asociada a este pago fue eliminada. La vista se actualizará automáticamente.');
        setShowConfirm(false);
        onClose();
        adminData.refreshCritical();
        return;
      }
      
      alert(`Error al eliminar el pago: ${error.message || String(error)}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
        <h2 className="text-lg font-bold mb-4">Editar pago</h2>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm">Monto</span>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="mt-1 block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            <span className="text-sm">Método</span>
            <select value={method} onChange={e => setMethod(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1">
              {paymentMethods.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm">Fecha</span>
            <input type="date" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
          </label>
          <button type="button" className={`text-red-600 font-semibold text-sm transition hover:scale-105 hover:bg-red-50 px-2 py-1 rounded shadow-sm`} onClick={() => setShowDelete(v => !v)}>
            {showDelete ? 'Cancelar eliminación' : 'Eliminar pago'}
          </button>
          {showDelete && (
            <div className="mt-2 animate-fade-in">
              <label className="block mb-1 text-sm font-semibold text-red-700">Motivo de cancelación</label>
              <input type="text" value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="block w-full border border-red-300 rounded px-2 py-1 mb-2 focus:ring-2 focus:ring-red-400" placeholder="Motivo..." />
              <button onClick={handleDelete} className="bg-gradient-to-r from-red-500 to-red-700 text-white px-4 py-2 rounded shadow hover:scale-105 transition font-bold">Solicitar eliminación</button>
            </div>
          )}
          {showConfirm && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-40 animate-fade-in">
              <div className="bg-white rounded-lg shadow-2xl p-6 min-w-[320px] border-2 border-red-600 flex flex-col items-center">
                <div className="mb-2">
                  <svg width="48" height="48" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#fee2e2"/><path d="M12 8v4m0 4h.01" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h3 className="text-xl font-bold text-red-700 mb-2">¿Confirmar eliminación?</h3>
                <p className="text-sm text-gray-700 mb-4 text-center">Esta acción no se puede deshacer. El pago será eliminado y se registrará el motivo en el historial.</p>
                <div className="flex gap-3 mt-2">
                  <button onClick={handleConfirmDelete} className="bg-red-600 text-white px-4 py-2 rounded font-bold shadow hover:bg-red-700 transition">Eliminar pago</button>
                  <button onClick={() => setShowConfirm(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-semibold shadow hover:bg-gray-300 transition">Cancelar</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end mt-6 gap-2">
          <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded">Guardar</button>
          <button onClick={onClose} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">Cancelar</button>
        </div>
      </div>
    </div>
  );
};
