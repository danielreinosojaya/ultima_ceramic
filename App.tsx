import React, { useState, useEffect } from 'react';
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
import { AdminConsole } from './components/admin/AdminConsole';
import { NotificationProvider } from './context/NotificationContext';
import { ConfirmationPage } from './components/ConfirmationPage';

import type { AppView, Product, Booking, BookingDetails, TimeSlot, Technique, UserInfo, BookingMode, AppData, IntroClassSession } from './types';
import * as dataService from './services/dataService';
import { useLanguage } from './context/LanguageContext';
import { InstagramIcon } from './components/icons/InstagramIcon';
import { WhatsAppIcon } from './components/icons/WhatsAppIcon';
import { MailIcon } from './components/icons/MailIcon';
import { LocationPinIcon } from './components/icons/LocationPinIcon';

const App: React.FC = () => {
    // Ensure loading spinner always clears, even if API returns 304 or empty
    useEffect(() => {
        let isMounted = true;
        const fetchUITexts = async () => {
            try {
                const esTexts = await dataService.getUITexts('es');
                const enTexts = await dataService.getUITexts('en');
                // You may want to merge these into appData or handle separately
                if (isMounted) {
                    setAppData(prev => ({
                        ...prev,
                        uiText_es: esTexts || {},
                        uiText_en: enTexts || {},
                    }));
                }
            } catch (error) {
                console.error('Failed to fetch UI texts', error);
                if (isMounted) {
                    setAppData(prev => ({ ...prev, uiText_es: {}, uiText_en: {} }));
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchUITexts();
        return () => { isMounted = false; };
    }, []);
    // Default handler for WelcomeSelector
    const handleWelcomeSelect = (userType: string) => {
        switch (userType) {
            case 'new':
                setView('intro_classes');
                break;
            case 'returning':
                setIsPrerequisiteModalOpen(true);
                break;
            case 'group_experience':
                setView('group_experience');
                break;
            case 'couples_experience':
                setView('couples_experience');
                break;
            case 'team_building':
                setView('team_building');
                break;
            default:
                setView('welcome');
        }
    };
    const { t } = useLanguage();
    const [isAdmin, setIsAdmin] = useState(false);
    const [view, setView] = useState<AppView>('welcome');
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('admin') === 'true') {
            setIsAdmin(true);
        }
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [view]);

    // Removed broken useEffect with booking/email logic. All booking/email logic is now in handleUserInfoSubmit.
    
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
        if (isSubmitting) return;
        setIsSubmitting(true);
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
                        // 1. Generar PDF de la reserva
                        const { booking } = result;
                        // Acceso seguro a detalles del producto
                        const details = booking.product && 'details' in booking.product ? (booking.product as any).details : {};
                        const translations = {
                            title: 'Confirmación de Pre-reserva',
                            schoolName: 'Ceramic Alma',
                            customerInfoTitle: 'Datos del Cliente',
                            statusNotPaid: 'Pendiente de pago',
                            bookingCode: 'Código de reserva',
                            packageName: booking.product?.name || '',
                            packageDetailsTitle: 'Detalles del paquete',
                            durationLabel: 'Duración',
                            durationValue: details?.duration || '',
                            activitiesLabel: 'Actividades',
                            activitiesValue: details?.activities || [],
                            generalRecommendationsLabel: 'Recomendaciones',
                            generalRecommendationsValue: details?.generalRecommendations || '',
                            materialsLabel: 'Materiales',
                            materialsValue: details?.materials || '',
                            scheduleTitle: 'Horario',
                            dateHeader: 'Fecha',
                            timeHeader: 'Hora',
                            instructorHeader: 'Instructor',
                            importantInfoTitle: 'Información importante',
                            policyTitle: 'Políticas',
                            addressLabel: 'Dirección',
                            emailLabel: 'Email',
                            whatsappLabel: 'WhatsApp',
                            googleMapsLabel: 'Google Maps',
                            instagramLabel: 'Instagram',
                            accessDurationLabel: 'Duración de acceso',
                            accessIncludesLabel: 'Incluye',
                            howItWorksLabel: 'Cómo funciona',
                            days: 'días'
                        };
                        // Generar el PDF y obtener el blob
                        const pdfService = await import('./services/pdfService');
                        const pdfBlob = await pdfService.generateBookingPDF(booking, translations, appData.footerInfo, appData.policies, 'es');
                        // 2. Enviar correo con PDF adjunto
                        const emailPayload = {
                            to: booking.userInfo.email,
                            subject: 'Confirmación de Pre-reserva',
                            body: 'Gracias por tu pre-reserva. Adjuntamos el PDF con los detalles.',
                            attachments: [
                                {
                                    filename: 'CeramicAlma_Reserva.pdf',
                                    content: pdfBlob,
                                    contentType: 'application/pdf'
                                }
                            ]
                        };
                        await dataService.sendPreBookingEmailWithPDF(emailPayload);
                        setConfirmedBooking(result.booking);
                        setIsUserInfoModalOpen(false);
                        setView('confirmation');
                    } else {
                        alert(`Error: ${result.message}`);
                    }
                } catch (error) {
                    console.error("Failed to add booking", error);
                    alert("An error occurred while creating your booking.");
                } finally {
                    setIsSubmitting(false);
                }
            };
            submit();
            return finalDetails;
        });
    };
    
    const resetFlow = () => {
    setView('welcome');
    setBookingDetails({ product: null, slots: [], userInfo: null });
    setTechnique(null);
    setBookingMode(null);
    setConfirmedBooking(null);
    setIsSubmitting(false);
    };

    const renderView = () => {
        if (loading) {
            return <div className="text-center p-10">Loading...</div>;
        }
        if (!appData || (!appData.uiText_es && !appData.uiText_en)) {
            return <div className="text-center p-10 text-red-500">Error: No UI text available. Please try again later.</div>;
        }

        switch (view) {
            case 'welcome':
                return <WelcomeSelector onSelect={handleWelcomeSelect} />;
            case 'techniques':
                return <TechniqueSelector onSelect={handleTechniqueSelect} onBack={() => setView('welcome')} />;
            case 'packages':
                if (!technique) return <TechniqueSelector onSelect={handleTechniqueSelect} onBack={() => setView('welcome')} />;
                return <PackageSelector onSelect={handlePackageSelect} technique={technique} />;
            case 'intro_classes':
                return <IntroClassSelector onConfirm={handleIntroClassConfirm} appData={appData} onBack={() => setView('welcome')} />;
            case 'schedule':
                if (!bookingDetails.product || bookingDetails.product.type !== 'CLASS_PACKAGE' || !bookingMode) return <WelcomeSelector onSelect={handleWelcomeSelect} />;
                return <ScheduleSelector 
                            pkg={bookingDetails.product} 
                            onConfirm={handleScheduleConfirm}
                            initialSlots={bookingDetails.slots}
                            onBack={() => setView('packages')}
                            bookingMode={bookingMode}
                            appData={appData}
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
    };
    
    if (isAdmin) {
        return (
            <NotificationProvider>
                <AdminConsole />
            </NotificationProvider>
        );
    }

    return (
        <div className="bg-brand-background min-h-screen text-brand-text font-sans relative flex flex-col">
            <Header />
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
                            <a href={`https://wa.me/${appData.footerInfo.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label={t('footer.whatsapp')} className="hover:text-brand-primary transition-colors">
                                <WhatsAppIcon className="w-6 h-6" />
                            </a>
                            <a href={`mailto:${appData.footerInfo.email}`} aria-label={t('footer.email')} className="hover:text-brand-primary transition-colors">
                                <MailIcon className="w-6 h-6" />
                            </a>
                            <a href={`https://instagram.com/${appData.footerInfo.instagramHandle}`} target="_blank" rel="noopener noreferrer" aria-label={t('footer.instagram')} className="hover:text-brand-primary transition-colors">
                                <InstagramIcon className="w-6 h-6" />
                            </a>
                        </div>
                        <button onClick={() => setIsPolicyModalOpen(true)} className="mt-4 text-xs hover:underline text-brand-secondary transition-colors">
                            {t('footer.returnPolicies')}
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
