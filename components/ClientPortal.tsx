import React, { useState } from 'react';
import { UserIcon, CalendarIcon, ArchiveBoxIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

interface ClientPortalProps {
    onViewClasses: () => void;
    onClose?: () => void;
}

/**
 * ClientPortal
 * 
 * Authenticated client menu using AuthContext
 */
export const ClientPortal: React.FC<ClientPortalProps> = ({ 
    onViewClasses, 
    onClose 
}) => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const handleViewClasses = () => {
        onViewClasses();
        setIsOpen(false);
    };

    const handleLogout = async () => {
        await logout();
        setIsOpen(false);
    };

    if (!user) return null;

    return (
        <div className="relative">
            {/* Portal Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-brand-accent text-white hover:opacity-90 transition-all text-sm min-h-10"
                title="Abrir portal de cliente"
                aria-label="Portal de cliente"
            >
                <UserIcon className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-semibold">Mi Cuenta</span>
                <span className="inline sm:hidden text-xs">Sesión</span>
            </button>

            {/* Portal Menu Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-brand-primary to-brand-accent text-white p-4 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <UserIcon className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <p className="text-xs opacity-90">Sesión Activa</p>
                                <p className="font-semibold text-sm break-all">{user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:opacity-75 transition-opacity"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Menu Items */}
                    <div className="p-4 space-y-3">
                        {/* View Classes */}
                        <button
                            onClick={handleViewClasses}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors text-left group"
                        >
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                <CalendarIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-brand-text">Mis Clases</p>
                                <p className="text-xs text-brand-secondary">Ver y reagendar tus reservas</p>
                            </div>
                        </button>

                        {/* Archive */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group opacity-50 cursor-not-allowed"
                            disabled
                        >
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                                <ArchiveBoxIcon className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-brand-text">Historial</p>
                                <p className="text-xs text-brand-secondary">Clases completadas (próximamente)</p>
                            </div>
                        </button>

                        {/* Divider */}
                        <div className="border-t border-gray-200"></div>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg transition-colors text-sm"
                        >
                            Cerrar Sesión
                        </button>
                    </div>

                    {/* Footer Info */}
                    <div className="bg-gray-50 p-4 rounded-b-lg border-t border-gray-200">
                        <p className="text-xs text-brand-secondary text-center">
                            ¿Necesitas ayuda? Contacta con nosotros en el email o WhatsApp
                        </p>
                    </div>
                </div>
            )}

            {/* Close overlay if clicking outside */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};
