import React, { useState, useMemo } from 'react';
import type { Delivery } from '../../types';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, QuestionMarkCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { PhotoViewerModal } from './PhotoViewerModal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Helper function to detect critical deliveries
const isCritical = (delivery: Delivery): boolean => {
    const msPerDay = 1000 * 60 * 60 * 24;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // CRITICAL 1: Scheduled date is past and still pending (vencida por no finalizar)
    if (delivery.status === 'pending') {
        const scheduledDate = new Date(delivery.scheduledDate);
        scheduledDate.setHours(0, 0, 0, 0);
        if (scheduledDate < today) {
            return true;
        }
    }

    // CRITICAL 2 & 3: Ready exists and within 30 days or already expired (política de retiro)
    if (delivery.readyAt && delivery.status !== 'completed') {
        const readyDate = new Date(delivery.readyAt);
        const expirationDate = new Date(readyDate);
        expirationDate.setDate(expirationDate.getDate() + 60);
        
        const nowTime = new Date().getTime();
        const daysUntilExpiration = Math.ceil((expirationDate.getTime() - nowTime) / msPerDay);
        
        // Within 30 days OR already expired
        if (daysUntilExpiration <= 30) {
            return true;
        }
    }

    return false;
};

// Helper function to detect deliveries ending in 5 days or less
const isDueWithin5Days = (delivery: Delivery): boolean => {
    if (delivery.status === 'completed') return false;
    if (delivery.readyAt) return false; // Exclude ready deliveries
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const scheduledDate = new Date(delivery.scheduledDate);
    scheduledDate.setHours(0, 0, 0, 0);
    
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntil = Math.ceil((scheduledDate.getTime() - today.getTime()) / msPerDay);
    
    return daysUntil <= 5 && daysUntil >= 0;
};

interface DeliveryListWithFiltersProps {
    deliveries: (Delivery & { customerEmail?: string; customerName?: string })[];
    onEdit: (delivery: Delivery) => void;
    onDelete: (delivery: Delivery) => void;
    onComplete: (deliveryId: string) => void;
    onMarkReady: (deliveryId: string) => void;
    formatDate: (date: string) => string;
}

type FilterStatus = 'all' | 'pending' | 'ready' | 'completed' | 'overdue' | 'critical' | 'due5days';

