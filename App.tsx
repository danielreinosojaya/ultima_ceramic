import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense, ReactNode } from 'react';
import type { BankDetails } from './types';
import { Header } from './components/Header';
import { WelcomeSelector } from './components/WelcomeSelector';
import { TechniqueSelector } from './components/TechniqueSelector';
import { PackageSelector } from './components/PackageSelector';
import { ScheduleSelector } from './components/ScheduleSelector';
import { BookingSummary } from './components/BookingSummary';
import { CouplesTourModal } from './components/CouplesTourModal';
import { CouplesTechniqueSelector } from './components/CouplesTechniqueSelector';
import { CouplesExperienceScheduler } from './components/CouplesExperienceScheduler';
import { UserInfoModal } from './components/UserInfoModal';
import { PolicyModal } from './components/PolicyModal';
import { BookingTypeModal } from './components/BookingTypeModal';
import { ClassInfoModal } from './components/ClassInfoModal';
import { AnnouncementsBoard } from './components/AnnouncementsBoard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ModuloMarcacionSimple } from './components/ModuloMarcacionSimple';
import { AdminTimecardPanelSimple } from './components/admin/AdminTimecardPanelSimple';
// New Experience Components
import { ExperienceTypeSelector } from './components/experiences/ExperienceTypeSelector';
// Wheel Course Components
// Valentine Components
// Lazy load heavy components to reduce initial bundle
const AdminConsole = lazy(() => import('./components/admin/AdminConsole').then(module => ({ default: module.AdminConsole })));
const GiftcardPersonalization = lazy(() => import('./components/giftcard/GiftcardPersonalization').then(m => ({ default: m.GiftcardPersonalization })));
const GroupInquiryForm = lazy(() => import('./components/GroupInquiryForm').then(m => ({ default: m.GroupInquiryForm })));
const ClientDeliveryForm = lazy(() => import('./components/ClientDeliveryForm').then(m => ({ default: m.ClientDeliveryForm })));
const CashierDashboard = lazy(() => import('./components/CashierDashboard').then(m => ({ default: m.CashierDashboard })));
const GroupClassWizard = lazy(() => import('./components/experiences/GroupClassWizard').then(m => ({ default: m.GroupClassWizard })));
const PieceExperienceWizard = lazy(() => import('./components/experiences/PieceExperienceWizard').then(m => ({ default: m.PieceExperienceWizard })));
const SingleClassWizard = lazy(() => import('./components/experiences/SingleClassWizard').then(m => ({ default: m.SingleClassWizard })));
const PaintingBookingFlow = lazy(() => import('./components/experiences/PaintingBookingFlow').then(m => ({ default: m.PaintingBookingFlow })));
const CustomExperienceWizard = lazy(() => import('./components/experiences/CustomExperienceWizard').then(m => ({ default: m.CustomExperienceWizard })));
const CourseWheelLanding = lazy(() => import('./components/courses/CourseWheelLanding').then(m => ({ default: m.CourseWheelLanding })));
const CourseScheduleSelector = lazy(() => import('./components/courses/CourseScheduleSelector').then(m => ({ default: m.CourseScheduleSelector })));
const CourseRegistrationForm = lazy(() => import('./components/courses/CourseRegistrationForm').then(m => ({ default: m.CourseRegistrationForm })));
const CourseConfirmation = lazy(() => import('./components/courses/CourseConfirmation').then(m => ({ default: m.CourseConfirmation })));
const ValentineLanding = lazy(() => import('./components/valentine/ValentineLanding').then(m => ({ default: m.ValentineLanding })));
const ValentineRegistrationForm = lazy(() => import('./components/valentine/ValentineRegistrationForm').then(m => ({ default: m.ValentineRegistrationForm })));
const ValentineSuccess = lazy(() => import('./components/valentine/ValentineSuccess').then(m => ({ default: m.ValentineSuccess })));
import { NotificationProvider } from './context/NotificationContext';
import { AdminDataProvider } from './context/AdminDataContext';
import { AuthProvider } from './context/AuthContext';
import { ConfirmationPage } from './components/ConfirmationPage';
import { OpenStudioModal } from './components/admin/OpenStudioModal';
import { MyClassesPrompt } from './components/MyClassesPrompt';
const ClientDashboard = lazy(() => import('./components/ClientDashboard').then(m => ({ default: m.ClientDashboard })));

import type { AppView, Product, Booking, BookingDetails, TimeSlot, Technique, UserInfo, BookingMode, AppData, DeliveryMethod, GiftcardHold, Piece, ExperiencePricing, ExperienceUIState, CourseSchedule, CourseEnrollment, ParticipantTechniqueAssignment, GroupTechnique } from './types';
import * as dataService from './services/dataService';
import { DEFAULT_POLICIES_TEXT } from './constants';
import { slotsRequireNoRefund } from './utils/bookingPolicy';
import { InstagramIcon } from './components/icons/InstagramIcon';
import { WhatsAppIcon } from './components/icons/WhatsAppIcon';
import { MailIcon } from './components/icons/MailIcon';
import { LocationPinIcon } from './components/icons/LocationPinIcon';
import { GiftcardInviteModal } from './components/giftcard/GiftcardInviteModal';
const LandingGiftcard = lazy(() => import('./components/giftcard/LandingGiftcard').then(m => ({ default: m.LandingGiftcard })));
const GiftcardAmountSelector = lazy(() => import('./components/giftcard/GiftcardAmountSelector').then(m => ({ default: m.GiftcardAmountSelector })));
import { GiftcardBanner } from './components/giftcard/GiftcardBanner';
import { GiftcardDeliveryOptions } from './components/giftcard/GiftcardDeliveryOptions';
import { GiftcardPayment } from './components/giftcard/GiftcardPayment';
import { GiftcardConfirmation } from './components/giftcard/GiftcardConfirmation';
import { GiftcardManualPaymentInstructions } from './components/giftcard/GiftcardManualPaymentInstructions';
import { GiftcardPendingReview } from './components/giftcard/GiftcardPendingReview';
import { GiftcardBalanceChecker } from './components/giftcard/GiftcardBalanceChecker';

