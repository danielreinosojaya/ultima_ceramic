import React, { useState, useEffect, useMemo } from 'react';
import type { Booking } from '../../types';
import * as dataService from '../../services/dataService';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { XIcon } from '../icons/XIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { ChevronUpIcon } from '../icons/ChevronUpIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';

interface ExpiredBooking extends Booking {
  status: 'expired' | 'active';
  expiresAt?: Date;
  hoursUntilExpiry?: number;
}

type SortField = 'createdAt' | 'expiresAt' | 'price' | 'userName' | 'status';
type SortOrder = 'asc' | 'desc';

export const ExpiredBookingsManager: React.FC = () => {
  const [bookings, setBookings] = useState<ExpiredBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [searchEmail, setSearchEmail] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const itemsPerPage = 25;


  useEffect(() => {
    loadBookings();
    const interval = setInterval(loadBookings, 60000);
    return () => clearInterval(interval);
  }, []);

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
      setBookings(enrichedBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar por estado y búsqueda
  const filteredBookings = useMemo(() => {
    let filtered = bookings.filter(b => {
      if (filter === 'active') return b.status === 'active' && b.isPaid === false;
      if (filter === 'expired') return b.status === 'expired';
      return true;
    }).filter(b => 
      searchEmail === '' || b.userInfo?.email?.toLowerCase().includes(searchEmail.toLowerCase())
    );

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
  }, [bookings, filter, searchEmail, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIdx, endIdx);

  const activeUnpaidCount = bookings.filter(b => b.status === 'active' && !b.isPaid).length;
  const expiredCount = bookings.filter(b => b.status === 'expired').length;
  const paidCount = bookings.filter(b => b.isPaid).length;

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
      <div>
        <h2 className="text-3xl font-bold text-brand-text mb-1">Gestión de Pre-Reservas</h2>
        <p className="text-brand-secondary">Monitorea reservas activas, pendientes de pago y expiradas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-5 shadow-sm">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Pagadas</p>
          <p className="text-4xl font-bold text-green-900 mt-3">{paidCount}</p>
          <p className="text-xs text-green-600 mt-2">confirmadas</p>
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
        </div>
        <input
          type="email"
          placeholder="🔍 Buscar por email del cliente..."
          value={searchEmail}
          onChange={(e) => { setSearchEmail(e.target.value); setCurrentPage(1); }}
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
                      <td className="px-4 py-3 text-sm text-brand-text">{booking.product?.name}</td>
                      <td className="px-4 py-3 font-bold text-brand-primary text-right">${booking.price?.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                            booking.status === 'expired'
                              ? 'bg-red-100 text-red-700'
                              : booking.isPaid
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {booking.status === 'expired' && <XIcon className="w-3 h-3" />}
                          {booking.isPaid && <CheckIcon className="w-3 h-3" />}
                          {booking.status === 'expired' ? 'Expirada' : booking.isPaid ? 'Pagada' : 'Pendiente'}
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
          <li>✓ Pre-reservas activas por <strong>2 horas</strong> desde su creación</li>
          <li>✓ Se marcan automáticamente como <strong>"Expirada"</strong> cuando vence el plazo</li>
          <li>✓ Los registros se guardan en la DB para seguimiento de clientes</li>
          <li>✓ Ordena por cualquier columna para análisis customizado</li>
        </ul>
      </div>
    </div>
  );
};