export const DeliveryListWithFilters: React.FC<DeliveryListWithFiltersProps> = ({
    deliveries,
    onEdit,
    onDelete,
    onComplete,
    onMarkReady,
    formatDate
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
    const [photosToView, setPhotosToView] = useState<string[]>([]);
    const [photoStartIndex, setPhotoStartIndex] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedDeliveries, setSelectedDeliveries] = useState<Set<string>>(new Set());

    const filteredDeliveries = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return deliveries.filter(delivery => {
            // Search filter
            const matchesSearch = searchQuery.trim() === '' || 
                delivery.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                delivery.notes?.toLowerCase().includes(searchQuery.toLowerCase());

            // Status filter
            let matchesStatus = true;
            if (filterStatus === 'pending') {
                // Pending: status is pending AND NOT ready yet (readyAt is not set)
                matchesStatus = delivery.status === 'pending' && !delivery.readyAt;
            } else if (filterStatus === 'ready') {
                matchesStatus = delivery.readyAt && delivery.status !== 'completed';
            } else if (filterStatus === 'completed') {
                matchesStatus = delivery.status === 'completed';
            } else if (filterStatus === 'overdue') {
                const scheduledDate = new Date(delivery.scheduledDate);
                scheduledDate.setHours(0, 0, 0, 0);
                // Overdue: pending (not ready) and scheduled date is past
                matchesStatus = delivery.status === 'pending' && !delivery.readyAt && scheduledDate < today;
            } else if (filterStatus === 'critical') {
                matchesStatus = isCritical(delivery);
            } else if (filterStatus === 'due5days') {
                matchesStatus = isDueWithin5Days(delivery);
            }

            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            // Sort: critical first, then by scheduled date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const aDate = new Date(a.scheduledDate);
            const bDate = new Date(b.scheduledDate);
            aDate.setHours(0, 0, 0, 0);
            bDate.setHours(0, 0, 0, 0);
            
            const aCritical = isCritical(a);
            const bCritical = isCritical(b);
            
            if (aCritical && !bCritical) return -1;
            if (!aCritical && bCritical) return 1;
            
            // Both same priority, sort by date (closest first)
            return aDate.getTime() - bDate.getTime();
        });
    }, [deliveries, searchQuery, filterStatus]);

    // Pagination logic
    const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);
    const paginatedDeliveries = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredDeliveries.slice(startIndex, endIndex);
    }, [filteredDeliveries, currentPage, itemsPerPage]);

    const statusCounts = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return {
            all: deliveries.length,
            pending: deliveries.filter(d => d.status === 'pending' && !d.readyAt).length,
            ready: deliveries.filter(d => d.readyAt && d.status !== 'completed').length,
            completed: deliveries.filter(d => d.status === 'completed').length,
            overdue: deliveries.filter(d => {
                const scheduledDate = new Date(d.scheduledDate);
                scheduledDate.setHours(0, 0, 0, 0);
                return d.status === 'pending' && !d.readyAt && scheduledDate < today;
            }).length,
            critical: deliveries.filter(d => isCritical(d)).length,
            due5days: deliveries.filter(d => isDueWithin5Days(d)).length
        };
    }, [deliveries]);

    const handleOpenPhotos = (photos: string[], startIndex: number = 0) => {
        setPhotosToView(photos);
        setPhotoStartIndex(startIndex);
        setPhotoViewerOpen(true);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const today = new Date();
        let yPosition = 12;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        
        // Title
        doc.setFontSize(14);
        doc.setTextColor(74, 144, 226);
        doc.text('Reporte de Entregas', margin, yPosition);
        yPosition += 6;
        
        // Date and filter info
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`${today.toLocaleDateString('es-ES')} | Filtro: ${
            filterStatus === 'all' ? 'Todas' :
            filterStatus === 'critical' ? 'Críticas' :
            filterStatus === 'pending' ? 'Pendientes' :
            filterStatus === 'completed' ? 'Completadas' :
            filterStatus === 'overdue' ? 'Vencidas' :
            filterStatus === 'due5days' ? 'Próximas (≤5d)' : 'Todas'
        }`, margin, yPosition);
        yPosition += 6;

        // Horizontal line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;

        // Iterate through each delivery
        filteredDeliveries.forEach((delivery, idx) => {
            // Check if we need a new page
            if (yPosition > pageHeight - 15) {
                doc.addPage();
                yPosition = 12;
            }

            const scheduledDate = new Date(delivery.scheduledDate);
            const daysUntil = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            // Delivery header - more compact
            doc.setFontSize(10);
            doc.setTextColor(40, 40, 40);
            doc.setFont(undefined, 'bold');
            doc.text(`${idx + 1}. ${delivery.customerName || 'Cliente'}`, margin, yPosition);
            yPosition += 4;
            
            // Description and meta info
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(80, 80, 80);
            const statusText = delivery.status === 'pending' ? 'Pendiente' : delivery.status === 'ready' ? 'Lista' : 'Completada';
            doc.text(`${delivery.description} | ${statusText} | ${scheduledDate.toLocaleDateString('es-ES')} | ${daysUntil > 0 ? `${daysUntil}d` : 'Vencida'}`, margin, yPosition);
            yPosition += 3;

            // Notes if exist
            if (delivery.notes) {
                doc.setFontSize(7);
                doc.setTextColor(100, 100, 100);
                const notesText = `Notas: ${delivery.notes}`;
                const splitNotes = doc.splitTextToSize(notesText, pageWidth - 2 * margin);
                doc.text(splitNotes, margin, yPosition);
                yPosition += splitNotes.length * 2.5;
            }

            // Photos - smaller grid
            if (delivery.photos && Array.isArray(delivery.photos) && delivery.photos.length > 0) {
                const photosPerRow = 4; // 4 fotos por fila para ahorrar espacio
                const photoWidth = (pageWidth - 2 * margin - 3) / photosPerRow; // 3 = gaps entre fotos
                const photoHeight = photoWidth * 0.75; // 4:3 ratio
                
                let photoRow = 0;
                let photoCol = 0;
                let validPhotos = 0;

                for (let photoIdx = 0; photoIdx < delivery.photos.length; photoIdx++) {
                    const photo = delivery.photos[photoIdx];
                    
                    if (!photo || typeof photo !== 'string') continue;

                    // Check if we need a new page
                    const currentRowY = yPosition + photoRow * (photoHeight + 1);
                    
                    if (currentRowY + photoHeight > pageHeight - 10) {
                        doc.addPage();
                        yPosition = 12;
                        photoRow = 0;
                        photoCol = 0;
                    }

                    try {
                        const xPos = margin + photoCol * (photoWidth + 1);
                        const finalYPos = yPosition + photoRow * (photoHeight + 1);
                        
                        // Ensure Base64 string is valid
                        let imgData = photo;
                        if (!photo.startsWith('data:image')) {
                            imgData = `data:image/jpeg;base64,${photo}`;
                        }
                        
                        doc.addImage(imgData, 'JPEG', xPos, finalYPos, photoWidth, photoHeight);
                        
                        validPhotos++;
                        photoCol++;
                        if (photoCol >= photosPerRow) {
                            photoCol = 0;
                            photoRow++;
                        }
                    } catch (e) {
                        console.warn(`Foto ${photoIdx + 1} no pudo ser agregada`);
                    }
                }

                // Update Y position after photos
                if (validPhotos > 0) {
                    yPosition += Math.ceil(validPhotos / photosPerRow) * (photoHeight + 1) + 2;
                }
            }

            yPosition += 3; // Pequeño espaciador entre entregas
        });

        doc.save(`Entregas-${today.toLocaleDateString('es-ES')}.pdf`);
    };

    const getStatusBadge = (delivery: Delivery) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduledDate = new Date(delivery.scheduledDate);
        scheduledDate.setHours(0, 0, 0, 0);
        
        const isOverdue = scheduledDate < today && delivery.status !== 'completed' && delivery.status !== 'ready';

        // OVERDUE - Critical
        if (isOverdue) {
            return <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-300">⚠️ VENCIDA</span>;
        }

        // COMPLETED - Success
        if (delivery.status === 'completed') {
            return <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full bg-green-100 text-green-800 border border-green-300">✅ ENTREGADA</span>;
        }

        // READY - Highlight
        if (delivery.status === 'ready') {
            return <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-300">✨ LISTA PARA RECOGER</span>;
        }

        // PENDING - Default (not started)
        return <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full bg-gray-100 text-gray-800 border border-gray-300">📋 EN PROCESO</span>;
    };

    return (
        <div className="space-y-4">
            {/* Search and Filters Header */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Box */}
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por descripción o notas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* Filter Toggle Button */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg font-semibold transition-colors ${
                        showFilters || filterStatus !== 'all'
                            ? 'bg-brand-primary text-white border-brand-primary'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    <FunnelIcon className="h-5 w-5" />
                    Filtros
                    {filterStatus !== 'all' && (
                        <span className="ml-1 px-2 py-0.5 bg-white text-brand-primary rounded-full text-xs font-bold">
                            1
                        </span>
                    )}
                </button>

                {/* PDF Export Button */}
                <button
                    onClick={exportToPDF}
                    disabled={filteredDeliveries.length === 0}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                        filteredDeliveries.length > 0
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    PDF
                </button>
            </div>

            {/* Filter Pills */}
            {showFilters && (
                <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            filterStatus === 'all'
                                ? 'bg-brand-primary text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                    >
                        Todas ({statusCounts.all})
                    </button>
                    {statusCounts.critical > 0 && (
                        <button
                            onClick={() => setFilterStatus('critical')}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors animate-pulse ${
                                filterStatus === 'critical'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
                            }`}
                        >
                            🚨 CRÍTICAS ({statusCounts.critical})
                        </button>
                    )}
                    <button
                        onClick={() => setFilterStatus('pending')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            filterStatus === 'pending'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                    >
                        Pendientes ({statusCounts.pending})
                    </button>
                    <button
                        onClick={() => setFilterStatus('ready')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            filterStatus === 'ready'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                    >
                        Listos para retirar ({statusCounts.ready})
                    </button>
                    <button
                        onClick={() => setFilterStatus('completed')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            filterStatus === 'completed'
                                ? 'bg-green-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                    >
                        Completadas ({statusCounts.completed})
                    </button>
                    {statusCounts.overdue > 0 && (
                        <button
                            onClick={() => setFilterStatus('overdue')}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                                filterStatus === 'overdue'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-white text-red-700 hover:bg-red-50 border border-red-300'
                            }`}
                        >
                            ⚠️ Vencidas ({statusCounts.overdue})
                        </button>
                    )}
                    {statusCounts.due5days > 0 && (
                        <button
                            onClick={() => setFilterStatus('due5days')}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                                filterStatus === 'due5days'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-white text-orange-700 hover:bg-orange-50 border border-orange-300'
                            }`}
                        >
                            ⏳ Próximas ({statusCounts.due5days})
                        </button>
                    )}
                </div>
            )}

            {/* Results Count & Pagination */}
            <div className="flex items-center justify-between text-sm text-gray-600 flex-wrap gap-2">
                <span>
                    Página <strong>{currentPage}</strong> de <strong>{totalPages || 1}</strong> • Mostrando <strong>{paginatedDeliveries.length}</strong> de <strong>{filteredDeliveries.length}</strong> entregas
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-xs">Por página:</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>
                {(searchQuery || filterStatus !== 'all') && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setFilterStatus('all');
                        }}
                        className="text-brand-primary hover:text-brand-secondary font-semibold"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Deliveries List - Mobile-first responsive cards */}
            <div className="space-y-3 sm:space-y-4">
                {filteredDeliveries.length > 0 ? paginatedDeliveries.map((delivery) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const scheduledDate = new Date(delivery.scheduledDate);
                    scheduledDate.setHours(0, 0, 0, 0);
                    const isOverdue = delivery.status === 'pending' && scheduledDate < today;
                    const isSelected = selectedDeliveries.has(delivery.id);

                    return (
                        <div 
                            key={delivery.id} 
                            className={`bg-white rounded-lg shadow-md border-2 transition-all duration-200 overflow-hidden ${
                                isOverdue ? 'border-red-300 bg-red-50' : isSelected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {/* Card Header - Cliente + Checkbox */}
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 flex items-center gap-2 sm:gap-3">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedDeliveries(prev => new Set([...prev, delivery.id]));
                                        } else {
                                            setSelectedDeliveries(prev => {
                                                const next = new Set(prev);
                                                next.delete(delivery.id);
                                                return next;
                                            });
                                        }
                                    }}
                                    className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer flex-shrink-0"
                                />
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold text-sm sm:text-base text-gray-900 truncate">
                                        {delivery.customerName || 'Cliente desconocido'}
                                    </p>
                                    <p className="text-xs sm:text-sm text-gray-600 truncate">{delivery.customerEmail}</p>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                                
                                {/* Descripción + Badge */}
                                <div className="flex flex-wrap items-start gap-2">
                                    <p className="font-semibold text-sm sm:text-base text-gray-900 flex-grow">
                                        {delivery.description || <span className="text-gray-400 italic">Piezas de cerámica</span>}
                                    </p>
                                    {getStatusBadge(delivery)}
                                    {isCritical(delivery) && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-600 text-white font-bold text-xs animate-pulse">
                                            🚨 CRÍTICO
                                        </span>
                                    )}
                                </div>

                                {/* Fecha programada */}
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                                    <span className="flex-shrink-0">📅</span>
                                    <span>Fecha programada: <strong className="text-gray-900">{formatDate(delivery.scheduledDate)}</strong></span>
                                </div>

                                {/* TIPO 1: Countdown de finalización */}
                                {(() => {
                                    const msPerDay = 1000 * 60 * 60 * 24;
                                    const scheduled = new Date(delivery.scheduledDate);
                                    scheduled.setHours(0, 0, 0, 0);
                                    const todayBase = new Date();
                                    todayBase.setHours(0, 0, 0, 0);
                                    const diffDays = Math.ceil((scheduled.getTime() - todayBase.getTime()) / msPerDay);

                                    if (delivery.status === 'pending') {
                                        if (diffDays > 1) {
                                            return (
                                                <div className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs sm:text-sm border border-blue-200">
                                                    ⏳ Finalizar en {diffDays} días
                                                </div>
                                            );
                                        }
                                        if (diffDays === 1) {
                                            return (
                                                <div className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-xs sm:text-sm border border-amber-300">
                                                    ⚠️ Finalizar MAÑANA
                                                </div>
                                            );
                                        }
                                        if (diffDays === 0) {
                                            return (
                                                <div className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-xs sm:text-sm border border-amber-300">
                                                    ⚠️ Finalizar HOY
                                                </div>
                                            );
                                        }
                                        const overdueDays = Math.abs(diffDays);
                                        return (
                                            <div className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-red-100 text-red-800 font-semibold text-xs sm:text-sm border border-red-300">
                                                🔴 VENCIDA: Hace {overdueDays} día{overdueDays > 1 ? 's' : ''}
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* TIPO 2: Ready date + retiro countdown */}
                                {delivery.readyAt && (
                                    (() => {
                                        const readyDate = new Date(delivery.readyAt);
                                        const expirationDate = new Date(readyDate);
                                        expirationDate.setDate(expirationDate.getDate() + 60);
                                        const nowTime = new Date().getTime();
                                        const daysUntilExpiration = Math.ceil((expirationDate.getTime() - nowTime) / (1000 * 60 * 60 * 24));
                                        const isExpiringSoon = daysUntilExpiration <= 30 && daysUntilExpiration > 0;
                                        const isExpired = daysUntilExpiration <= 0;
                                        
                                        return (
                                            <div className="space-y-1 sm:space-y-2">
                                                <div className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-purple-100 text-purple-800 font-semibold text-xs sm:text-sm border border-purple-200">
                                                    ✨ Lista desde {formatDate(delivery.readyAt)}
                                                </div>
                                                {isExpired ? (
                                                    <div className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-red-100 text-red-800 font-semibold text-xs sm:text-sm border border-red-300 ml-2">
                                                        🟠 EXPIRADA (60 días vencidos)
                                                    </div>
                                                ) : isExpiringSoon ? (
                                                    <div className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-orange-100 text-orange-800 font-semibold text-xs sm:text-sm border border-orange-300 ml-2">
                                                        ⏰ Retira en {daysUntilExpiration} días
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-green-100 text-green-700 text-xs sm:text-sm border border-green-200 ml-2">
                                                        ✅ Falta {daysUntilExpiration} días
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()
                                )}

                                {/* Entregada */}
                                {delivery.deliveredAt && (
                                    <div className="flex items-center gap-2 text-xs sm:text-sm text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                                        <span>✅ Entregada: <strong>{formatDate(delivery.deliveredAt)}</strong></span>
                                    </div>
                                )}

                                {/* Notas */}
                                {delivery.notes && (
                                    <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                        <p className="text-xs sm:text-sm text-gray-700">📝 {delivery.notes}</p>
                                    </div>
                                )}

                                {/* Fotos - Responsive grid */}
                                {delivery.photos && delivery.photos.length > 0 && (
                                    <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                                        {delivery.photos.slice(0, 5).map((photo, i) => (
                                            <div
                                                key={i}
                                                className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-brand-primary transition-all hover:scale-105 shadow-sm"
                                                onClick={() => handleOpenPhotos(delivery.photos, i)}
                                                title="Click para ver en grande"
                                            >
                                                <img 
                                                    src={photo} 
                                                    alt={`Foto ${i + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ))}
                                        {delivery.photos.length > 5 && (
                                            <div 
                                                className="aspect-square flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-gray-300 text-gray-700 text-xs sm:text-sm font-bold cursor-pointer hover:from-gray-200 hover:to-gray-300 transition-all shadow-sm"
                                                onClick={() => handleOpenPhotos(delivery.photos, 5)}
                                                title="Ver todas las fotos"
                                            >
                                                +{delivery.photos.length - 5}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Card Footer - Action Buttons */}
                            <div className="bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-200 flex flex-wrap gap-2">
                                <button
                                    className="flex-1 xs:flex-none inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-sm transition-all text-xs sm:text-sm font-semibold"
                                    title="Editar entrega"
                                    onClick={() => onEdit(delivery)}
                                >
                                    <span className="text-base sm:text-lg">✏️</span>
                                    <span className="hidden xs:inline">Editar</span>
                                </button>
                                <button
                                    className="flex-1 xs:flex-none inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 shadow-sm transition-all text-xs sm:text-sm font-semibold"
                                    title="Eliminar entrega"
                                    onClick={() => onDelete(delivery)}
                                >
                                    <span className="text-base sm:text-lg">🗑️</span>
                                    <span className="hidden xs:inline">Eliminar</span>
                                </button>
                                {delivery.status !== 'completed' && !delivery.readyAt && (
                                    <button
                                        className="w-full xs:w-auto xs:flex-grow inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all text-xs sm:text-sm font-bold"
                                        title="Notificar al cliente que su pieza está lista"
                                        onClick={() => onMarkReady(delivery.id)}
                                    >
                                        <span>✨</span>
                                        <span>Marcar como Lista</span>
                                    </button>
                                )}
                                {delivery.status !== 'completed' && delivery.readyAt && (
                                    <>
                                        <button
                                            className="flex-1 xs:flex-none inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 shadow-sm transition-all text-xs sm:text-sm font-semibold"
                                            title="Reenviar email de notificación al cliente"
                                            onClick={() => onMarkReady(delivery.id)}
                                        >
                                            <span>📧</span>
                                            <span className="hidden xs:inline">Reenviar</span>
                                        </button>
                                        <button
                                            className="flex-1 xs:flex-none inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-md transition-all text-xs sm:text-sm font-bold"
                                            title="Completar entrega"
                                            onClick={() => onComplete(delivery.id)}
                                        >
                                            <span>✓</span>
                                            <span>Completar</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 sm:p-8 text-center">
                        <div className="text-gray-300 text-5xl sm:text-6xl md:text-7xl mb-3 sm:mb-4">📦</div>
                        <p className="text-gray-800 font-bold text-base sm:text-lg mb-2">No se encontraron entregas</p>
                        <p className="text-gray-500 text-xs sm:text-sm">
                            {searchQuery || filterStatus !== 'all' 
                                ? 'Intenta ajustar los filtros de búsqueda'
                                : 'No hay recogidas registradas'}
                        </p>
                    </div>
                )}
            </div>

            {/* Bulk Actions & Pagination */}
            {selectedDeliveries.size > 0 && (
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-blue-900 mb-2">
                        {selectedDeliveries.size} entrega(s) seleccionada(s)
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        {/* Marcar como Lista Tooltip */}
                        <div className="group relative">
                            <button
                                onClick={() => {
                                    Array.from(selectedDeliveries).forEach(id => onMarkReady(id));
                                    setSelectedDeliveries(new Set());
                                }}
                                className="px-3 py-2 bg-purple-600 text-white rounded text-sm font-semibold hover:bg-purple-700 flex items-center gap-1"
                            >
                                ✨ Marcar {selectedDeliveries.size} como Listas
                                <QuestionMarkCircleIcon className="w-4 h-4" />
                            </button>
                            <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                                Marca como "LISTA PARA RECOGER" para iniciar el conteo de 60 días antes del vencimiento
                                <div className="absolute top-full left-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                            </div>
                        </div>

                        {/* Retirada Tooltip */}
                        <div className="group relative">
                            <button
                                onClick={() => {
                                    Array.from(selectedDeliveries).forEach(id => onComplete(id));
                                    setSelectedDeliveries(new Set());
                                }}
                                className="px-3 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700 flex items-center gap-1"
                            >
                                ✓ Retirada {selectedDeliveries.size}
                                <QuestionMarkCircleIcon className="w-4 h-4" />
                            </button>
                            <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                                Marca como "RETIRADA" - finaliza la entrega
                                <div className="absolute top-full left-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedDeliveries(new Set())}
                            className="px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-400"
                        >
                            Limpiar selección
                        </button>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {filteredDeliveries.length > itemsPerPage && (
                <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        ← Anterior
                    </button>
                    <div className="flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 rounded text-sm font-semibold ${
                                    currentPage === page
                                        ? 'bg-brand-primary text-white'
                                        : 'border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Siguiente →
                    </button>
                </div>
            )}

            {/* Photo Viewer Modal */}
            <PhotoViewerModal
                isOpen={photoViewerOpen}
                photos={photosToView}
                initialIndex={photoStartIndex}
                onClose={() => {
                    setPhotoViewerOpen(false);
                    setPhotosToView([]);
                    setPhotoStartIndex(0);
                }}
            />
        </div>
    );
};
