import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Delivery } from '../../types';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, QuestionMarkCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { PhotoViewerModal } from './PhotoViewerModal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as dataService from '../../services/dataService';
import { useAdminData } from '../../context/AdminDataContext';

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

type FilterStatus = 'all' | 'pending' | 'ready' | 'completed' | 'overdue' | 'critical' | 'due5days' | 'wants_painting' | 'painting_pending_payment' | 'painting_ready' | 'painting_scheduled' | 'painting_completed';

export const DeliveryListWithFilters: React.FC<DeliveryListWithFiltersProps> = ({
    deliveries,
    onEdit,
    onDelete,
    onComplete,
    onMarkReady,
    formatDate
}) => {
    const adminData = useAdminData();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
    const [photosToView, setPhotosToView] = useState<string[]>([]);
    const [photoStartIndex, setPhotoStartIndex] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedDeliveries, setSelectedDeliveries] = useState<Set<string>>(new Set());
    const [customerContacts, setCustomerContacts] = useState<{[email: string]: {phone?: string, countryCode?: string}}>({});
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);
    // ⚡ Cache local de fotos cargadas bajo demanda
    const [loadedPhotos, setLoadedPhotos] = useState<{[deliveryId: string]: string[]}>({});
    const [loadingPhotos, setLoadingPhotos] = useState<{[deliveryId: string]: boolean}>({});
    // ⚡ Intersection Observer para lazy loading automático
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadQueueRef = useRef<Set<string>>(new Set());
    const [bulkFeedback, setBulkFeedback] = useState<{message: string; type: 'success' | 'error' | 'warning'} | null>(null);

    const filteredDeliveries = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return deliveries.filter(delivery => {
            // Search filter - busca por descripción, notas y nombre del cliente
            const matchesSearch = searchQuery.trim() === '' || 
                (delivery.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (delivery.notes?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (delivery.customerName?.toLowerCase().includes(searchQuery.toLowerCase()));

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
            } else if (filterStatus === 'wants_painting') {
                matchesStatus = delivery.wantsPainting === true;
            } else if (filterStatus === 'painting_pending_payment') {
                matchesStatus = delivery.wantsPainting === true && delivery.paintingStatus === 'pending_payment';
            } else if (filterStatus === 'painting_ready') {
                matchesStatus = delivery.wantsPainting === true && delivery.paintingStatus === 'paid' && delivery.status === 'ready';
            } else if (filterStatus === 'painting_scheduled') {
                matchesStatus = delivery.wantsPainting === true && delivery.paintingStatus === 'scheduled';
            } else if (filterStatus === 'painting_completed') {
                matchesStatus = delivery.wantsPainting === true && delivery.paintingStatus === 'completed';
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

    // ⚡ Cargar fotos bajo demanda
    const loadPhotosForDelivery = useCallback(async (deliveryId: string): Promise<string[]> => {
        // Si ya tenemos las fotos en cache, retornarlas
        if (loadedPhotos[deliveryId]) {
            return loadedPhotos[deliveryId];
        }
        
        // Si ya está cargando, esperar
        if (loadingPhotos[deliveryId]) {
            return [];
        }
        
        setLoadingPhotos(prev => ({ ...prev, [deliveryId]: true }));
        
        try {
            const photos = await dataService.getDeliveryPhotos(deliveryId);
            setLoadedPhotos(prev => ({ ...prev, [deliveryId]: photos }));
            return photos;
        } catch (error) {
            console.error('[DeliveryList] Error loading photos for', deliveryId, error);
            return [];
        } finally {
            setLoadingPhotos(prev => ({ ...prev, [deliveryId]: false }));
        }
    }, [loadedPhotos, loadingPhotos]);

    // Obtener fotos de una delivery (del cache o de la prop)
    const getDeliveryPhotos = useCallback((delivery: Delivery): string[] => {
        // Primero verificar cache local
        if (loadedPhotos[delivery.id] && loadedPhotos[delivery.id].length > 0) {
            return loadedPhotos[delivery.id];
        }
        // Luego usar las fotos de la prop si existen
        return delivery.photos || [];
    }, [loadedPhotos]);

    const handleOpenPhotos = useCallback(async (deliveryId: string, existingPhotos: string[] | null | undefined, startIndex: number = 0) => {
        // Si ya tiene fotos cargadas, usarlas directamente
        if (existingPhotos && existingPhotos.length > 0) {
            setPhotosToView(existingPhotos);
            setPhotoStartIndex(startIndex);
            setPhotoViewerOpen(true);
            return;
        }
        
        // Si no hay fotos pero hasPhotos indica que existen, cargarlas
        const photos = await loadPhotosForDelivery(deliveryId);
        if (photos.length > 0) {
            setPhotosToView(photos);
            setPhotoStartIndex(startIndex);
            setPhotoViewerOpen(true);
        }
    }, [loadPhotosForDelivery]);

    // ⚡ Hook para observar elementos de delivery
    const deliveryCardRef = useCallback((node: HTMLDivElement | null, delivery: Delivery) => {
        if (!node || !observerRef.current) return;
        
        // Solo observar si tiene fotos y no están cargadas
        if (delivery.hasPhotos && !loadedPhotos[delivery.id]) {
            observerRef.current.observe(node);
        }
    }, [loadedPhotos]);

    // ⚡ Setup Intersection Observer para lazy loading de fotos visibles (ÚNICO PUNTO DE CARGA)
    useEffect(() => {
        const options = {
            root: null,
            rootMargin: '100px', // Precargar 100px antes de que sea visible
            threshold: 0.1
        };

        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const deliveryId = entry.target.getAttribute('data-delivery-id');
                    if (deliveryId && !loadQueueRef.current.has(deliveryId) && !loadedPhotos[deliveryId]) {
                        loadQueueRef.current.add(deliveryId);
                        // Cargar fotos con delay para evitar saturación
                        setTimeout(() => {
                            loadPhotosForDelivery(deliveryId).finally(() => {
                                loadQueueRef.current.delete(deliveryId);
                            });
                        }, 200);
                    }
                }
            });
        }, options);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [loadPhotosForDelivery, loadedPhotos]);

    // Cargar contactos de clientes al montar o cuando cambien las deliveries
    useEffect(() => {
        const loadAllCustomerContacts = async () => {
            try {
                const customers = await dataService.getCustomers();
                const contactsMap: {[email: string]: {phone?: string, countryCode?: string}} = {};
                
                customers.forEach(customer => {
                    if (customer.userInfo?.email) {
                        contactsMap[customer.userInfo.email] = {
                            phone: customer.userInfo.phone,
                            countryCode: customer.userInfo.countryCode
                        };
                    }
                });
                
                setCustomerContacts(contactsMap);
            } catch (error) {
                console.error('Error loading customer contacts:', error);
            }
        };

        if (deliveries.length > 0) {
            loadAllCustomerContacts();
        }
    }, [deliveries.length]);

    const getCustomerContactInfo = async (customerEmail: string) => {
        if (customerContacts[customerEmail]) return customerContacts[customerEmail];
        
        try {
            const customers = await dataService.getCustomers();
            const customer = customers.find(c => c.userInfo.email === customerEmail);
            const contactInfo = {
                phone: customer?.userInfo.phone,
                countryCode: customer?.userInfo.countryCode
            };
            setCustomerContacts(prev => ({...prev, [customerEmail]: contactInfo}));
            return contactInfo;
        } catch (error) {
            console.error('Error fetching customer contact:', error);
            return { phone: undefined, countryCode: undefined };
        }
    };

    const handleWhatsAppContact = async (customerEmail: string, deliveryDescription?: string) => {
        const contactInfo = await getCustomerContactInfo(customerEmail);
        
        if (!contactInfo.phone) {
            alert('No se encontró número de teléfono para este cliente');
            return;
        }
        
        const cleanPhone = contactInfo.phone.replace(/[^\d]/g, '');
        const fullPhone = contactInfo.countryCode ? 
            `${contactInfo.countryCode}${cleanPhone}` : 
            cleanPhone;
        
        const message = encodeURIComponent(
            `¡Hola! 👋 Te escribo desde CeramicAlma. ¿Cómo estás? Quería ponerme en contacto contigo para coordinar la entrega de tus piezas 🎨✨`
        );
        
        const whatsappUrl = `https://wa.me/${fullPhone}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    const exportToPDF = async () => {
        // ⚡ Cargar fotos de todas las deliveries antes de exportar
        const deliveriesWithPhotos = await Promise.all(
            filteredDeliveries.map(async (delivery) => {
                if (delivery.hasPhotos && (!delivery.photos || delivery.photos.length === 0)) {
                    const photos = await dataService.getDeliveryPhotos(delivery.id);
                    return { ...delivery, photos };
                }
                return delivery;
            })
        );
        
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

        // Iterate through each delivery (using deliveries with photos already loaded)
        deliveriesWithPhotos.forEach((delivery, idx) => {
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
                    
                    {/* 🎨 Filtros de Servicio de Pintura */}
                    {(deliveries.filter(d => d.wantsPainting).length > 0) && (
                        <>
                            <div className="w-full border-t border-purple-200 my-2"></div>
                            <div className="w-full flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-purple-700">🎨 SERVICIO DE PINTURA:</span>
                            </div>
                            <button
                                onClick={() => setFilterStatus('wants_painting')}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                                    filterStatus === 'wants_painting'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-300'
                                }`}
                            >
                                ✨ Todos con pintura ({deliveries.filter(d => d.wantsPainting).length})
                            </button>
                            {deliveries.filter(d => d.wantsPainting && d.paintingStatus === 'pending_payment').length > 0 && (
                                <button
                                    onClick={() => setFilterStatus('painting_pending_payment')}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                                        filterStatus === 'painting_pending_payment'
                                            ? 'bg-orange-600 text-white'
                                            : 'bg-white text-orange-700 hover:bg-orange-50 border border-orange-300'
                                    }`}
                                >
                                    💰 Pendiente pago ({deliveries.filter(d => d.wantsPainting && d.paintingStatus === 'pending_payment').length})
                                </button>
                            )}
                            {deliveries.filter(d => d.wantsPainting && d.paintingStatus === 'paid' && d.status === 'ready').length > 0 && (
                                <button
                                    onClick={() => setFilterStatus('painting_ready')}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                                        filterStatus === 'painting_ready'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-white text-green-700 hover:bg-green-50 border border-green-300'
                                    }`}
                                >
                                    🎨 Listos a pintar ({deliveries.filter(d => d.wantsPainting && d.paintingStatus === 'paid' && d.status === 'ready').length})
                                </button>
                            )}
                            {deliveries.filter(d => d.wantsPainting && d.paintingStatus === 'scheduled').length > 0 && (
                                <button
                                    onClick={() => setFilterStatus('painting_scheduled')}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                                        filterStatus === 'painting_scheduled'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-300'
                                    }`}
                                >
                                    📅 Pintura agendada ({deliveries.filter(d => d.wantsPainting && d.paintingStatus === 'scheduled').length})
                                </button>
                            )}
                            {deliveries.filter(d => d.wantsPainting && d.paintingStatus === 'completed').length > 0 && (
                                <button
                                    onClick={() => setFilterStatus('painting_completed')}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                                        filterStatus === 'painting_completed'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-300'
                                    }`}
                                >
                                    ✅ Pintura completada ({deliveries.filter(d => d.wantsPainting && d.paintingStatus === 'completed').length})
                                </button>
                            )}
                        </>
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
                            ref={(node) => deliveryCardRef(node, delivery)}
                            data-delivery-id={delivery.id}
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
                                    {customerContacts[delivery.customerEmail]?.phone && (
                                        <p className="text-xs sm:text-sm text-gray-500 font-mono">📱 {customerContacts[delivery.customerEmail].phone}</p>
                                    )}
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

                                {/* Servicio de Pintura */}
                                {delivery.wantsPainting && (
                                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold text-purple-900">🎨 Servicio de Pintura</p>
                                            <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-bold">
                                                ${delivery.paintingPrice || 25}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-700">Estado:</span>
                                            {delivery.paintingStatus === 'pending_payment' && (
                                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-bold border border-yellow-300">
                                                    💰 Pendiente pago
                                                </span>
                                            )}
                                            {delivery.paintingStatus === 'paid' && (
                                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold border border-green-300">
                                                    ✅ Pagado
                                                </span>
                                            )}
                                            {delivery.paintingStatus === 'scheduled' && delivery.paintingBookingDate && (
                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold border border-blue-300">
                                                    📅 Agendado: {formatDate(delivery.paintingBookingDate)}
                                                </span>
                                            )}
                                            {delivery.paintingStatus === 'completed' && (
                                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-bold border border-purple-300">
                                                    🎉 Completado
                                                </span>
                                            )}
                                        </div>
                                        {delivery.paintingStatus === 'pending_payment' && (
                                            <p className="text-xs text-purple-700 font-medium">
                                                ⚠️ Cliente debe coordinar pago inmediato
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Fotos - Responsive grid con lazy loading automático */}
                                {(() => {
                                    const photos = getDeliveryPhotos(delivery);
                                    const hasPhotos = photos.length > 0 || delivery.hasPhotos;
                                    const isLoading = loadingPhotos[delivery.id];
                                    
                                    if (!hasPhotos) return null;
                                    
                                    // Si hay fotos cargadas, mostrar grid
                                    if (photos.length > 0) {
                                        return (
                                            <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                                                {photos.slice(0, 5).map((photo, i) => (
                                                    <div
                                                        key={i}
                                                        className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-brand-primary transition-all hover:scale-105 shadow-sm"
                                                        onClick={() => handleOpenPhotos(delivery.id, photos, i)}
                                                        title="Click para ver en grande"
                                                    >
                                                        <img 
                                                            src={photo} 
                                                            alt={`Foto ${i + 1}`}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                ))}
                                                {photos.length > 5 && (
                                                    <div 
                                                        className="aspect-square flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-gray-300 text-gray-700 text-xs sm:text-sm font-bold cursor-pointer hover:from-gray-200 hover:to-gray-300 transition-all shadow-sm"
                                                        onClick={() => handleOpenPhotos(delivery.id, photos, 5)}
                                                        title="Ver todas las fotos"
                                                    >
                                                        +{photos.length - 5}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    
                                    // ⚡ Si hasPhotos pero no están cargadas, mostrar skeleton animado
                                    if (isLoading) {
                                        return (
                                            <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                                                {[...Array(3)].map((_, i) => (
                                                    <div 
                                                        key={i}
                                                        className="aspect-square rounded-lg bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse border border-gray-300"
                                                        style={{
                                                            backgroundSize: '200% 200%',
                                                            animation: 'gradient 1.5s ease infinite'
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    }
                                    
                                    // Si hasPhotos pero aún no se han cargado (esperando Intersection Observer)
                                    return (
                                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                            📷 Fotos disponibles (cargando automáticamente...)
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Card Footer - Action Buttons */}
                            <div className="bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-200 flex flex-wrap gap-2">
                                {/* Botones de gestión de pintura */}
                                {delivery.wantsPainting && delivery.paintingStatus === 'pending_payment' && (
                                    <button
                                        className="flex-1 xs:flex-none inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border border-yellow-600 shadow-sm transition-all text-xs sm:text-sm font-bold"
                                        title="Marcar pago de pintura como recibido"
                                        onClick={async () => {
                                            if (confirm('¿Confirmas que el cliente pagó el servicio de pintura ($25)?')) {
                                                try {
                                                    const result = await dataService.updatePaintingStatus(delivery.id, 'paid');
                                                    if (result.success) {
                                                        adminData.refreshCritical();
                                                    } else {
                                                        alert('Error: ' + (result.error || 'No se pudo actualizar'));
                                                    }
                                                } catch (error) {
                                                    console.error('Error marking as paid:', error);
                                                    alert('Error al actualizar el estado');
                                                }
                                            }
                                        }}
                                    >
                                        <span>💰</span>
                                        <span className="hidden xs:inline">Marcar Pagado</span>
                                    </button>
                                )}

                                {delivery.wantsPainting && delivery.paintingStatus === 'paid' && delivery.status === 'ready' && (
                                    <button
                                        className="flex-1 xs:flex-none inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border border-blue-600 shadow-sm transition-all text-xs sm:text-sm font-bold"
                                        title="Agendar sesión de pintura"
                                        onClick={() => {
                                            const dateStr = prompt('Fecha de pintura (YYYY-MM-DD):');
                                            if (dateStr) {
                                                try {
                                                    const date = new Date(dateStr);
                                                    if (isNaN(date.getTime())) {
                                                        alert('Fecha inválida. Usa formato YYYY-MM-DD');
                                                        return;
                                                    }
                                                    dataService.updatePaintingStatus(delivery.id, 'scheduled', {
                                                        paintingBookingDate: date.toISOString()
                                                    }).then(result => {
                                                        if (result.success) {
                                                            adminData.refreshCritical();
                                                        } else {
                                                            alert('Error: ' + (result.error || 'No se pudo agendar'));
                                                        }
                                                    });
                                                } catch (error) {
                                                    console.error('Error scheduling:', error);
                                                    alert('Error al agendar');
                                                }
                                            }
                                        }}
                                    >
                                        <span>📅</span>
                                        <span className="hidden xs:inline">Agendar</span>
                                    </button>
                                )}

                                {delivery.wantsPainting && delivery.paintingStatus === 'scheduled' && (
                                    <button
                                        className="flex-1 xs:flex-none inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border border-purple-600 shadow-sm transition-all text-xs sm:text-sm font-bold"
                                        title="Marcar pintura como completada"
                                        onClick={async () => {
                                            if (confirm('¿Confirmas que el cliente completó la sesión de pintura?')) {
                                                try {
                                                    const result = await dataService.updatePaintingStatus(delivery.id, 'completed');
                                                    if (result.success) {
                                                        adminData.refreshCritical();
                                                    } else {
                                                        alert('Error: ' + (result.error || 'No se pudo completar'));
                                                    }
                                                } catch (error) {
                                                    console.error('Error completing painting:', error);
                                                    alert('Error al completar');
                                                }
                                            }
                                        }}
                                    >
                                        <span>🎉</span>
                                        <span className="hidden xs:inline">Completar</span>
                                    </button>
                                )}

                                {/* Botones estándar */}
                                <button
                                    className="flex-1 xs:flex-none inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 shadow-sm transition-all text-xs sm:text-sm font-semibold"
                                    title="Contactar cliente por WhatsApp"
                                    onClick={() => handleWhatsAppContact(delivery.customerEmail, delivery.description)}
                                >
                                    <span className="text-base sm:text-lg">📱</span>
                                    <span className="hidden xs:inline">WhatsApp</span>
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
                <div className="fixed bottom-6 left-6 right-6 z-50 max-w-2xl mx-auto animate-fade-in">
                    {/* Glassmorphism + Neomorphism Toolbar */}
                    <div className="backdrop-blur-xl bg-gradient-to-br from-white/85 via-white/75 to-white/65 border border-white/40 rounded-2xl p-5 shadow-2xl"
                        style={{
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15), inset 0 1px 1px 0 rgba(255,255,255,0.5)',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.6) 100%)'
                        }}>
                        
                        {/* Header with count */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold text-sm shadow-lg">
                                    {selectedDeliveries.size}
                                </div>
                                <p className="text-sm font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                    {selectedDeliveries.size} entrega{selectedDeliveries.size !== 1 ? 's' : ''} seleccionada{selectedDeliveries.size !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedDeliveries(new Set())}
                                disabled={isProcessingBulk}
                                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                            >
                                ✕
                            </button>
                        </div>
                    
                        {/* Feedback messages */}
                        {bulkFeedback && (
                            <div className={`mb-4 p-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                                bulkFeedback.type === 'success' ? 'bg-gradient-to-r from-green-100/80 to-emerald-100/80 text-green-800 border border-green-200/50' :
                                bulkFeedback.type === 'error' ? 'bg-gradient-to-r from-red-100/80 to-rose-100/80 text-red-800 border border-red-200/50' :
                                'bg-gradient-to-r from-amber-100/80 to-yellow-100/80 text-amber-800 border border-amber-200/50'
                            }`}
                            style={{
                                boxShadow: bulkFeedback.type === 'success' ? '0 4px 15px rgba(16, 185, 129, 0.1)' :
                                           bulkFeedback.type === 'error' ? '0 4px 15px rgba(239, 68, 68, 0.1)' :
                                           '0 4px 15px rgba(217, 119, 6, 0.1)'
                            }}>
                                {bulkFeedback.message}
                            </div>
                        )}
                        
                        {/* Action buttons */}
                        <div className="flex gap-2 flex-wrap">
                        {/* Marcar como Lista Tooltip */}
                        <div className="group relative flex-1 sm:flex-none">
                            <button
                                onClick={async () => {
                                    setBulkFeedback(null);
                                    setIsProcessingBulk(true);
                                    try {
                                        console.log('[DEBUG] Starting markReady for deliveries:', Array.from(selectedDeliveries));
                                        const result = await dataService.bulkUpdateDeliveryStatus(
                                            Array.from(selectedDeliveries),
                                            'markReady'
                                        );
                                        console.log('[DEBUG] markReady result:', result);
                                        
                                        if (result.success && result.summary.succeeded > 0) {
                                            const emailFailed = (result.results || []).filter((r: any) => r.emailSent === false).length;
                                            setBulkFeedback({
                                                message: `✅ ${result.summary.succeeded} entrega(s) marcadas como listas${emailFailed > 0 ? ` · ⚠️ ${emailFailed} correo(s) no se enviaron` : ''}`,
                                                type: 'success'
                                            });
                                            setSelectedDeliveries(new Set());
                                            
                                            // Refresh critical data without full reload
                                            adminData.refreshCritical();
                                        } else if (result.summary.failed > 0) {
                                            setBulkFeedback({
                                                message: `⚠️ ${result.summary.succeeded} exitosas, ${result.summary.failed} fallaron. Errores: ${result.errors.map(e => `${e.id}: ${e.error}`).join('; ')}`,
                                                type: 'warning'
                                            });
                                        } else {
                                            setBulkFeedback({
                                                message: '❌ Error: No se pudieron marcar como listas',
                                                type: 'error'
                                            });
                                        }
                                        
                                    } catch (err) {
                                        console.error('[DEBUG] markReady error:', err);
                                        setBulkFeedback({
                                            message: `❌ Error: ${err instanceof Error ? err.message : 'Error desconocido'}`,
                                            type: 'error'
                                        });
                                    } finally {
                                        setIsProcessingBulk(false);
                                    }
                                }}
                                disabled={isProcessingBulk}
                                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-purple-600 hover:to-purple-700 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-purple-500/50"
                                style={{
                                    boxShadow: '0 4px 15px rgba(147, 51, 234, 0.3)'
                                }}
                            >
                                {isProcessingBulk ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        <span className="hidden sm:inline">Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>✨</span>
                                        <span className="hidden sm:inline">Marcar {selectedDeliveries.size} como Listas</span>
                                        <span className="sm:hidden">Listas</span>
                                        <QuestionMarkCircleIcon className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                            <div className="hidden group-hover:block absolute bottom-full left-0 mb-3 bg-gray-900/95 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-[100] backdrop-blur-sm">
                                Marca como "LISTA PARA RECOGER" para iniciar el conteo de 60 días
                                <div className="absolute top-full left-3 w-2 h-2 bg-gray-900/95 transform rotate-45"></div>
                            </div>
                        </div>

                        {/* Retirada Tooltip */}
                        <div className="group relative flex-1 sm:flex-none">
                            <button
                                onClick={async () => {
                                    if (!confirm(`¿Marcar ${selectedDeliveries.size} entregas como RETIRADAS?`)) return;
                                    
                                    setBulkFeedback(null);
                                    setIsProcessingBulk(true);
                                    try {
                                        console.log('[DEBUG] Starting markCompleted for deliveries:', Array.from(selectedDeliveries));
                                        const result = await dataService.bulkUpdateDeliveryStatus(
                                            Array.from(selectedDeliveries),
                                            'markCompleted'
                                        );
                                        console.log('[DEBUG] markCompleted result:', result);
                                        
                                        if (result.success && result.summary.succeeded > 0) {
                                            const emailFailed = (result.results || []).filter((r: any) => r.emailSent === false).length;
                                            setBulkFeedback({
                                                message: `✅ ${result.summary.succeeded} entrega(s) completadas${emailFailed > 0 ? ` · ⚠️ ${emailFailed} correo(s) no se enviaron` : ''}`,
                                                type: 'success'
                                            });
                                            setSelectedDeliveries(new Set());
                                            
                                            // Refresh critical data without full reload
                                            adminData.refreshCritical();
                                        } else if (result.summary.failed > 0) {
                                            setBulkFeedback({
                                                message: `⚠️ ${result.summary.succeeded} exitosas, ${result.summary.failed} fallaron. Errores: ${result.errors.map(e => `${e.id}: ${e.error}`).join('; ')}`,
                                                type: 'warning'
                                            });
                                        } else {
                                            setBulkFeedback({
                                                message: '❌ Error: No se pudieron completar las entregas',
                                                type: 'error'
                                            });
                                        }
                                        
                                    } catch (err) {
                                        console.error('[DEBUG] markCompleted error:', err);
                                        setBulkFeedback({
                                            message: `❌ Error: ${err instanceof Error ? err.message : 'Error desconocido'}`,
                                            type: 'error'
                                        });
                                    } finally {
                                        setIsProcessingBulk(false);
                                    }
                                }}
                                disabled={isProcessingBulk}
                                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-700 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-green-500/50"
                                style={{
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                                }}
                            >
                                {isProcessingBulk ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        <span className="hidden sm:inline">Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>✓</span>
                                        <span className="hidden sm:inline">Retirada {selectedDeliveries.size}</span>
                                        <span className="sm:hidden">Retirada</span>
                                        <QuestionMarkCircleIcon className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                            <div className="hidden group-hover:block absolute bottom-full left-0 mb-3 bg-gray-900/95 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-[100] backdrop-blur-sm">
                                Marca como "RETIRADA" - finaliza la entrega
                                <div className="absolute top-full left-3 w-2 h-2 bg-gray-900/95 transform rotate-45"></div>
                            </div>
                        </div>

                        {/* Eliminar bulk */}
                        <button
                            onClick={async () => {
                                if (!confirm(`¿ELIMINAR ${selectedDeliveries.size} entregas? Esta acción no se puede deshacer.`)) return;
                                
                                setBulkFeedback(null);
                                setIsProcessingBulk(true);
                                try {
                                    console.log('[DEBUG] Starting delete for deliveries:', Array.from(selectedDeliveries));
                                    const result = await dataService.bulkUpdateDeliveryStatus(
                                        Array.from(selectedDeliveries),
                                        'delete'
                                    );
                                    console.log('[DEBUG] delete result:', result);
                                    
                                    if (result.success && result.summary.succeeded > 0) {
                                        setBulkFeedback({
                                            message: `🗑️ ${result.summary.succeeded} entrega(s) eliminadas`,
                                            type: 'success'
                                        });
                                        setSelectedDeliveries(new Set());
                                        
                                        // Refresh critical data without full reload
                                        adminData.refreshCritical();
                                    } else if (result.summary.failed > 0) {
                                        setBulkFeedback({
                                            message: `⚠️ ${result.summary.succeeded} eliminadas, ${result.summary.failed} fallaron. Errores: ${result.errors.map(e => `${e.id}: ${e.error}`).join('; ')}`,
                                            type: 'warning'
                                        });
                                    } else {
                                        setBulkFeedback({
                                            message: '❌ Error: No se pudieron eliminar las entregas',
                                            type: 'error'
                                        });
                                    }
                                    
                                } catch (err) {
                                    console.error('[DEBUG] delete error:', err);
                                    setBulkFeedback({
                                        message: `❌ Error: ${err instanceof Error ? err.message : 'Error desconocido'}`,
                                        type: 'error'
                                    });
                                } finally {
                                    setIsProcessingBulk(false);
                                }
                            }}
                            disabled={isProcessingBulk}
                            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl text-sm font-semibold hover:from-red-600 hover:to-rose-700 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-red-500/50"
                            style={{
                                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                            }}
                        >
                            {isProcessingBulk ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    <span className="hidden sm:inline">Procesando...</span>
                                </>
                            ) : (
                                <>
                                    <span>🗑️</span>
                                    <span className="hidden sm:inline">Eliminar {selectedDeliveries.size}</span>
                                    <span className="sm:hidden">Eliminar</span>
                                </>
                            )}
                        </button>
                    </div>
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
