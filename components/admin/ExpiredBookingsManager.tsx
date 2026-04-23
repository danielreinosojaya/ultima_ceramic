import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Booking, GroupTechnique } from '../../types';
import * as dataService from '../../services/dataService';
import { addPaymentToBooking, extendBookingExpiry, cancelPreBooking, sendPaymentReminder, rejectPaymentProof, invalidateBookingsCache } from '../../services/dataService';
import { fetchWithAbort } from '../../utils/fetchWithAbort';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { XIcon } from '../icons/XIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { ChevronUpIcon } from '../icons/ChevronUpIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';

// Helper para obtener nombre de técnica desde metadata
const getTechniqueName = (technique: GroupTechnique): string => {
  const names: Record<GroupTechnique, string> = {
    'potters_wheel': 'Torno Alfarero',
    'hand_modeling': 'Modelado a Mano',
    'painting': 'Pintura de piezas'
  };
  return names[technique] || technique;
};

// Helper para traducir productType a nombre legible
const getProductTypeName = (productType?: string): string => {
  const typeNames: Record<string, string> = {
    'SINGLE_CLASS': 'Clase Suelta',
    'CLASS_PACKAGE': 'Paquete de Clases',
    'INTRODUCTORY_CLASS': 'Clase Introductoria',
    'GROUP_CLASS': 'Clase Grupal',
    'CUSTOM_GROUP_EXPERIENCE': 'Experiencia Grupal Personalizada',
    'COUPLES_EXPERIENCE': 'Experiencia de Parejas',
    'OPEN_STUDIO': 'Estudio Abierto'
  };
  return typeNames[productType || ''] || 'Clase';
};

// Helper para obtener el nombre del producto/técnica de un booking
const getBookingDisplayName = (booking: Booking): string => {
  // 0. Para experiencia grupal personalizada, priorizar técnica sobre nombre genérico
  if (
    booking.technique &&
    (booking.productType === 'CUSTOM_GROUP_EXPERIENCE' || booking.product?.name === 'Experiencia Grupal Personalizada')
  ) {
    return getTechniqueName(booking.technique);
  }

  // 1. Si tiene groupClassMetadata con techniqueAssignments (GROUP_CLASS)
  if (booking.groupClassMetadata?.techniqueAssignments && booking.groupClassMetadata.techniqueAssignments.length > 0) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map(a => a.technique);
    const uniqueTechniques = [...new Set(techniques)];
    
    if (uniqueTechniques.length === 1) {
      return getTechniqueName(uniqueTechniques[0]);
    } else {
      return `Clase Grupal (mixto)`;
    }
  }
  
  // 2. Prioridad: product.name (es la fuente más confiable)
  const productName = booking.product?.name;
  if (productName && productName !== 'Unknown Product' && productName !== 'Unknown' && productName !== null) {
    return productName;
  }
  
  // 3. Fallback: technique directamente (solo si product.name no existe)
  if (booking.technique) {
    return getTechniqueName(booking.technique);
  }
  
  // 4. Último fallback: productType
  return getProductTypeName(booking.productType);
};

interface ExpiredBooking extends Booking {
  status: 'expired' | 'active' | 'confirmed' | 'pending' | 'pending_verification';
  expiresAt?: Date;
  hoursUntilExpiry?: number;
}

type SortField = 'createdAt' | 'expiresAt' | 'price' | 'userName' | 'status';
type SortOrder = 'asc' | 'desc';

