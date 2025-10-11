import { GiftcardPersonalization } from './components/giftcard/GiftcardPersonalization';
import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { WelcomeSelector } from './components/WelcomeSelector';
import { TechniqueSelector } from './components/TechniqueSelector';
import { PackageSelector } from './components/PackageSelector';
import { IntroClassSelector } from './components/IntroClassSelector';
import { ScheduleSelector } from './components/ScheduleSelector';
import { BookingSummary } from './components/BookingSummary';
import { GroupInquiryForm } from './components/GroupInquiryForm';
import { UserInfoModal } from './components/UserInfoModal';
import { PolicyModal } from './components/PolicyModal';
import { BookingTypeModal } from './components/BookingTypeModal';
import { ClassInfoModal } from './components/ClassInfoModal';
import { PrerequisiteModal } from './components/PrerequisiteModal';
import { AnnouncementsBoard } from './components/AnnouncementsBoard';
// Lazy load AdminConsole to reduce initial bundle size
const AdminConsole = lazy(() => import('./components/admin/AdminConsole').then(module => ({ default: module.AdminConsole })));
import { NotificationProvider } from './context/NotificationContext';
import { AdminDataProvider } from './context/AdminDataContext';
import { ConfirmationPage } from './components/ConfirmationPage';

import type { AppView, Product, Booking, BookingDetails, TimeSlot, Technique, UserInfo, BookingMode, AppData, IntroClassSession } from './types';
import * as dataService from './services/dataService';
import { InstagramIcon } from './components/icons/InstagramIcon';
import { WhatsAppIcon } from './components/icons/WhatsAppIcon';
import { MailIcon } from './components/icons/MailIcon';
import { LocationPinIcon } from './components/icons/LocationPinIcon';
import { LandingGiftcard } from './components/giftcard/LandingGiftcard';
import { GiftcardRedemption } from './components/giftcard/GiftcardRedemption';
import { GiftcardAmountSelector } from './components/giftcard/GiftcardAmountSelector';
import { GiftcardInviteModal } from './components/giftcard/GiftcardInviteModal';
import { GiftcardBanner } from './components/giftcard/GiftcardBanner';
import { GiftcardDeliveryOptions } from './components/giftcard/GiftcardDeliveryOptions';
import { GiftcardPayment } from './components/giftcard/GiftcardPayment';
import { GiftcardConfirmation } from './components/giftcard/GiftcardConfirmation';
import { GiftcardManualPaymentInstructions } from './components/giftcard/GiftcardManualPaymentInstructions';
import { GiftcardPendingReview } from './components/giftcard/GiftcardPendingReview';

