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
import { InstagramIcon } from './components/icons/InstagramIcon';
import { WhatsAppIcon } from './components/icons/WhatsAppIcon';
import { MailIcon } from './components/icons/MailIcon';
import { LocationPinIcon } from './components/icons/LocationPinIcon';

const App: React.FC = () => {
    // Traducciones eliminadas, usar texto en español directamente
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
                const [
                    products, instructors, availability, scheduleOverrides, classCapacity,
                    capacityMessages, announcements, policies, confirmationMessage, footerInfo, bankDetails,
                    bookings // Added bookings to the list of fetched data
                ] = await Promise.all([
                    dataService.getProducts(),
                    dataService.getInstructors(),
                    dataService.getAvailability(),
                    dataService.getScheduleOverrides(),
                    dataService.getClassCapacity(),
                    dataService.getCapacityMessageSettings(),
                    dataService.getAnnouncements(),
                    dataService.getPolicies(),
                    dataService.getConfirmationMessage(),
                    dataService.getFooterInfo(),
                    dataService.getBankDetails(),
                    dataService.getBookings() // Added the dataService call to fetch bookings
                ]);

                setAppData({
                    products, instructors, availability, scheduleOverrides, classCapacity,
                    capacityMessages, announcements, bookings, policies, confirmationMessage, footerInfo, bankDetails
                });
            } catch (error) {
                console.error("Failed to load initial app data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAppData();
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
    
    const resetFlow = () => {
        setView('welcome');
        setBookingDetails({ product: null, slots: [], userInfo: null });
        setTechnique(null);
        setBookingMode(null);
        setConfirmedBooking(null);
    };

    const renderView = () => {
        if (loading || !appData) {
            return <div className="text-center p-10">Loading...</div>;
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