export const ExpiredBookingsManager: React.FC = () => {
  const [bookings, setBookings] = useState<ExpiredBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'confirmed' | 'review'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const bookingsRef = useRef<ExpiredBooking[]>([]);
  const itemsPerPage = 25;
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [releaseConfirm, setReleaseConfirm] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<{ bookingId: string; price: number; name: string } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Transferencia');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleExtend = async (bookingId: string) => {
    setActionLoading(p => ({ ...p, [bookingId]: 'extend' }));
    try {
      const res = await extendBookingExpiry(bookingId);
      if (res.success) {
        showMsg('success', '+1 hora aplicada correctamente');
        await loadBookings();
      } else {
        showMsg('error', 'No se pudo extender: reserva no activa');
      }
    } catch {
      showMsg('error', 'Error al extender');
    } finally {
      setActionLoading(p => { const n = { ...p }; delete n[bookingId]; return n; });
    }
  };

  const handleRelease = async (bookingId: string) => {
    setReleaseConfirm(null);
    setActionLoading(p => ({ ...p, [bookingId]: 'release' }));
    try {
      const res = await cancelPreBooking(bookingId);
      if (res.success) {
        showMsg('success', 'Cupo liberado correctamente');
        invalidateBookingsCache();
        await loadBookings();
      } else {
        showMsg('error', 'No se pudo liberar el cupo');
      }
    } catch {
      showMsg('error', 'Error al liberar cupo');
    } finally {
      setActionLoading(p => { const n = { ...p }; delete n[bookingId]; return n; });
    }
  };

  const handleReminder = async (bookingId: string) => {
    setActionLoading(p => ({ ...p, [bookingId]: 'reminder' }));
    try {
      const res = await sendPaymentReminder(bookingId);
      if (res.success) {
        showMsg('success', `Recordatorio enviado: ${res.message || ''}`);
      } else {
        showMsg('error', 'No se pudo enviar el recordatorio');
      }
    } catch {
      showMsg('error', 'Error al enviar recordatorio');
    } finally {
      setActionLoading(p => { const n = { ...p }; delete n[bookingId]; return n; });
    }
  };

  const handleRejectProof = async (bookingId: string) => {
    setActionLoading(p => ({ ...p, [bookingId]: 'reject' }));
    try {
      const res = await rejectPaymentProof(bookingId);
      if (res.success) {
        showMsg('success', 'Comprobante rechazado, reserva marcada como expirada');
        invalidateBookingsCache();
        await loadBookings();
      } else {
        showMsg('error', 'No se pudo rechazar el comprobante');
      }
    } catch {
      showMsg('error', 'Error al rechazar comprobante');
    } finally {
      setActionLoading(p => { const n = { ...p }; delete n[bookingId]; return n; });
    }
  };

  const handleConfirmPayment = async () => {
    if (!payModal) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { showMsg('error', 'Monto inválido'); return; }
    setActionLoading(p => ({ ...p, [payModal.bookingId]: 'pay' }));
    try {
      const res = await addPaymentToBooking(payModal.bookingId, {
        amount,
        method: payMethod,
        receivedAt: new Date().toISOString(),
        notes: 'Registrado desde panel admin - Pre-reservas',
      } as any);
      if (res.success) {
        showMsg('success', `Pago de $${amount.toFixed(2)} registrado correctamente`);
        invalidateBookingsCache();
        await loadBookings();
        setPayModal(null);
        setPayAmount('');
      } else {
        showMsg('error', 'Error al registrar el pago');
      }
    } catch {
      showMsg('error', 'Error al confirmar pago');
    } finally {
      setActionLoading(p => { const n = { ...p }; delete n[payModal.bookingId]; return n; });
    }
  };


  useEffect(() => {
    expireOldBookings();
    loadBookings();

    let isActive = true;
    let pollTimer: NodeJS.Timeout | null = null;

    // Scheduling usa ref para leer bookings actuales, evitando stale closure
    const schedulePoll = () => {
      if (!isActive) return;

      const currentBookings = bookingsRef.current;
      const hasExpiredSoon = currentBookings.some(b => {
        const hoursLeft = b.hoursUntilExpiry || 0;
        return hoursLeft < 1 && hoursLeft > 0;
      });

      const nextInterval = hasExpiredSoon ? 30000 : 300000;

      if (pollTimer) clearTimeout(pollTimer);

      pollTimer = setTimeout(() => {
        if (isActive) {
          loadBookings();
          schedulePoll();
        }
      }, nextInterval);
    };

    schedulePoll();

    return () => {
      isActive = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, []);

  const expireOldBookings = async () => {
    try {
      await fetchWithAbort('expire-old-bookings', '/api/data?action=expireOldBookings', { method: 'POST' });
      console.log('[ExpiredBookingsManager] Old bookings expired');
    } catch (error) {
      if (!(error instanceof Error && error.message === 'Request cancelled')) {
        console.error('[ExpiredBookingsManager] Error expiring bookings:', error);
      }
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      const allBookings = await dataService.getBookings();
      const enrichedBookings = (allBookings || []).map((b: any) => {
        const now = new Date();
        const expiresAt = b.expiresAt ? new Date(b.expiresAt) : null;
        const hoursUntilExpiry = expiresAt ? (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60) : null;
        return { ...b, hoursUntilExpiry: hoursUntilExpiry || 0, status: b.status || 'active' };
      });
      bookingsRef.current = enrichedBookings;
      setBookings(enrichedBookings);
    } catch (error) {
      if (!(error instanceof Error && error.message === 'Request cancelled')) {
        console.error('Error loading bookings:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtrar por estado y búsqueda
  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let filtered = bookings.filter(b => {
      if (filter === 'active') return b.status === 'active' && !b.isPaid;
      if (filter === 'expired') return b.status === 'expired';
      if (filter === 'confirmed') return b.status === 'confirmed' || b.isPaid;
      if (filter === 'review') return b.status === 'pending_verification';
      return true;
    }).filter(b => {
      if (!q) return true;
      const email = b.userInfo?.email?.toLowerCase() || '';
      const firstName = b.userInfo?.firstName?.toLowerCase() || '';
      const lastName = b.userInfo?.lastName?.toLowerCase() || '';
      const code = b.bookingCode?.toLowerCase() || '';
      return email.includes(q) || firstName.includes(q) || lastName.includes(q) || code.includes(q);
    });

    // Ordenamiento inteligente
    return filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'createdAt':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'expiresAt':
          aVal = a.expiresAt ? new Date(a.expiresAt).getTime() : 0;
          bVal = b.expiresAt ? new Date(b.expiresAt).getTime() : 0;
          break;
        case 'price':
          aVal = a.price || 0;
          bVal = b.price || 0;
          break;
        case 'userName':
          aVal = `${a.userInfo?.firstName || ''} ${a.userInfo?.lastName || ''}`.toLowerCase();
          bVal = `${b.userInfo?.firstName || ''} ${b.userInfo?.lastName || ''}`.toLowerCase();
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }, [bookings, filter, searchQuery, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIdx, endIdx);

  const activeUnpaidCount = bookings.filter(b => b.status === 'active' && !b.isPaid).length;
  const expiredCount = bookings.filter(b => b.status === 'expired').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed' || b.isPaid).length;
  const reviewCount = bookings.filter(b => b.status === 'pending_verification').length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-brand-primary transition-colors"
      title={`Ordenar por ${label}`}
    >
      {label}
      {sortField === field && (
        sortOrder === 'asc' ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Modal Confirmar Pago */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPayModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-brand-text mb-1">Confirmar Pago</h3>
            <p className="text-sm text-brand-secondary mb-4">{payModal.name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-brand-text mb-1">Monto</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder={`$${payModal.price.toFixed(2)}`}
                  className="w-full px-3 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-text mb-1">Método de pago</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="Transferencia">Transferencia bancaria</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Giftcard">Giftcard</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setPayModal(null)} className="flex-1 px-4 py-2 border border-brand-border rounded-lg text-brand-secondary hover:bg-brand-surface transition-colors">Cancelar</button>
              <button
                onClick={handleConfirmPayment}
                disabled={!!actionLoading[payModal.bookingId]}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading[payModal.bookingId] === 'pay' ? 'Registrando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Liberar Cupo */}
      {releaseConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReleaseConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-700 mb-2">¿Liberar cupo?</h3>
            <p className="text-sm text-brand-secondary mb-5">La pre-reserva se marcará como expirada y el cupo quedará disponible. Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setReleaseConfirm(null)} className="flex-1 px-4 py-2 border border-brand-border rounded-lg text-brand-secondary hover:bg-brand-surface transition-colors">Cancelar</button>
              <button
                onClick={() => handleRelease(releaseConfirm)}
                disabled={!!actionLoading[releaseConfirm]}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading[releaseConfirm] === 'release' ? 'Liberando...' : 'Sí, liberar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de acciones */}
      {actionMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white font-semibold transition-all ${
          actionMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {actionMessage.type === 'success' ? '✅' : '❌'} {actionMessage.text}
        </div>
      )}

      <div>
        <h2 className="text-3xl font-bold text-brand-text mb-1">Gestión de Pre-Reservas</h2>
        <p className="text-brand-secondary">Monitorea reservas activas, pendientes de pago y expiradas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-5 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total</p>
          <p className="text-4xl font-bold text-blue-900 mt-3">{bookings.length}</p>
          <p className="text-xs text-blue-600 mt-2">reservas registradas</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-5 shadow-sm">
          <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wider">Activas</p>
          <p className="text-4xl font-bold text-yellow-900 mt-3">{activeUnpaidCount}</p>
          <p className="text-xs text-yellow-600 mt-2">esperando pago</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-5 shadow-sm">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Expiradas</p>
          <p className="text-4xl font-bold text-red-900 mt-3">{expiredCount}</p>
          <p className="text-xs text-red-600 mt-2">no pagadas a tiempo</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-5 shadow-sm">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">En Revisión</p>
          <p className="text-4xl font-bold text-orange-900 mt-3">{reviewCount}</p>
          <p className="text-xs text-orange-600 mt-2">comprobantes pendientes</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-5 shadow-sm">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Confirmadas</p>
          <p className="text-4xl font-bold text-green-900 mt-3">{confirmedCount}</p>
          <p className="text-xs text-green-600 mt-2">pagadas y confirmadas</p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg border border-brand-border p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setFilter('all'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'all'
                ? 'bg-brand-primary text-white shadow-md'
                : 'bg-brand-surface text-brand-text hover:bg-brand-border'
            }`}
          >
            Todas ({bookings.length})
          </button>
          <button
            onClick={() => { setFilter('active'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'active'
                ? 'bg-yellow-500 text-white shadow-md'
                : 'bg-brand-surface text-brand-text hover:bg-brand-border'
            }`}
          >
            Activas ({activeUnpaidCount})
          </button>
          <button
            onClick={() => { setFilter('expired'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'expired'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-brand-surface text-brand-text hover:bg-brand-border'
            }`}
          >
            Expiradas ({expiredCount})
          </button>
          <button
            onClick={() => { setFilter('confirmed'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'confirmed'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-brand-surface text-brand-text hover:bg-brand-border'
            }`}
          >
            Confirmadas ({confirmedCount})
          </button>
          <button
            onClick={() => { setFilter('review'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'review'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-brand-surface text-brand-text hover:bg-brand-border'
            }`}
          >
            En Revisión ({reviewCount})
          </button>
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar por email, nombre, apellido o código..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-brand-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            <p className="text-brand-secondary mt-4">Cargando reservas...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center text-brand-secondary">
            <p className="text-lg">No hay reservas que coincidan</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-surface border-b border-brand-border sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-brand-text">Código</th>
                    <th className="px-4 py-3 text-left font-bold text-brand-text"><SortButton field="userName" label="Cliente" /></th>
                    <th className="px-4 py-3 text-left font-bold text-brand-text">Email</th>
                    <th className="px-4 py-3 text-left font-bold text-brand-text">Clase</th>
                    <th className="px-4 py-3 text-right font-bold text-brand-text"><SortButton field="price" label="Monto" /></th>
                    <th className="px-4 py-3 text-left font-bold text-brand-text"><SortButton field="status" label="Estado" /></th>
                    <th className="px-4 py-3 text-left font-bold text-brand-text"><SortButton field="createdAt" label="Creada" /></th>
                    <th className="px-4 py-3 text-left font-bold text-brand-text"><SortButton field="expiresAt" label="Vencimiento" /></th>
                    <th className="px-4 py-3 text-left font-bold text-brand-text">Comprobante</th>
                    <th className="px-4 py-3 text-left font-bold text-brand-text">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBookings.map((booking, idx) => (
                    <tr
                      key={booking.id}
                      className={`border-b border-brand-border transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-brand-surface/30'
                      } hover:bg-brand-surface`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-brand-primary">{booking.bookingCode}</td>
                      <td className="px-4 py-3 font-semibold text-brand-text">
                        {booking.userInfo?.firstName} {booking.userInfo?.lastName}
                      </td>
                      <td className="px-4 py-3 text-xs text-brand-secondary">{booking.userInfo?.email}</td>
                      <td className="px-4 py-3 text-sm text-brand-text">{getBookingDisplayName(booking)}</td>
                      <td className="px-4 py-3 font-bold text-brand-primary text-right">${booking.price?.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                            booking.status === 'expired'
                              ? 'bg-red-100 text-red-700'
                              : booking.status === 'pending_verification'
                              ? 'bg-orange-100 text-orange-700'
                              : booking.status === 'confirmed' || booking.isPaid
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {booking.status === 'expired' && <XIcon className="w-3 h-3" />}
                          {(booking.status === 'confirmed' || booking.isPaid) && <CheckIcon className="w-3 h-3" />}
                          {booking.status === 'expired' ? 'Expirada' : booking.status === 'pending_verification' ? 'En revisión' : (booking.status === 'confirmed' || booking.isPaid) ? 'Confirmada' : 'Pendiente pago'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-brand-secondary">
                        {booking.createdAt
                          ? formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true, locale: es })
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {booking.expiresAt ? (
                          <div className="text-xs">
                            <div className={`font-bold ${booking.hoursUntilExpiry! <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {booking.hoursUntilExpiry! <= 0 ? '✕ Expiró' : `⏱ En ${Math.ceil(booking.hoursUntilExpiry!)}h`}
                            </div>
                            <div className="text-brand-secondary">
                              {new Date(booking.expiresAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-brand-secondary">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {booking.paymentProofUrl ? (
                          <a
                            href={booking.paymentProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver comprobante de pago"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-300 rounded-md hover:bg-orange-100 transition-colors"
                          >
                            📎 Ver
                          </a>
                        ) : (
                          <span className="text-xs text-brand-secondary">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {/* Confirmar pago: activo sin pagar o expirado */}
                          {(!booking.isPaid) && (
                            <button
                              onClick={() => {
                                setPayAmount(booking.price?.toFixed(2) || '');
                                setPayModal({ bookingId: booking.id!, price: booking.price || 0, name: `${booking.userInfo?.firstName} ${booking.userInfo?.lastName} — ${booking.bookingCode}` });
                              }}
                              disabled={!!actionLoading[booking.id!]}
                              title="Confirmar pago"
                              className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-300 rounded-md hover:bg-green-100 disabled:opacity-50 transition-colors font-semibold whitespace-nowrap"
                            >
                              ✅ Pago
                            </button>
                          )}
                          {/* Extender +1h: solo activo sin pagar */}
                          {booking.status === 'active' && !booking.isPaid && (
                            <button
                              onClick={() => handleExtend(booking.id!)}
                              disabled={!!actionLoading[booking.id!]}
                              title="Extender 1 hora más"
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-300 rounded-md hover:bg-blue-100 disabled:opacity-50 transition-colors font-semibold whitespace-nowrap"
                            >
                              {actionLoading[booking.id!] === 'extend' ? '...' : '⏱+1h'}
                            </button>
                          )}
                          {/* Enviar recordatorio: solo activo sin pagar */}
                          {booking.status === 'active' && !booking.isPaid && (
                            <button
                              onClick={() => handleReminder(booking.id!)}
                              disabled={!!actionLoading[booking.id!]}
                              title="Enviar recordatorio de pago por email"
                              className="px-2 py-1 text-xs bg-yellow-50 text-yellow-700 border border-yellow-300 rounded-md hover:bg-yellow-100 disabled:opacity-50 transition-colors font-semibold whitespace-nowrap"
                            >
                              {actionLoading[booking.id!] === 'reminder' ? '...' : '📧 Recordar'}
                            </button>
                          )}
                          {/* Liberar cupo: activo sin pagar */}
                          {booking.status === 'active' && !booking.isPaid && (
                            <button
                              onClick={() => setReleaseConfirm(booking.id!)}
                              disabled={!!actionLoading[booking.id!]}
                              title="Liberar cupo (cancelar pre-reserva)"
                              className="px-2 py-1 text-xs bg-red-50 text-red-700 border border-red-300 rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors font-semibold whitespace-nowrap"
                            >
                              {actionLoading[booking.id!] === 'release' ? '...' : '🔓 Liberar'}
                            </button>
                          )}
                          {/* Rechazar comprobante: solo pending_verification */}
                          {booking.status === 'pending_verification' && (
                            <button
                              onClick={() => handleRejectProof(booking.id!)}
                              disabled={!!actionLoading[booking.id!]}
                              title="Rechazar comprobante y liberar cupo"
                              className="px-2 py-1 text-xs bg-red-50 text-red-700 border border-red-300 rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors font-semibold whitespace-nowrap"
                            >
                              {actionLoading[booking.id!] === 'reject' ? '...' : '❌ Rechazar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="bg-brand-surface px-4 py-3 border-t border-brand-border flex items-center justify-between">
                <span className="text-sm text-brand-secondary">
                  Mostrando <strong>{startIdx + 1}</strong>-<strong>{Math.min(endIdx, filteredBookings.length)}</strong> de <strong>{filteredBookings.length}</strong>
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-brand-border rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ←
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    return page <= totalPages ? (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded font-semibold transition-colors ${
                          currentPage === page
                            ? 'bg-brand-primary text-white'
                            : 'border border-brand-border hover:bg-white'
                        }`}
                      >
                        {page}
                      </button>
                    ) : null;
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-brand-border rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Información */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
        <h3 className="font-bold text-blue-900 mb-3">� Cómo funciona:</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>✓ Expiración automática cada <strong>5 minutos</strong> via cron job del servidor (24/7, sin necesidad de abrir el panel)</li>
          <li>✓ Pre-reservas activas por <strong>2 horas</strong> desde su creación</li>
          <li>✓ Se marcan automáticamente como <strong>"Expirada"</strong> cuando vence el plazo</li>
          <li>✓ Los registros se guardan en la DB para seguimiento de clientes</li>
          <li>✓ Busca por email, nombre, apellido o código de reserva</li>
          <li>✓ Ordena por cualquier columna para análisis customizado</li>
        </ul>
      </div>
    </div>
  );
};
