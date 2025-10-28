import React from 'react';
import type { AugmentedCustomer, RemainingClassesInfo } from './CrmDashboard';
import type { Delivery } from '../../types';
import { GiftIcon } from '../icons/GiftIcon';

interface CustomerListProps {
    customers: AugmentedCustomer[];
    onSelectCustomer: (customer: AugmentedCustomer) => void;
}

const StatusTag: React.FC<{ info: RemainingClassesInfo }> = ({ info }) => {
    if (info.status === 'completed') {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                Completado
            </span>
        );
    }

    if (info.remaining === 1) {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                1 clase restante
            </span>
        );
    }
    
    if (info.remaining === 2) {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                2 clases restantes
            </span>
        );
    }

    return null;
}

const DeliveryBadges: React.FC<{ deliveries?: Delivery[] }> = ({ deliveries }) => {
    if (!deliveries || deliveries.length === 0) {
        return null;
    }

    const pendingCount = deliveries.filter(d => d.status === 'pending').length;
    const overdueCount = deliveries.filter(d => {
        const today = new Date();
        const scheduledDate = new Date(d.scheduledDate);
        return d.status === 'pending' && scheduledDate < today;
    }).length;
    const completedCount = deliveries.filter(d => d.status === 'completed').length;

    return (
        <div className="flex items-center gap-1 ml-2">
            {overdueCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800">
                    {overdueCount} vencida{overdueCount > 1 ? 's' : ''}
                </span>
            )}
            {pendingCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">
                    {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                </span>
            )}
            {completedCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-800">
                    {completedCount} entregada{completedCount > 1 ? 's' : ''}
                </span>
            )}
        </div>
    );
};

export const CustomerList: React.FC<CustomerListProps> = ({ customers, onSelectCustomer }) => {
    console.log('CustomerList - Received customers prop:', customers);
    console.log('CustomerList - Customers count:', customers.length);
    console.log('CustomerList - Customers array:', customers);
    
    // Look for Daniel Reinoso specifically
    const danielCustomer = customers.find(c => 
        c.userInfo?.firstName?.toLowerCase()?.includes('daniel') ||
        c.userInfo?.lastName?.toLowerCase()?.includes('reinoso') ||
        c.email?.toLowerCase()?.includes('daniel')
    );
    console.log('CustomerList - Daniel Reinoso found:', danielCustomer);
    
        // --- INTEGRACIÓN GIFT CARD ---
        const renderGiftcardBadge = (customer: any) => {
            if (customer && customer.bookings) {
                const hasGiftcard = customer.bookings.some(b => b.paymentDetails?.some(p => p.giftcardAmount || p.giftcardId));
                if (hasGiftcard) {
                    return (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 ml-2" title="Cliente ha pagado con giftcard">
                            Giftcard
                        </span>
                    );
                }
            }
            return null;
        };
        // Modal de auditoría de giftcard
        const [showGiftcardAudit, setShowGiftcardAudit] = React.useState(false);
        const [auditCustomer, setAuditCustomer] = React.useState<any>(null);
        const handleOpenAudit = (customer: any) => { setAuditCustomer(customer); setShowGiftcardAudit(true); };
        const handleCloseAudit = () => { setShowGiftcardAudit(false); setAuditCustomer(null); };
        const getGiftcardAuditData = (customer: any) => {
          if (!customer) return [];
          // Simulación: solo muestra el primer pago giftcard
          const booking = customer.bookings?.find(b => b.paymentDetails?.some(p => p.giftcardAmount || p.giftcardId));
          if (!booking) return [];
          const payment = booking.paymentDetails?.find(p => p.giftcardAmount || p.giftcardId);
          return payment ? [{
            fecha: booking.date || '—',
            accion: 'Reserva creada',
            monto: payment.giftcardAmount || 0,
            id: payment.giftcardId || '—'
          }] : [];
        };
    
    return (
        <div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-brand-background">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Entregas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Reservas</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-brand-secondary uppercase tracking-wider">Total gastado</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {customers.length > 0 ? customers.map((customer, index) => {
                            console.log(`CustomerList - Rendering row ${index} for customer:`, customer);
                            console.log(`CustomerList - Customer ${index} name: ${customer?.userInfo?.firstName} ${customer?.userInfo?.lastName}`);
                            console.log(`CustomerList - Customer ${index} email: ${customer?.userInfo?.email || customer.email}`);
                            return (
                                <tr key={customer.email} onClick={() => onSelectCustomer(customer)} className="hover:bg-brand-background cursor-pointer">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-brand-text">
                                                {customer?.userInfo?.firstName || 'N/A'} {customer?.userInfo?.lastName || ''}
                                            </span>
                                            {renderGiftcardBadge(customer)}
                                            {/* Botón auditoría giftcard si tiene pago giftcard */}
                                            {customer.bookings?.some(b => b.paymentDetails?.some(p => p.giftcardAmount || p.giftcardId)) && (
                                              <button onClick={e => { e.stopPropagation(); handleOpenAudit(customer); }} className="inline-flex items-center gap-2 px-2 py-1 text-xs font-semibold rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 ml-1 shadow transition" title="Ver auditoría de giftcard">
                                                Auditoría Giftcard
                                              </button>
                                            )}
                                            {customer.isBirthdayUpcoming && (
                                                <span title="Cumpleaños próximo">
                                                    <GiftIcon className="w-4 h-4 text-rose-500" />
                                                </span>
                                            )}
                                            <DeliveryBadges deliveries={customer.deliveries} />
                                        </div>
                                        <div className="text-sm text-brand-secondary">{customer?.userInfo?.email || customer.email || 'Sin email'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {customer.remainingClassesInfo && <StatusTag info={customer.remainingClassesInfo} />}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text">
                                        {customer.deliveries?.length || 0} entrega{(customer.deliveries?.length || 0) !== 1 ? 's' : ''}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text">
                                        {customer.totalBookings || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text text-right font-semibold">
                                        ${(customer.totalSpent || 0).toFixed(2)}
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-brand-secondary">
                                    No hay clientes registrados
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {/* Modal auditoría giftcard: fuera del overflow-x-auto, dentro del div principal */}
            {showGiftcardAudit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full relative">
                        <button onClick={handleCloseAudit} className="absolute top-4 right-4 text-gray-500 hover:text-brand-primary text-xl">×</button>
                        <h3 className="text-2xl font-bold mb-4 text-brand-text">Auditoría de Giftcard</h3>
                        {getGiftcardAuditData(auditCustomer).length > 0 ? (
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
                                    {getGiftcardAuditData(auditCustomer).map((row, idx) => (
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
        </div>
    );
};