const App: React.FC = () => {
    const [giftcardPaid, setGiftcardPaid] = useState(false);
    const [giftcardPersonalization, setGiftcardPersonalization] = useState<any>(null);
    const [giftcardAmount, setGiftcardAmount] = useState<number | null>(null);
    const [selectedDelivery, setSelectedDelivery] = useState<DeliveryMethod | null>(null);
    const [giftcardBuyerEmail, setGiftcardBuyerEmail] = useState<string>('');
    const [showGiftcardBanner, setShowGiftcardBanner] = useState(true);
    const [prefillTechnique, setPrefillTechnique] = useState<GroupTechnique | null>(null);
    // Modal informativo de Open Studio usando ClassInfoModal
    const handleOpenStudioInfoModalClose = () => {
        setIsOpenStudioModalOpen(false);
        setTechnique(null);
    };
    const handleOpenStudioInfoModalConfirm = () => {
        setIsOpenStudioModalOpen(false);
        setTechnique('open_studio');
        setBookingDetails(prev => ({ ...prev, product: openStudioProduct }));
        setIsUserInfoModalOpen(true);
    };
    const [isOpenStudioModalOpen, setIsOpenStudioModalOpen] = useState(false);
    const [openStudioProduct, setOpenStudioProduct] = useState<Product | null>(null);
    // Traducciones eliminadas, usar texto en español directamente
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCashierMode, setIsCashierMode] = useState(false);
    const [isClientDeliveryMode, setIsClientDeliveryMode] = useState(false);
    const [adminModule, setAdminModule] = useState<'main' | 'timecards' | null>(null);
    const [adminCode, setAdminCode] = useState<string>('');
    const [view, setView] = useState<AppView>('welcome');
    const [bookingDetails, setBookingDetails] = useState<BookingDetails>({ product: null, slots: [], userInfo: null });
    const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
    const [activeGiftcardHold, setActiveGiftcardHold] = useState<GiftcardHold | null>(null);
    const [appliedGiftcardHold, setAppliedGiftcardHold] = useState<GiftcardHold | null>(null);
    const [technique, setTechnique] = useState<Technique | 'open_studio' | null>(null);
    const [bookingMode, setBookingMode] = useState<BookingMode | null>(null);
    const [bookingInProgress, setBookingInProgress] = useState(false); // Prevent double submit

    const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
    const [isBookingTypeModalOpen, setIsBookingTypeModalOpen] = useState(false);
    const [isClassInfoModalOpen, setIsClassInfoModalOpen] = useState(false);
    const [showMyClassesPrompt, setShowMyClassesPrompt] = useState(false);
    const [hasCheckedMyClasses, setHasCheckedMyClasses] = useState(false);
    const [clientEmail, setClientEmail] = useState<string | null>(null);
    
    // COUPLES_EXPERIENCE states
    const [isCouplesExperience, setIsCouplesExperience] = useState(false);
    const [isCouplesTourModalOpen, setIsCouplesTourModalOpen] = useState(false);
    const [couplesTechnique, setCouplesTechnique] = useState<'potters_wheel' | 'molding' | null>(null);
    
    // NEW EXPERIENCE SYSTEM states
    const [experienceType, setExperienceType] = useState<'individual' | 'group' | 'experience' | null>(null);
    const [pieces, setPieces] = useState<Piece[]>([]);
    const [experienceUIState, setExperienceUIState] = useState<ExperienceUIState>({
        step: 1,
        piecesSelected: [],
        durationMinutes: undefined,
        guidedOption: undefined,
        pricing: undefined,
        isLoading: false,
        error: undefined
    });
    const [groupClassConfig] = useState({
        minParticipants: 2,
        maxParticipants: 30,
        pricePerPerson: 15,
        estimatedDuration: 120
    });
    
    // WHEEL COURSE states
    const [selectedCourseSchedule, setSelectedCourseSchedule] = useState<CourseSchedule | null>(null);
    const [confirmedEnrollment, setConfirmedEnrollment] = useState<CourseEnrollment | null>(null);
    
    // VALENTINE 2026 states
    const [valentineRegistrationId, setValentineRegistrationId] = useState<string | null>(null);
    const [paintingDeliveryId, setPaintingDeliveryId] = useState<string | null>(null);
    
    const [appData, setAppData] = useState<AppData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const pathname = window.location.pathname;
        const href = window.location.href;

        // Check for Valentine registration page - /sanvalentin or ?sanvalentin=true
        if (pathname.includes('/sanvalentin') || href.includes('/sanvalentin') || urlParams.get('sanvalentin') === 'true') {
            setView('valentine_landing');
            return;
        }

        // Check for cashier mode - supports both /cuadre and ?cuadre=true
        if (pathname.includes('/cuadre') || href.includes('/cuadre') || urlParams.get('cuadre') === 'true') {
            setIsCashierMode(true);
            return;
        }

        const bookingParam = urlParams.get('booking') || urlParams.get('product');
        const techniqueParam = urlParams.get('technique');
        if (bookingParam === 'painting' || techniqueParam === 'painting') {
            setPrefillTechnique('painting');
            setPaintingDeliveryId(urlParams.get('deliveryId'));
            setView('painting_booking');
            return;
        }

        if (urlParams.get('admin') === 'true') {
            setIsAdmin(true);
            const code = urlParams.get('code');
            if (code) setAdminCode(code);
        }
        if (urlParams.get('clientMode') === 'delivery') {
            setIsClientDeliveryMode(true);
        }
        const moduleParam = urlParams.get('module');
        if (moduleParam === 'timecards') {
            setAdminModule('timecards');
            // Si accede al módulo de timecards, usar código por defecto si no está especificado
            const code = urlParams.get('code') || 'ADMIN2025';
            setAdminCode(code);
        }
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [view]);

    useEffect(() => {
        const fetchAppData = async () => {
            try {
                // Load only essential data for initial render usando batch optimizado
                console.log('Loading essential app data...');
                const essentialData = await dataService.getEssentialAppData();

                // Provide safe defaults so the UI doesn't crash when the API is unavailable
                const safeFooter = {
                    whatsapp: (essentialData.footerInfo && essentialData.footerInfo.whatsapp) || '',
                    email: (essentialData.footerInfo && essentialData.footerInfo.email) || '',
                    instagramHandle: (essentialData.footerInfo && essentialData.footerInfo.instagramHandle) || '',
                    address: (essentialData.footerInfo && essentialData.footerInfo.address) || '',
                    googleMapsLink: (essentialData.footerInfo && essentialData.footerInfo.googleMapsLink) || '#',
                };

                setAppData({
                    products: essentialData.products || [], 
                    announcements: essentialData.announcements || [], 
                    policies: essentialData.policies || DEFAULT_POLICIES_TEXT, 
                    footerInfo: safeFooter,
                    // Initialize empty data structures for lazy loading
                    instructors: [],
                    availability: { Sunday: [], Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] },
                    scheduleOverrides: {},
                    classCapacity: { potters_wheel: 0, molding: 0, introductory_class: 0 },
                    capacityMessages: { thresholds: [] },
                    bookings: [],
                    confirmationMessage: { title: '', message: '' },
                    bankDetails: [] as BankDetails[],
                });
                
                console.log('Essential app data loaded successfully');
            } catch (error) {
                console.error("Failed to load initial app data:", error);
                alert("Error cargando datos: " + (error?.message || error));
            } finally {
                setLoading(false);
            }
        };
        
        // Use setTimeout to prevent blocking initial render
        setTimeout(fetchAppData, 0);
    }, []);

    // Load pieces for experience wizard
    useEffect(() => {
        const loadPieces = async () => {
            try {
                const response = await fetch('/api/data?action=listPieces');
                if (response.ok) {
                    const data = await response.json();
                    setPieces(data.data || []);
                }
            } catch (error) {
                console.error('Error loading pieces:', error);
            }
        };
        loadPieces();
    }, []);

    // Check if there are saved bookings and show prompt
    // Solo mostrar si:
    // 1. El usuario está autenticado (tiene email + código de reserva)
    // 2. Tiene clases FUTURAS (no completadas)
    // 3. Es la primera carga (no fue descartado)
    // 4. No está en una vista diferente ya
    useEffect(() => {
        if (!hasCheckedMyClasses && !loading && view === 'welcome') {
            const savedClientEmail = localStorage.getItem('clientEmail');
            const clientBookingCode = localStorage.getItem('clientBookingCode');
            const lastBookingId = localStorage.getItem('lastBookingId');
            const promptDismissed = sessionStorage.getItem('myClassesPromptDismissed');
            
            // Guardar email en state para mostrar en header
            if (savedClientEmail) {
                setClientEmail(savedClientEmail);
            }
            
            // Validar que tiene clases futuras
            const checkFutureClasses = async () => {
                try {
                    if (savedClientEmail && clientBookingCode && lastBookingId && !promptDismissed) {
                        const booking = await dataService.getBookingById(lastBookingId);
                        
                        // Verificar si hay clases futuras
                        let hasUpcomingClasses = false;
                        if (booking?.slots && booking.slots.length > 0) {
                            const now = new Date();
                            hasUpcomingClasses = booking.slots.some((slot: any) => {
                                if (!slot || !slot.date) return false;
                                const slotDate = new Date(slot.date);
                                return slotDate > now;
                            });
                        }
                        
                        // Solo mostrar pop-up si tiene clases futuras
                        if (hasUpcomingClasses) {
                            setShowMyClassesPrompt(true);
                        }
                    }
                } catch (err) {
                    console.error('Error checking future classes:', err);
                }
            };
            
            checkFutureClasses();
            setHasCheckedMyClasses(true);
        }
    }, [loading, hasCheckedMyClasses, view]);

    const handleWelcomeSelect = (userType: 'returning' | 'group_experience' | 'couples_experience' | 'team_building' | 'open_studio' | 'group_class_wizard' | 'single_class_wizard' | 'wheel_course' | 'custom_experience') => {
        setPrefillTechnique(null);
        if (userType === 'returning') {
            setView('techniques');
        } else if (userType === 'group_experience') {
            setView('group_experience');
        } else if (userType === 'couples_experience') {
            const product = appData?.products.find(p => p.type === 'COUPLES_EXPERIENCE') || null;
            setBookingDetails(prev => ({ ...prev, product }));
            setIsCouplesExperience(true);
            setCouplesTechnique(null);
            setIsCouplesTourModalOpen(true);
        } else if (userType === 'team_building') {
            setView('team_building');
        } else if (userType === 'open_studio') {
            const product = appData?.products.find(p => p.type === 'OPEN_STUDIO_SUBSCRIPTION') || null;
            setOpenStudioProduct(product);
            setIsOpenStudioModalOpen(true);
        } else if (userType === 'group_class_wizard') {
            // Direct to group class wizard - skip experience type selector
            setView('group_class_wizard');
        } else if (userType === 'single_class_wizard') {
            // Direct to single class wizard
            setView('single_class_wizard');
        } else if (userType === 'wheel_course') {
            setView('wheel_course_landing');
        } else if (userType === 'custom_experience') {
            // New: Custom Experience Wizard
            setView('custom_experience_wizard');
        }
    };
    
    
    const handleCourseScheduleSelect = (schedule: CourseSchedule) => {
        setSelectedCourseSchedule(schedule);
        setView('wheel_course_registration');
    };
    
    const handleCourseEnrollmentSubmit = async (enrollment: Partial<CourseEnrollment>) => {
        try {
            const result = await dataService.enrollInCourse({
                studentEmail: enrollment.studentEmail!,
                studentInfo: enrollment.studentInfo!,
                courseScheduleId: enrollment.courseScheduleId!,
                experience: (enrollment.studentInfo as any)?.experience || 'beginner',
                specialConsiderations: (enrollment.studentInfo as any)?.specialConsiderations
            });

            if (result.success && result.data) {
                setConfirmedEnrollment(result.data);
                setView('wheel_course_confirmation');
            } else {
                alert('Error al procesar la inscripción: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error enrolling:', error);
            alert('Error al procesar la inscripción. Por favor intenta de nuevo.');
        }
    };

    // Login function for client portal
    const handleClientLogin = () => {
        setView('my-classes');
    };

    // Logout function for client portal
    const handleClientLogout = () => {
        // Clear client authentication
        localStorage.removeItem('clientEmail');
        localStorage.removeItem('clientBookingCode');
        localStorage.removeItem('lastBookingId');
        sessionStorage.removeItem('myClassesPromptDismissed');
        
        // Reset state
        setClientEmail(null);
        setView('welcome');
        setShowMyClassesPrompt(false);
    };

    const handleTechniqueSelect = (selectedTechnique: Technique | 'open_studio') => {
        if (selectedTechnique === 'open_studio') {
            const product = appData?.products.find(p => p.type === 'OPEN_STUDIO_SUBSCRIPTION') || null;
            setOpenStudioProduct(product);
            setIsOpenStudioModalOpen(true);
        } else {
            setTechnique(selectedTechnique);
            setView('packages');
        }
    };

    const handleBookingTypeSelect = (mode: BookingMode) => {
        setBookingMode(mode);
        setIsBookingTypeModalOpen(false);
        setIsClassInfoModalOpen(true);
    };

    const handlePackageSelect = (product: Product) => {
        setBookingDetails(prev => ({ ...prev, product }));
        if (product.type === 'CLASS_PACKAGE' && product.classes === 4) {
            setIsBookingTypeModalOpen(true);
        } else {
            // For other class packages, default to flexible mode.
            // For non-packages (e.g., open studio), bookingMode isn't needed at this stage.
            if (product.type === 'CLASS_PACKAGE') {
                setBookingMode('flexible');
            }
            setIsClassInfoModalOpen(true);
        }
    };

    const handleClassInfoConfirm = () => {
        setIsClassInfoModalOpen(false);
        if (bookingDetails.product?.type === 'OPEN_STUDIO_SUBSCRIPTION') {
            setIsUserInfoModalOpen(true);
        } else {
            setView('schedule');
        }
    };
    
    const handleScheduleConfirm = (slots: TimeSlot[]) => {
        setBookingDetails(prev => ({ ...prev, slots }));
        setView('summary');
    };
    
    const handleSummaryConfirm = () => {
        setIsUserInfoModalOpen(true);
    };

    const handleUserInfoSubmit = async (data: { userInfo: UserInfo, needsInvoice: boolean, invoiceData?: any, acceptedNoRefund?: boolean }) => {
        // Prevent double submission
        if (bookingInProgress) {
            console.warn('[App] Booking already in progress, ignoring duplicate submit');
            return;
        }

        setBookingInProgress(true);
        console.log('[App] Starting booking submission...');

        const finalDetails = { ...bookingDetails, userInfo: data.userInfo };
        
        // Determine if selected slots require acceptance of no-refund policy
        const requiresImmediateAcceptance = slotsRequireNoRefund(finalDetails.slots || [], 48);
        
        const bookingData: any = {
            product: finalDetails.product!,
            productId: finalDetails.product!.id,
            productType: finalDetails.product!.type,
            slots: finalDetails.slots,
            userInfo: data.userInfo,
            isPaid: false,
            price: 'price' in finalDetails.product! ? finalDetails.product.price : 0,
            bookingMode: bookingMode || 'flexible',
            bookingDate: new Date().toISOString(),
            invoiceData: data.needsInvoice ? data.invoiceData : undefined,
            acceptedNoRefund: requiresImmediateAcceptance ? !!data.acceptedNoRefund : false
        };

        // Add technique for COUPLES_EXPERIENCE
        if (finalDetails.product!.type === 'COUPLES_EXPERIENCE' && finalDetails.technique) {
            bookingData.technique = finalDetails.technique;
        }

        // Add groupClassMetadata for GROUP_CLASS bookings
        if (finalDetails.product!.type === 'GROUP_CLASS') {
            const assignments = (window as any).__groupClassAssignments as ParticipantTechniqueAssignment[] | undefined;
            if (assignments && assignments.length > 0) {
                const totalPrice = 'price' in finalDetails.product! ? finalDetails.product.price : 0;
                const pricePerPerson = assignments.length > 0 ? totalPrice / assignments.length : 0;
                
                bookingData.groupClassMetadata = {
                    totalParticipants: assignments.length,
                    techniqueAssignments: assignments,
                    pricePerPerson,
                    totalPrice
                };
                bookingData.participants = assignments.length;
            }
        }

        try {
            // Attach giftcard info if the user applied a giftcard
            if (activeGiftcardHold) {
                if (activeGiftcardHold.holdId) {
                    (bookingData as any).holdId = activeGiftcardHold.holdId;
                }
                if (activeGiftcardHold.giftcardId) {
                    (bookingData as any).giftcardId = activeGiftcardHold.giftcardId;
                }
                if (activeGiftcardHold.code) {
                    (bookingData as any).giftcardCode = activeGiftcardHold.code;
                }
                if (typeof activeGiftcardHold.amount === 'number') {
                    (bookingData as any).giftcardAmount = activeGiftcardHold.amount;
                }
            }

            const result = await dataService.addBooking(bookingData);
            if (result.success && result.booking) {
                console.log('[App] Booking created successfully:', result.booking.bookingCode);
                setBookingDetails(finalDetails);
                setConfirmedBooking(result.booking);
                
                // CRITICAL: Preserve giftcard hold info for ConfirmationPage display
                if (activeGiftcardHold && activeGiftcardHold.amount > 0) {
                    setAppliedGiftcardHold(activeGiftcardHold);
                }
                
                setIsUserInfoModalOpen(false);
                setView('confirmation');
                // Reset flag after successful navigation
                setTimeout(() => setBookingInProgress(false), 1000);
            } else {
                console.error('[App] Booking failed:', result.message);
                setBookingInProgress(false);
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error("[App] Failed to add booking", error);
            setBookingInProgress(false);
            alert("An error occurred while creating your booking.");
        }
    };
    
    // ✅ Ref para prevenir calls duplicados de datos adicionales
    const loadingDataRef = useRef<Record<string, boolean>>({
        scheduling: false,
        bookings: false,
        admin: false
    });
    
    // Función para cargar datos adicionales bajo demanda
    const loadAdditionalData = useCallback(async (dataType: 'scheduling' | 'bookings' | 'admin', currentAppData: AppData) => {
        if (!currentAppData) return;
        
        // ✅ Prevenir calls duplicados usando ref
        if (loadingDataRef.current[dataType]) {
            console.log(`[App] Already loading ${dataType}, skipping`);
            return;
        }
        loadingDataRef.current[dataType] = true;
        
        try {
            let updates: Partial<AppData> = {};
            
            switch (dataType) {
                case 'scheduling':
                    if (currentAppData.instructors.length === 0) {
                        const schedulingData = await dataService.getSchedulingData();
                        updates = {
                            instructors: schedulingData.instructors || [],
                            availability: schedulingData.availability || { Sunday: [], Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] },
                            scheduleOverrides: schedulingData.scheduleOverrides || {},
                            classCapacity: schedulingData.classCapacity || { potters_wheel: 0, molding: 0, introductory_class: 0 },
                            capacityMessages: schedulingData.capacityMessages || { thresholds: [] }
                        };
                    }
                    break;
                case 'bookings':
                    if (currentAppData.bookings.length === 0) {
                        const bookings = await dataService.getBookings();
                        updates = { bookings };
                    }
                    break;
                case 'admin':
                    const [confirmationMessage, bankDetails] = await Promise.all([
                        dataService.getConfirmationMessage(),
                        dataService.getBankDetails()
                    ]);
                    console.log('🔍 App.tsx loadAdditionalData:', {
                        bankDetailsRaw: bankDetails,
                        isArray: Array.isArray(bankDetails),
                        length: Array.isArray(bankDetails) ? bankDetails.length : 0
                    });
                    updates = { confirmationMessage, bankDetails: Array.isArray(bankDetails) ? bankDetails : bankDetails ? [bankDetails] : [] };
                    break;
            }
            
            if (Object.keys(updates).length > 0) {
                setAppData(prev => {
                    const newData = prev ? { ...prev, ...updates } : null;
                    if (newData && Array.isArray(newData.bankDetails)) {
                        console.log('App.tsx: bankDetails en appData tras update:', newData.bankDetails);
                    }
                    return newData;
                });
            }
        } catch (error) {
            console.error(`Failed to load ${dataType} data:`, error);
        } finally {
            // ✅ Siempre resetear el flag para permitir recargas futuras
            loadingDataRef.current[dataType] = false;
        }
    }, []);

    // Load scheduling data when needed for schedule view
    useEffect(() => {
        if ((view === 'schedule' || view === 'group_class_wizard' || view === 'single_class_wizard' || view === 'painting_booking') && appData && appData.instructors.length === 0) {
            loadAdditionalData('scheduling', appData);
        }
        if ((view === 'schedule' || view === 'group_class_wizard' || view === 'single_class_wizard' || view === 'painting_booking') && appData && appData.bookings.length === 0) {
            loadAdditionalData('bookings', appData);
        }
    }, [view, appData, loadAdditionalData]);


    // Load admin data when needed for confirmation view
    // Carga bankDetails y confirmationMessage al entrar a la vista de confirmación si faltan
    useEffect(() => {
        if (
            view === 'confirmation' &&
            appData &&
            (
                !appData.confirmationMessage?.message ||
                !Array.isArray(appData.bankDetails) ||
                appData.bankDetails.length === 0
            )
        ) {
            loadAdditionalData('admin', appData);
        }
    }, [view, appData, loadAdditionalData]);
    
    const resetFlow = () => {
        setView('welcome');
        setBookingDetails({ product: null, slots: [], userInfo: null });
        setTechnique(null);
        setBookingMode(null);
        setConfirmedBooking(null);
    };

    const renderView = () => {
        try {
            if (loading || !appData) {
                return <div className="text-center p-10">Loading...</div>;
            }

            console.log("App renderView - current view:", view, "appData available:", !!appData);

        switch (view) {
            case 'giftcard_landing':
                return <LandingGiftcard 
                    onStart={() => setView('giftcard_amount')} 
                    onCheckBalance={() => setView('giftcard_check_balance')}
                />;
            case 'giftcard_check_balance':
                return <GiftcardBalanceChecker onBack={() => setView('giftcard_landing')} />;
            case 'giftcard_amount':
                return <GiftcardAmountSelector onSelect={amount => { setGiftcardAmount(amount); setView('giftcard_personalization'); }} />;
            case 'giftcard_personalization':
                return giftcardAmount !== null ? (
                    <GiftcardPersonalization
                        amount={giftcardAmount}
                        onPersonalize={data => { setGiftcardPersonalization(data); setView('giftcard_delivery'); }}
                    />
                ) : null;
            case 'giftcard_delivery':
                return (
                    <GiftcardDeliveryOptions
                        onSelect={(option: 'email' | 'physical', data) => {
  setSelectedDelivery({ type: option, data });
  setView('giftcard_payment');
}}
                        onBack={() => setView('giftcard_personalization')}
                    />
                );
            case 'giftcard_payment':
                return (
                    <GiftcardPayment
                        amount={giftcardAmount || 0}
                        deliveryMethod={selectedDelivery || { type: 'email', data: {} }}
                        personalization={giftcardPersonalization}
                        onPay={(buyerEmail) => {
                            setGiftcardBuyerEmail(buyerEmail);
                            setView('giftcard_manual_payment');
                        }}
                        onBack={() => setView('giftcard_delivery')}
                    />
                );
            case 'giftcard_manual_payment':
                return (
                    <GiftcardManualPaymentInstructions
                        amount={giftcardAmount || 0}
                        deliveryMethod={selectedDelivery || { type: 'email', data: {} }} // Ajuste aquí
                        personalization={giftcardPersonalization}
                        buyerEmail={giftcardBuyerEmail}
                        onFinish={() => setView('giftcard_pending_review')}
                    />
                );
            case 'giftcard_pending_review':
                return (
                    <GiftcardPendingReview
                        onFinish={() => { setGiftcardPaid(false); setView('welcome'); }}
                    />
                );
            case 'giftcard_confirmation':
                return (
                    <GiftcardConfirmation
                        amount={giftcardAmount || 0}
                        deliveryMethod={selectedDelivery || { type: 'email', data: {} }}
                        personalization={giftcardPersonalization}
                        onFinish={() => { setView('welcome'); setGiftcardPaid(false); }}
                        onBack={() => setView('giftcard_payment')}
                    />
                );
            case 'welcome':
                return <WelcomeSelector onSelect={handleWelcomeSelect} />;
            case 'wheel_course_landing':
                return <CourseWheelLanding 
                    onContinue={() => setView('wheel_course_schedule')} 
                    onBack={() => setView('welcome')} 
                />;
            case 'wheel_course_schedule':
                return <CourseScheduleSelector 
                    onSelectSchedule={handleCourseScheduleSelect} 
                    onBack={() => setView('wheel_course_landing')} 
                />;
            case 'wheel_course_registration':
                if (!selectedCourseSchedule) return <WelcomeSelector onSelect={handleWelcomeSelect} />;
                return <CourseRegistrationForm 
                    selectedSchedule={selectedCourseSchedule}
                    onSubmit={handleCourseEnrollmentSubmit}
                    onBack={() => setView('wheel_course_schedule')}
                />;
            case 'wheel_course_confirmation':
                if (!confirmedEnrollment || !selectedCourseSchedule) return <WelcomeSelector onSelect={handleWelcomeSelect} />;
                return <CourseConfirmation 
                    enrollment={confirmedEnrollment}
                    schedule={selectedCourseSchedule}
                    onDone={() => {
                        setView('welcome');
                        setSelectedCourseSchedule(null);
                        setConfirmedEnrollment(null);
                    }}
                />;
            case 'techniques':
                return <TechniqueSelector onSelect={handleTechniqueSelect} onBack={() => setView('welcome')} products={appData.products} />;
            case 'packages':
                if (!technique) return <TechniqueSelector onSelect={handleTechniqueSelect} onBack={() => setView('welcome')} products={appData.products} />;
                // Si la técnica es open_studio, nunca mostrar PackageSelector
                if (technique === 'open_studio') return null;
                return <PackageSelector onSelect={handlePackageSelect} technique={technique} products={appData.products} />;
            case 'schedule':
                if (!bookingDetails.product || bookingDetails.product.type !== 'CLASS_PACKAGE' || !bookingMode) return <WelcomeSelector onSelect={handleWelcomeSelect} />;
                return <ScheduleSelector 
                            pkg={bookingDetails.product} 
                            onConfirm={handleScheduleConfirm}
                            initialSlots={bookingDetails.slots}
                            onBack={() => setView('packages')}
                            bookingMode={bookingMode}
                            appData={appData}
                            onAppDataUpdate={(updates) => setAppData(prev => prev ? { ...prev, ...updates } : null)}
                        />;
            case 'summary':
                if (!bookingDetails.product) return <WelcomeSelector onSelect={handleWelcomeSelect} />;
                const handleBackFromSummary = () => {
                    setView('schedule');
                };
                return <BookingSummary 
                    bookingDetails={bookingDetails} 
                    onProceedToConfirmation={handleSummaryConfirm} 
                    onBack={handleBackFromSummary} 
                    appData={appData} 
                    onUseGiftcard={(holdInfo) => setActiveGiftcardHold(holdInfo)}
                    activeGiftcardHold={activeGiftcardHold ? {
                        holdId: activeGiftcardHold.holdId,
                        expiresAt: activeGiftcardHold.expiresAt,
                        amount: activeGiftcardHold.amount || 0, // Asegurar que amount sea un número
                        giftcardId: activeGiftcardHold.giftcardId,
                        code: activeGiftcardHold.code
                    } : null} // Ajuste aquí
                />;
            case 'confirmation':
                if (!confirmedBooking) return <WelcomeSelector onSelect={handleWelcomeSelect} />;
                return <ConfirmationPage 
                    booking={confirmedBooking} 
                    bankDetails={Array.isArray(appData.bankDetails) ? appData.bankDetails : appData.bankDetails ? [appData.bankDetails] : []}
                    footerInfo={appData.footerInfo}
                    policies={appData.policies}
                    onFinish={resetFlow}
                    onNavigateToMyClasses={() => setView('my-classes')}
                    appliedGiftcardHold={appliedGiftcardHold && appliedGiftcardHold.amount > 0 ? {
                        holdId: appliedGiftcardHold.holdId || '',
                        expiresAt: appliedGiftcardHold.expiresAt,
                        amount: appliedGiftcardHold.amount
                    } : null}
                />;
            case 'my-classes':
                return <ClientDashboard onClose={() => setView('welcome')} />;
            case 'group_experience':
            case 'team_building':
                return <GroupInquiryForm 
                            onBack={() => setView('welcome')} 
                            inquiryType={view === 'group_experience' ? 'group' : 'team_building'}
                            footerInfo={appData.footerInfo}
                        />;
            case 'couples_experience': {
                // PASO 1: Técnica selector (si no elegida)
                if (couplesTechnique === null) {
                    const handleCouplesTechniqueSelect = (technique: Technique) => {
                        setCouplesTechnique(technique);
                    };

                    const handleCouplesTechniqueBack = () => {
                        setCouplesTechnique(null);
                        setIsCouplesExperience(false);
                        setBookingDetails({ product: null, slots: [], userInfo: null });
                        setView('welcome');
                    };

                    return (
                        <CouplesTechniqueSelector
                            onSelect={handleCouplesTechniqueSelect}
                            onBack={handleCouplesTechniqueBack}
                        />
                    );
                }
                
                // PASO 2: Scheduler (si técnica elegida, slot NO elegido aún)
                if (!bookingDetails.slots || bookingDetails.slots.length === 0) {
                    // El producto debería estar en bookingDetails
                    let product = bookingDetails.product;
                    
                    if (!product && appData?.products) {
                        product = appData.products.find(p => p.type === 'COUPLES_EXPERIENCE') || null;
                    }
                    
                    if (!product) {
                        return <WelcomeSelector onSelect={handleWelcomeSelect} />;
                    }
                    
                    // Asegurar que bookingDetails tenga el producto
                    if (!bookingDetails.product) {
                        setBookingDetails(prev => ({...prev, product}));
                    }
                    
                    return (
                        <CouplesExperienceScheduler
                            product={product as any}
                            technique={couplesTechnique}
                            onConfirm={(session) => {
                                setBookingDetails(prev => ({
                                    ...prev,
                                    product,
                                    slots: [session],
                                    technique: couplesTechnique
                                }));
                                setView('summary');
                            }}
                            onBack={() => {
                                setCouplesTechnique(null);
                            }}
                            appData={appData}
                            onAppDataUpdate={(updates) => {
                                setAppData(prev => prev ? { ...prev, ...updates } : null);
                            }}
                        />
                    );
                }
                
                // Should not reach here - go to summary
                return <WelcomeSelector onSelect={handleWelcomeSelect} />;
            }

            // ==================== NEW EXPERIENCE VIEWS ====================
            case 'experience_type_selector':
                return (
                    <ExperienceTypeSelector 
                        onSelectType={(type) => {
                            setExperienceType(type);
                            if (type === 'group') {
                                setView('group_class_wizard');
                            } else if (type === 'experience') {
                                setView('piece_experience_wizard');
                            } else {
                                // Individual - normal flow
                                setView('techniques');
                            }
                        }}
                        isLoading={experienceUIState.isLoading}
                    />
                );

            case 'group_class_wizard':
                return (
                    <GroupClassWizard
                        initialTechnique={prefillTechnique || undefined}
                        config={groupClassConfig}
                        pieces={pieces}
                        appData={appData}
                        onConfirm={(totalParticipants, assignments, selectedSlot) => {
                            setBookingDetails(prev => ({
                                ...prev,
                                slots: [selectedSlot],
                                userInfo: null // Will be filled by user info modal
                            }));
                            setExperienceType('group');
                            // Store assignments in a way that can be accessed later
                            (window as any).__groupClassAssignments = assignments;
                            setIsUserInfoModalOpen(true);
                        }}
                        onBack={() => setView('welcome')}
                        isLoading={experienceUIState.isLoading}
                    />
                );

            case 'piece_experience_wizard':
                return (
                    <PieceExperienceWizard
                        pieces={pieces}
                        onConfirm={(pricing: ExperiencePricing) => {
                            setExperienceUIState(prev => ({
                                ...prev,
                                pricing,
                                piecesSelected: pricing.pieces
                            }));
                            setBookingDetails(prev => ({
                                ...prev,
                                userInfo: null // Will be filled by user info modal
                            }));
                            setExperienceType('experience');
                            setIsUserInfoModalOpen(true);
                        }}
                        onBack={() => setView('experience_type_selector')}
                        isLoading={experienceUIState.isLoading}
                    />
                );

            case 'single_class_wizard':
                return (
                    <SingleClassWizard
                        initialTechnique={prefillTechnique || undefined}
                        pieces={pieces}
                        availableSlots={appData?.availability ? 
                            dataService.generateTimeSlots(new Date(), 180).map(slot => ({
                              date: slot.date,
                              time: slot.startTime,
                              instructorId: 0,
                              // Incluir capacidad para pintura o técnica seleccionada
                              available: slot.capacity.painting?.available ?? slot.capacity[prefillTechnique || 'painting']?.available ?? 22,
                              total: slot.capacity.painting?.max ?? slot.capacity[prefillTechnique || 'painting']?.max ?? 22,
                              canBook: (slot.capacity.painting?.available ?? slot.capacity[prefillTechnique || 'painting']?.available ?? 22) > 0
                            }))
                            : []
                        }
                        appData={appData}
                        onConfirm={(pricing: ExperiencePricing, selectedSlot: TimeSlot | null) => {
                            setExperienceUIState(prev => ({
                                ...prev,
                                pricing,
                                piecesSelected: pricing.pieces
                            }));
                            setBookingDetails(prev => ({
                                ...prev,
                                slots: selectedSlot ? [selectedSlot] : [],
                                userInfo: null // Will be filled by user info modal
                            }));
                            setExperienceType('experience');
                            setIsUserInfoModalOpen(true);
                        }}
                        onBack={() => setView('welcome')}
                        isLoading={experienceUIState.isLoading}
                    />
                );

            case 'painting_booking':
                return (
                    <PaintingBookingFlow
                        deliveryId={paintingDeliveryId}
                        onBack={() => setView('welcome')}
                        isLoading={experienceUIState.isLoading}
                    />
                );

            case 'experience_confirmation':
                if (!confirmedBooking) return <WelcomeSelector onSelect={handleWelcomeSelect} />;
                return (
                    <ConfirmationPage 
                        booking={confirmedBooking} 
                        bankDetails={Array.isArray(appData.bankDetails) ? appData.bankDetails : appData.bankDetails ? [appData.bankDetails] : []}
                        footerInfo={appData.footerInfo}
                        policies={appData.policies}
                        onFinish={resetFlow}
                        onNavigateToMyClasses={() => setView('my-classes')}
                    />
                );
            
            case 'custom_experience_wizard':
                return (
                    <CustomExperienceWizard
                        pieces={pieces}
                        onConfirm={(booking) => {
                            // El booking ya fue guardado y el email ya fue enviado
                            // Guardar booking y navegar a ConfirmationPage para UX de clase mundial
                            setConfirmedBooking(booking);
                            setView('confirmation');
                        }}
                        onBack={() => setView('welcome')}
                        isLoading={false}
                        onShowPolicies={() => setIsPolicyModalOpen(true)}
                    />
                );

            // ==================== VALENTINE 2026 VIEWS ====================
            case 'valentine_landing':
                return (
                    <ValentineLanding
                        onStart={() => setView('valentine_form')}
                        onBack={() => setView('welcome')}
                    />
                );
            
            case 'valentine_form':
                return (
                    <ValentineRegistrationForm
                        onSuccess={(registrationId) => {
                            setValentineRegistrationId(registrationId);
                            setView('valentine_success');
                        }}
                        onBack={() => setView('valentine_landing')}
                    />
                );
            
            case 'valentine_success':
                return (
                    <ValentineSuccess
                        registrationId={valentineRegistrationId || ''}
                        onDone={() => {
                            setValentineRegistrationId(null);
                            setView('welcome');
                        }}
                    />
                );

            default:
                return <WelcomeSelector onSelect={handleWelcomeSelect} />;
        }
        } catch (error) {
            console.error("Error in renderView:", error);
            return <div className="text-center p-10 text-red-500">Error: {error?.message || 'Unknown error'}</div>;
        }
    };
    
    if (isAdmin) {
        console.log("App - rendering AdminConsole");
        return (
            <AuthProvider>
                <NotificationProvider>
                    <Suspense fallback={
                        <div className="min-h-screen bg-brand-background flex items-center justify-center">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                                <p className="text-brand-secondary">Cargando panel de administración...</p>
                            </div>
                        </div>
                    }>
                        <AdminDataProvider isAdmin={isAdmin}>
                            {adminModule === 'timecards' ? (
                                <AdminTimecardPanelSimple adminCode={adminCode} />
                            ) : (
                                <AdminConsole />
                            )}
                        </AdminDataProvider>
                    </Suspense>
                </NotificationProvider>
            </AuthProvider>
        );
    }

    // Cashier Box Reconciliation Mode
    if (isCashierMode) {
        return (
            <ErrorBoundary componentName="CashierDashboard">
                <CashierDashboard />
            </ErrorBoundary>
        );
    }

    // Módulo de marcación para empleados
    if (adminModule === 'timecards' && !isAdmin) {
        return <ModuloMarcacionSimple />;
    }

    // Modo formulario de cliente (QR)
    if (isClientDeliveryMode) {
        return (
            <ErrorBoundary componentName="ClientDeliveryForm">
                <div className="bg-brand-background min-h-screen text-brand-text font-sans relative flex flex-col">
                    <React.Suspense fallback={
                        <div className="min-h-screen flex items-center justify-center">
                            <div className="text-center">
                                <p className="text-lg mb-4">Cargando formulario...</p>
                                <div className="animate-spin">⏳</div>
                            </div>
                        </div>
                    }>
                        <ClientDeliveryForm />
                    </React.Suspense>
                </div>
            </ErrorBoundary>
        );
    }

    console.log("App - rendering main app, view:", view, "loading:", loading);
    return (
        <AuthProvider>
            <div className="bg-brand-background min-h-screen text-brand-text font-sans flex flex-col">
                <Header 
                    onGiftcardClick={() => setView('giftcard_landing')}
                    onMyClassesClick={() => setView('my-classes')}
                    onClientLogin={handleClientLogin}
                    clientEmail={clientEmail}
                    onClientLogout={handleClientLogout}
                />
            <main className="flex-grow w-full">
                <div className="container mx-auto px-4 py-6 sm:py-8">
                    {appData && <AnnouncementsBoard announcements={appData.announcements} />}
                    {view === 'welcome' && showGiftcardBanner && (
                        <div className={appData?.announcements && appData.announcements.length > 0 ? "mt-6" : ""}>
                            <GiftcardBanner
                                open={showGiftcardBanner}
                                onClose={() => setShowGiftcardBanner(false)}
                                onCTA={() => { setShowGiftcardBanner(false); setView('giftcard_landing'); }}
                            />
                        </div>
                    )}
                    <div className={`w-full ${appData?.announcements && appData.announcements.length > 0 ? "mt-6" : ""}`}>
                        {renderView()}
                    {isOpenStudioModalOpen && openStudioProduct && (
                        <ClassInfoModal
                            product={openStudioProduct}
                            onClose={handleOpenStudioInfoModalClose}
                            onConfirm={handleOpenStudioInfoModalConfirm}
                        />
                    )}
                    </div>
                </div>
            </main>
            {appData?.footerInfo && (
                <footer className="bg-brand-surface border-t border-brand-border py-8 px-4 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center gap-4 text-brand-secondary text-sm">
                        <div className="flex items-center gap-3">
                            <LocationPinIcon className="w-5 h-5 flex-shrink-0" />
                            <a href={appData.footerInfo.googleMapsLink || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary transition-colors">
                                {appData.footerInfo.address || 'Dirección no disponible'}
                            </a>
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-2">
                            <a href={`https://wa.me/${(appData.footerInfo.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="hover:text-brand-primary transition-colors">
                                <WhatsAppIcon className="w-6 h-6" />
                            </a>
                            <a href={`mailto:${appData.footerInfo.email || ''}`} aria-label="Correo" className="hover:text-brand-primary transition-colors">
                                <MailIcon className="w-6 h-6" />
                            </a>
                            <a href={`https://instagram.com/${(appData.footerInfo.instagramHandle || '').replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-brand-primary transition-colors">
                                <InstagramIcon className="w-6 h-6" />
                            </a>
                        </div>
                        <button onClick={() => setIsPolicyModalOpen(true)} className="mt-4 text-xs hover:underline text-brand-secondary transition-colors">
                            Políticas de Devoluciones
                        </button>
                    </div>
                </footer>
            )}

            {isUserInfoModalOpen && (
                <UserInfoModal 
                    onClose={() => setIsUserInfoModalOpen(false)}
                    onSubmit={handleUserInfoSubmit}
                    onShowPolicies={() => setIsPolicyModalOpen(true)}
                    slots={bookingDetails.slots}
                />
            )}
            {isPolicyModalOpen && appData && (
                <PolicyModal onClose={() => setIsPolicyModalOpen(false)} policiesText={appData.policies} />
            )}
            {isBookingTypeModalOpen && (
                <BookingTypeModal onClose={() => setIsBookingTypeModalOpen(false)} onSelect={handleBookingTypeSelect} />
            )}
            {isClassInfoModalOpen && bookingDetails.product && (
                <ClassInfoModal product={bookingDetails.product} onConfirm={handleClassInfoConfirm} onClose={() => setIsClassInfoModalOpen(false)} />
            )}
            {isCouplesTourModalOpen && (
                <CouplesTourModal
                    onContinue={() => {
                        setIsCouplesTourModalOpen(false);
                        setView('couples_experience');
                    }}
                    onBack={() => {
                        setIsCouplesTourModalOpen(false);
                        setView('welcome');
                        setIsCouplesExperience(false);
                    }}
                />
            )}
            
            {/* My Classes Prompt Modal */}
            {showMyClassesPrompt && (
                <MyClassesPrompt
                    onViewClasses={() => {
                        setShowMyClassesPrompt(false);
                        setView('my-classes');
                    }}
                    onDismiss={() => setShowMyClassesPrompt(false)}
                />
            )}
            </div>
        </AuthProvider>
    );
};

export default App;