const App: React.FC = () => {
    const [giftcardPaid, setGiftcardPaid] = useState(false);
    const [giftcardPersonalization, setGiftcardPersonalization] = useState<any>(null);
    const [giftcardAmount, setGiftcardAmount] = useState<number | null>(null);
    const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
    const [showGiftcardBanner, setShowGiftcardBanner] = useState(true);
    // Traducciones eliminadas, usar texto en español directamente
    const [isAdmin, setIsAdmin] = useState(false);
    const [view, setView] = useState<AppView | 'giftcard_landing'>('welcome');
    const [bookingDetails, setBookingDetails] = useState<BookingDetails>({ product: null, slots: [], userInfo: null });
    const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
    const [technique, setTechnique] = useState<Technique | null>(null);
    const [bookingMode, setBookingMode] = useState<BookingMode | null>(null);

    const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
    const [isBookingTypeModalOpen, setIsBookingTypeModalOpen] = useState(false);
    const [isClassInfoModalOpen, setIsClassInfoModalOpen] = useState(false);
    const [isPrerequisiteModalOpen, setIsPrerequisiteModalOpen] = useState(false);
    
    const [appData, setAppData] = useState<AppData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('admin') === 'true') {
            setIsAdmin(true);
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

                setAppData({
                    products: essentialData.products || [], 
                    announcements: essentialData.announcements || [], 
                    policies: essentialData.policies || '', 
                    footerInfo: essentialData.footerInfo || {},
                    // Initialize empty data structures for lazy loading
                    instructors: [],
                    availability: { Sunday: [], Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] },
                    scheduleOverrides: {},
                    classCapacity: { potters_wheel: 0, molding: 0, introductory_class: 0 },
                    capacityMessages: { thresholds: [] },
                    bookings: [],
                    confirmationMessage: '',
                    bankDetails: []
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

    const handleWelcomeSelect = (userType: 'new' | 'returning' | 'group_experience' | 'couples_experience' | 'team_building') => {
        if (userType === 'new') {
            setView('intro_classes');
        } else if (userType === 'returning') {
            setIsPrerequisiteModalOpen(true);
        } else if (userType === 'group_experience') {
            setView('group_experience');
        } else if (userType === 'couples_experience') {
            setView('couples_experience');
        } else if (userType === 'team_building') {
            setView('team_building');
        }
    };
    
    const handlePrerequisiteConfirm = () => {
        setIsPrerequisiteModalOpen(false);
        setView('techniques');
    };

    const handleTechniqueSelect = (selectedTechnique: Technique) => {
        setTechnique(selectedTechnique);
        setView('packages');
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
    
    const handleIntroClassConfirm = (product: Product, session: IntroClassSession) => {
        setBookingDetails({ product, slots: [session], userInfo: null });
        setView('summary');
    };

    const handleScheduleConfirm = (slots: TimeSlot[]) => {
        setBookingDetails(prev => ({ ...prev, slots }));
        setView('summary');
    };
    
    const handleSummaryConfirm = () => {
        setIsUserInfoModalOpen(true);
    };

    const handleUserInfoSubmit = (data: { userInfo: UserInfo, needsInvoice: boolean, invoiceData?: any }) => {
        setBookingDetails(currentDetails => {
            const finalDetails = { ...currentDetails, userInfo: data.userInfo };
            const bookingData = {
                product: finalDetails.product!,
                productId: finalDetails.product!.id,
                productType: finalDetails.product!.type,
                slots: finalDetails.slots,
                userInfo: data.userInfo,
                isPaid: false,
                price: 'price' in finalDetails.product! ? finalDetails.product.price : 0,
                bookingMode: bookingMode || 'flexible',
                bookingDate: new Date().toISOString(),
                invoiceData: data.needsInvoice ? data.invoiceData : undefined
            };

            const submit = async () => {
                try {
                    const result = await dataService.addBooking(bookingData);
                    if (result.success && result.booking) {
                        setConfirmedBooking(result.booking);
                        setIsUserInfoModalOpen(false);
                        setView('confirmation');
                    } else {
                        // NOTE: Using alert() is not recommended in immersive. Please use a custom modal instead.
                        alert(`Error: ${result.message}`);
                    }
                } catch (error) {
                    console.error("Failed to add booking", error);
                    // NOTE: Using alert() is not recommended in immersive. Please use a custom modal instead.
                    alert("An error occurred while creating your booking.");
                }
            };
            submit();
            return finalDetails;
        });
    };
    
    // Función para cargar datos adicionales bajo demanda
    const loadAdditionalData = useCallback(async (dataType: 'scheduling' | 'bookings' | 'admin', currentAppData: AppData) => {
        if (!currentAppData) return;
        
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
                    updates = { confirmationMessage, bankDetails: bankDetails as any };
                    break;
            }
            
            if (Object.keys(updates).length > 0) {
                setAppData(prev => prev ? { ...prev, ...updates } : null);
            }
        } catch (error) {
            console.error(`Failed to load ${dataType} data:`, error);
        }
    }, []);

    // Load scheduling data when needed for schedule view
    useEffect(() => {
        if (view === 'schedule' && appData && appData.instructors.length === 0) {
            loadAdditionalData('scheduling', appData);
        }
        if (view === 'schedule' && appData && appData.bookings.length === 0) {
            loadAdditionalData('bookings', appData);
        }
    }, [view, appData, loadAdditionalData]);

    // Load bookings data when needed for intro classes view
    useEffect(() => {
        if (view === 'intro_classes' && appData && appData.bookings.length === 0) {
            loadAdditionalData('bookings', appData);
        }
    }, [view, appData, loadAdditionalData]);

    // Load admin data when needed for confirmation view
    useEffect(() => {
        if (view === 'confirmation' && appData && !appData.confirmationMessage) {
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
                return <LandingGiftcard onStart={() => setView('giftcard_amount')} onRedeem={() => setView('giftcard_redemption')} />;
            case 'giftcard_redemption':
                return <GiftcardRedemption code="" onRedeem={code => alert(`Redimir: ${code}`)} onBack={() => setView('giftcard_landing')} />;
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
                        onSelect={(option, data) => { setSelectedDelivery({ type: option, data }); setView('giftcard_payment'); }}
                        onBack={() => setView('giftcard_personalization')}
                    />
                );
            case 'giftcard_payment':
                return (
                    <GiftcardPayment
                        amount={giftcardAmount || 0}
                        deliveryMethod={selectedDelivery || ''}
                        personalization={giftcardPersonalization}
                        onPay={() => setView('giftcard_manual_payment')}
                        onBack={() => setView('giftcard_delivery')}
                    />
                );
            case 'giftcard_manual_payment':
                return (
                    <GiftcardManualPaymentInstructions
                        amount={giftcardAmount || 0}
                        deliveryMethod={selectedDelivery || ''}
                        personalization={giftcardPersonalization}
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
                        deliveryMethod={selectedDelivery || ''}
                        personalization={giftcardPersonalization}
                        onFinish={() => { setView('welcome'); setGiftcardPaid(false); }}
                        onBack={() => setView('giftcard_payment')}
                    />
                );
            case 'welcome':
                return <WelcomeSelector onSelect={handleWelcomeSelect} onRedeemGiftcard={() => setView('giftcard_redemption')} />;
            case 'techniques':
                return <TechniqueSelector onSelect={handleTechniqueSelect} onBack={() => setView('welcome')} />;
            case 'packages':
                if (!technique) return <TechniqueSelector onSelect={handleTechniqueSelect} onBack={() => setView('welcome')} />;
                return <PackageSelector onSelect={handlePackageSelect} technique={technique} products={appData.products} />;
            case 'intro_classes':
                return <IntroClassSelector onConfirm={handleIntroClassConfirm} appData={appData} onBack={() => setView('welcome')} onAppDataUpdate={(updates) => setAppData(prev => prev ? { ...prev, ...updates } : null)} />;
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
                    if (bookingDetails.product?.type === 'INTRODUCTORY_CLASS') {
                        setView('intro_classes');
                    } else {
                        setView('schedule');
                    }
                };
                return <BookingSummary 
                            bookingDetails={bookingDetails} 
                            onProceedToConfirmation={handleSummaryConfirm} 
                            onBack={handleBackFromSummary} 
                            appData={appData} 
                        />;
            case 'confirmation':
                if (!confirmedBooking) return <WelcomeSelector onSelect={handleWelcomeSelect} />;
                return <ConfirmationPage 
                            booking={confirmedBooking} 
                            bankDetails={appData.bankDetails}
                            footerInfo={appData.footerInfo}
                            policies={appData.policies}
                            onFinish={resetFlow} 
                        />;
            case 'group_experience':
            case 'couples_experience':
            case 'team_building':
                return <GroupInquiryForm 
                            onBack={() => setView('welcome')} 
                            inquiryType={view === 'group_experience' ? 'group' : view === 'couples_experience' ? 'couple' : 'team_building'}
                            footerInfo={appData.footerInfo}
                        />;
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
            <NotificationProvider>
                <Suspense fallback={
                    <div className="min-h-screen bg-brand-background flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                            <p className="text-brand-secondary">Cargando panel de administración...</p>
                        </div>
                    </div>
                }>
                    <AdminDataProvider>
                        <AdminConsole />
                    </AdminDataProvider>
                </Suspense>
            </NotificationProvider>
        );
    }

    console.log("App - rendering main app, view:", view, "loading:", loading);
    return (
        <div className="bg-brand-background min-h-screen text-brand-text font-sans relative flex flex-col">
            <GiftcardBanner
                open={showGiftcardBanner}
                onClose={() => setShowGiftcardBanner(false)}
                onCTA={() => { setShowGiftcardBanner(false); setView('giftcard_landing'); }}
            />
            <Header />
            <div className="absolute top-4 right-4 z-50">
                <button
                    className="border border-brand-primary bg-white/80 text-brand-primary font-semibold py-1.5 px-4 rounded-full shadow-sm hover:bg-brand-primary/10 transition-colors text-base"
                    style={{letterSpacing: '0.03em'}} 
                    onClick={() => setView('giftcard_landing')}
                >
                    <span className="inline-block align-middle">Giftcard</span>
                </button>
            </div>
            <main className="container mx-auto px-4 py-8 flex-grow">
                {appData && <AnnouncementsBoard announcements={appData.announcements} />}
                <div className="mt-8">
                    {renderView()}
                </div>
            </main>
            {appData?.footerInfo && (
                <footer className="bg-brand-surface border-t border-brand-border py-8 px-4 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center gap-4 text-brand-secondary text-sm">
                        <div className="flex items-center gap-3">
                            <LocationPinIcon className="w-5 h-5 flex-shrink-0" />
                            <a href={appData.footerInfo.googleMapsLink || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary transition-colors">
                                {appData.footerInfo.address}
                            </a>
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-2">
                            <a href={`https://wa.me/${appData.footerInfo.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="hover:text-brand-primary transition-colors">
                                <WhatsAppIcon className="w-6 h-6" />
                            </a>
                            <a href={`mailto:${appData.footerInfo.email}`} aria-label="Correo" className="hover:text-brand-primary transition-colors">
                                <MailIcon className="w-6 h-6" />
                            </a>
                            <a href={`https://instagram.com/${appData.footerInfo.instagramHandle}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-brand-primary transition-colors">
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
            {isPrerequisiteModalOpen && (
                <PrerequisiteModal 
                    onClose={() => setIsPrerequisiteModalOpen(false)}
                    onConfirm={handlePrerequisiteConfirm}
                    onGoToIntro={() => { setIsPrerequisiteModalOpen(false); setView('intro_classes'); }}
                />
            )}
        </div>
    );
};

export default App;
