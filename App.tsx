import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header.js';
import { WelcomeSelector } from './components/WelcomeSelector.js';
import { PackageSelector } from './components/PackageSelector.js';
import { ScheduleSelector } from './components/ScheduleSelector.js';
import { BookingSummary } from './components/BookingSummary.js';
import { ClassInfoModal } from './components/ClassInfoModal.js';
import { UserInfoModal } from './components/UserInfoModal.js';
import { AdminConsole } from './components/admin/AdminConsole.js';
import type { Product, ClassPackage, TimeSlot, BookingDetails, UserInfo, Booking, BookingMode, ConfirmationMessage, IntroClassSession, FooterInfo, GroupInquiry, AppView, DayKey, AvailableSlot, ScheduleOverrides, Instructor, ClassCapacity, CapacityMessageSettings, Announcement, AppData, BankDetails, InvoiceRequest, Technique } from './types.js';
import { generateBookingPDF } from './services/pdfService.js';
import { useLanguage } from './context/LanguageContext.js';
import * as dataService from './services/dataService.js';
import { AnnouncementsBoard } from './components/AnnouncementsBoard.js';
import { BookingTypeModal } from './components/BookingTypeModal.js';
import { PolicyModal } from './components/PolicyModal.js';
import { IntroClassSelector } from './components/IntroClassSelector.js';
import { DownloadIcon } from './components/icons/DownloadIcon.js';
import { InstagramIcon } from './components/icons/InstagramIcon.js';
import { LocationPinIcon } from './components/icons/LocationPinIcon.js';
import { WhatsAppIcon } from './components/icons/WhatsAppIcon.js';
import { MailIcon } from './components/icons/MailIcon.js';
import { GroupInquiryForm } from './components/GroupInquiryForm.js';
import { PrerequisiteModal } from './components/PrerequisiteModal.js';
import { NotificationProvider } from './context/NotificationContext.js';
import { TechniqueSelector } from './components/TechniqueSelector.js';

interface InvoiceData {
    companyName: string;
    taxId: string;
    address: string;
    email: string;
}

const App: React.FC = () => {
  const { t, language, isTranslationsReady } = useLanguage();
  
  // App State
  const [viewHistory, setViewHistory] = useState<AppView[]>(['welcome']);
  const currentView = viewHistory[viewHistory.length - 1];
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [dataVersion, setDataVersion] = useState(0); // Used to trigger data refetches

  // Data State
  const [appData, setAppData] = useState<AppData | null>(null);

  // Booking Flow State
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingMode, setBookingMode] = useState<BookingMode>('flexible');
  const [inquirySubmitted, setInquirySubmitted] = useState(false);

  // Modal State
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
  const [isUserInfoModalVisible, setIsUserInfoModalVisible] = useState(false);
  const [isPolicyModalVisible, setIsPolicyModalVisible] = useState(false);
  const [isBookingTypeModalVisible, setIsBookingTypeModalVisible] = useState(false);
  const [isPrerequisiteModalVisible, setIsPrerequisiteModalVisible] = useState(false);
  
  const [copied, setCopied] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  
  const refetchData = useCallback(() => setDataVersion(v => v + 1), []);
  
  const navigateTo = (view: AppView) => {
    setViewHistory(prev => [...prev, view]);
  };
  
  const navigateBack = () => {
    setViewHistory(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  };

  useEffect(() => {
    const initializeApp = async () => {
      setIsAppLoading(true);
      try {
        const [
          products, instructors, availability, scheduleOverrides, classCapacity, 
          capacityMessages, announcements, policies, confirmationMessage, footerInfo, bookings,
          bankDetails
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
          dataService.getBookings(),
          dataService.getBankDetails(),
        ]);
        
        setAppData({ products, instructors, availability, scheduleOverrides, classCapacity, capacityMessages, announcements, bookings, policies, confirmationMessage, footerInfo, bankDetails });
        
      } catch (error) {
        console.error("Failed to initialize app data:", error);
      } finally {
        setIsAppLoading(false);
      }
    };
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setIsAdminMode(true);
      setIsAppLoading(false); 
    } else {
      initializeApp();
    }
  }, [dataVersion]); // Re-fetch all data when dataVersion changes
  
  const resetToStart = useCallback(() => {
    setViewHistory(['welcome']);
    setSelectedProduct(null);
    setSelectedSlots([]);
    setUserInfo(null);
    setConfirmedBooking(null);
    setBookingError(null);
    setInquirySubmitted(false);
    setSelectedTechnique(null);
  }, []);

  const handleProductSelect = useCallback((product: Product) => {
    setSelectedProduct(product);
    setIsInfoModalVisible(true);
  }, []);

  const handleInfoModalConfirm = useCallback(() => {
    setIsInfoModalVisible(false);
    if (!selectedProduct) return;

    if (selectedProduct.type === 'CLASS_PACKAGE' && selectedProduct.classes === 4) {
        setIsBookingTypeModalVisible(true);
    } else if (selectedProduct.type === 'CLASS_PACKAGE') {
        setBookingMode('flexible');
        navigateTo('schedule');
    } else if (selectedProduct.type === 'OPEN_STUDIO_SUBSCRIPTION') {
        setSelectedSlots([]);
        navigateTo('summary');
    }
  }, [selectedProduct]);

  const handleIntroClassConfirm = useCallback((product: Product, session: IntroClassSession) => {
    const slot: TimeSlot = { date: session.date, time: session.time, instructorId: session.instructorId };
    setSelectedProduct(product);
    setSelectedSlots([slot]);
    navigateTo('summary');
  }, []);

  const handleBookingTypeSelect = useCallback((mode: BookingMode) => {
    setBookingMode(mode);
    setIsBookingTypeModalVisible(false);
    navigateTo('schedule');
  }, []);

  const handleInfoModalClose = useCallback(() => {
    setIsInfoModalVisible(false);
    setSelectedProduct(null);
  }, []);

  const handleScheduleConfirm = useCallback((slots: TimeSlot[]) => {
    setSelectedSlots(slots);
    navigateTo('summary');
  }, []);

  const handleInquirySubmit = useCallback(async (inquiryData: Omit<GroupInquiry, 'id' | 'status' | 'createdAt' | 'inquiryType'>, inquiryType: 'group' | 'couple') => {
    await dataService.addGroupInquiry({ ...inquiryData, inquiryType });
    setInquirySubmitted(true);
  }, []);
  
  const getPdfTranslations = useCallback((product: Product) => ({
    title: t('pdf.title'),
    schoolName: t('pdf.schoolName'),
    customerInfoTitle: t('pdf.customerInfoTitle'),
    statusNotPaid: t('pdf.statusPreBooking'),
    bookingCode: t('pdf.bookingCode'),
    packageName: product.name,
    packageDetailsTitle: t('pdf.packageDetailsTitle'),
    durationLabel: t('modal.durationLabel'),
    durationValue: product.type !== 'OPEN_STUDIO_SUBSCRIPTION' && product.type !== 'GROUP_EXPERIENCE' && product.type !== 'COUPLES_EXPERIENCE' ? (product as ClassPackage).details.duration : (product.type === 'OPEN_STUDIO_SUBSCRIPTION' ? `${product.details.durationDays} days` : ''),
    activitiesLabel: t('modal.activitiesLabel'),
    activitiesValue: product.type !== 'OPEN_STUDIO_SUBSCRIPTION' && product.type !== 'GROUP_EXPERIENCE' && product.type !== 'COUPLES_EXPERIENCE' ? (product as ClassPackage).details.activities : [],
    generalRecommendationsLabel: t('modal.generalRecommendationsLabel'),
    generalRecommendationsValue: product.type !== 'OPEN_STUDIO_SUBSCRIPTION' && product.type !== 'GROUP_EXPERIENCE' && product.type !== 'COUPLES_EXPERIENCE' ? (product as ClassPackage).details.generalRecommendations : '',
    materialsLabel: t('modal.materialsLabel'),
    materialsValue: product.type !== 'OPEN_STUDIO_SUBSCRIPTION' && product.type !== 'GROUP_EXPERIENCE' && product.type !== 'COUPLES_EXPERIENCE' ? (product as ClassPackage).details.materials : '',
    scheduleTitle: t('pdf.scheduleTitle'),
    dateHeader: t('pdf.dateHeader'),
    timeHeader: t('pdf.timeHeader'),
    instructorHeader: t('summary.instructorHeader'),
    importantInfoTitle: t('pdf.importantInfoTitle'),
    policy: appData!.policies,
    addressLabel: t('pdf.addressLabel'),
    emailLabel: t('pdf.emailLabel'),
    whatsappLabel: t('pdf.whatsappLabel'),
    googleMapsLabel: t('pdf.googleMapsLabel'),
    instagramLabel: t('pdf.instagramLabel'),
  }), [t, appData]);
    
  const handleProceedToUserInfo = useCallback(() => {
    if (!selectedProduct) return;
    setIsUserInfoModalVisible(true);
  }, [selectedProduct]);

  const handleUserInfoSubmit = useCallback(async (data: { userInfo: UserInfo, needsInvoice: boolean, invoiceData?: InvoiceData }) => {
      setUserInfo(data.userInfo);
      setIsUserInfoModalVisible(false);

      if (selectedProduct) {
        setIsProcessing(true);
        setBookingError(null);
        
        const newBookingData = {
          productId: selectedProduct.id,
          productType: selectedProduct.type as 'CLASS_PACKAGE' | 'INTRODUCTORY_CLASS' | 'OPEN_STUDIO_SUBSCRIPTION',
          slots: selectedSlots,
          userInfo: data.userInfo,
          isPaid: false,
          price: (selectedProduct as any).price,
          bookingMode,
          product: selectedProduct,
          invoiceData: data.needsInvoice ? data.invoiceData : undefined,
          bookingDate: new Date().toISOString() // This captures the exact time of the booking


        };
        
        try {
          const result = await dataService.addBooking(newBookingData);
          if (result.success && result.booking) {
            setConfirmedBooking(result.booking);
            refetchData(); // Refresh data in case capacities changed
          } else {
            alert(t(`admin.errors.${result.message}`, { default: result.message }));
            setBookingError(t(`admin.errors.${result.message}`, { default: result.message }));
          }
        } catch (error) {
          console.error('Booking failed:', error);
          const errorMessage = (error as Error).message || 'An unknown error occurred.';
          alert(t(`admin.errors.${errorMessage}`, { default: errorMessage }));
          setBookingError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
      }
  }, [selectedProduct, selectedSlots, bookingMode, t, refetchData]);

  const handleCopyCode = () => {
    if (confirmedBooking?.bookingCode) {
        navigator.clipboard.writeText(confirmedBooking.bookingCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }
  };

  const handleCopyAccount = () => {
    if (appData?.bankDetails?.accountNumber) {
        navigator.clipboard.writeText(appData.bankDetails.accountNumber).then(() => {
            setCopiedAccount(true);
            setTimeout(() => setCopiedAccount(false), 2000);
        });
    }
  };

  const handleShowPolicies = useCallback(() => {
    setIsUserInfoModalVisible(false);
    setIsPolicyModalVisible(true);
  }, []);

  const handleClosePolicies = useCallback(() => {
    setIsPolicyModalVisible(false);
    setIsUserInfoModalVisible(true);
  }, []);

  if (isAdminMode) {
    return (
      <NotificationProvider>
        <AdminConsole />
      </NotificationProvider>
    );
  }

  if (isAppLoading || !isTranslationsReady || !appData) {
    return (
      <div className="bg-brand-background min-h-screen flex items-center justify-center font-sans text-brand-accent text-2xl">
        {t('app.loading')}...
      </div>
    );
  }
  
  const containerClass = confirmedBooking || currentView === 'schedule'
    ? "max-w-7xl mx-auto"
    : "max-w-4xl mx-auto";


  const renderContent = () => {
    if (isProcessing) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-semibold text-brand-text">{t('summary.savingButton')}...</h2>
            </div>
        )
    }
    if (confirmedBooking) {
      const isStudio = confirmedBooking.product.type === 'OPEN_STUDIO_SUBSCRIPTION';
      const whatsappMessage = t('confirmation.whatsappMessage', { code: confirmedBooking.bookingCode });
      const whatsappUrl = `https://wa.me/${appData.footerInfo?.whatsapp.replace(/\s/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
      return (
        <div className="text-center p-8 bg-brand-surface rounded-xl shadow-subtle animate-fade-in-up">
          <h2 className="text-3xl font-semibold text-brand-primary mb-2">
            {isStudio ? t('confirmation.openStudioTitle') : appData.confirmationMessage.title}
          </h2>
          <p className="text-brand-secondary mb-6">
            {isStudio ? t('confirmation.openStudioSubtitle') : appData.confirmationMessage.message}
          </p>
          
          <div className="bg-brand-background p-6 rounded-lg max-w-md mx-auto">
            <h3 className="text-sm font-bold text-brand-secondary uppercase">{t('confirmation.bookingCodeLabel')}</h3>
            <div className="flex items-center justify-center gap-4 mt-2">
              <p className="text-2xl font-mono text-brand-text">{confirmedBooking.bookingCode}</p>
              <button onClick={handleCopyCode} className="bg-brand-secondary text-white text-xs font-bold py-1 px-3 rounded-md">
                {copied ? t('confirmation.copiedButton') : t('confirmation.copyCodeButton')}
              </button>
            </div>
          </div>

          {appData.bankDetails && appData.bankDetails.bankName && (
             <div className="mt-8 text-left max-w-md mx-auto bg-brand-background p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-brand-text mb-4">{t('confirmation.bankDetailsTitle')}</h3>
                <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <dt className="font-semibold text-brand-secondary">{t('confirmation.bankName')}:</dt>
                        <dd className="text-brand-text">{appData.bankDetails.bankName}</dd>
                    </div>
                     <div className="flex justify-between">
                        <dt className="font-semibold text-brand-secondary">{t('confirmation.accountHolder')}:</dt>
                        <dd className="text-brand-text">{appData.bankDetails.accountHolder}</dd>
                    </div>
                    <div className="flex justify-between items-center">
                        <dt className="font-semibold text-brand-secondary">{t('confirmation.accountNumber')}:</dt>
                        <dd className="flex items-center gap-2">
                            <span className="text-brand-text font-mono">{appData.bankDetails.accountNumber}</span>
                             <button onClick={handleCopyAccount} className="bg-brand-secondary text-white text-xs font-bold py-1 px-2 rounded-md">
                                {copiedAccount ? t('confirmation.copiedButton') : t('confirmation.copyCodeButton')}
                            </button>
                        </dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="font-semibold text-brand-secondary">{t('confirmation.accountType')}:</dt>
                        <dd className="text-brand-text">{appData.bankDetails.accountType}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="font-semibold text-brand-secondary">{t('confirmation.taxId')}:</dt>
                        <dd className="text-brand-text">{appData.bankDetails.taxId}</dd>
                    </div>
                    {appData.bankDetails.details && (
                        <div className="pt-3 border-t border-brand-border/50">
                            <dt className="font-semibold text-brand-secondary">{t('confirmation.details')}:</dt>
                            <dd className="text-brand-text mt-1">{appData.bankDetails.details}</dd>
                        </div>
                    )}
                </dl>
                <p className="mt-4 text-xs text-brand-secondary text-center">{t('confirmation.transferReference', { code: confirmedBooking.bookingCode })}</p>
            </div>
          )}

          <div className="mt-8 text-left max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-brand-text mb-4">{t('confirmation.paymentInstructionsTitle')}</h3>
            <ul className="space-y-3 text-brand-secondary">
                <li className="flex items-start">
                    <span className="bg-brand-primary text-white rounded-full w-6 h-6 text-sm font-bold flex items-center justify-center mr-3 flex-shrink-0">1</span>
                    {t('confirmation.paymentInstruction1')}
                </li>
                <li className="flex items-start">
                    <span className="bg-brand-primary text-white rounded-full w-6 h-6 text-sm font-bold flex items-center justify-center mr-3 flex-shrink-0">2</span>
                    {t('confirmation.paymentInstruction2', { code: confirmedBooking.bookingCode })}
                </li>
                 <li className="flex items-start">
                    <span className="bg-brand-primary text-white rounded-full w-6 h-6 text-sm font-bold flex items-center justify-center mr-3 flex-shrink-0">3</span>
                    {isStudio ? t('confirmation.openStudioInstruction3') : t('confirmation.paymentInstruction3')}
                </li>
            </ul>
          </div>
          
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={resetToStart} className="text-brand-secondary font-semibold hover:underline">
                {t('confirmation.newBookingButton')}
              </button>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2">
                  <WhatsAppIcon className="w-5 h-5" />
                  {t('confirmation.whatsappButton')}
              </a>
          </div>
          <div className="mt-6">
            <button onClick={() => generateBookingPDF(confirmedBooking, getPdfTranslations(confirmedBooking.product), appData.footerInfo!, language)} className="text-brand-accent font-semibold flex items-center gap-2 mx-auto">
                <DownloadIcon className="w-5 h-5"/>
                {t('summary.downloadButton')}
            </button>
          </div>
        </div>
      );
    }

    switch (currentView) {
        case 'welcome':
            return <WelcomeSelector onSelect={(type) => {
              if (type === 'new') navigateTo('intro_classes');
              if (type === 'returning') setIsPrerequisiteModalVisible(true);
              if (type === 'group_experience') navigateTo('group_experience');
              if (type === 'couples_experience') navigateTo('couples_experience');
            }} />;
        case 'techniques':
            return <TechniqueSelector 
                onSelect={(technique) => {
                    setSelectedTechnique(technique);
                    navigateTo('packages');
                }}
                onBack={navigateBack}
            />;
        case 'packages':
            return <PackageSelector onSelect={handleProductSelect} technique={selectedTechnique} />;
        case 'intro_classes':
            return <IntroClassSelector onConfirm={handleIntroClassConfirm} appData={appData} onBack={navigateBack} />;
        case 'schedule':
            return selectedProduct && selectedProduct.type === 'CLASS_PACKAGE' ? (
              <ScheduleSelector 
                pkg={selectedProduct} 
                initialSlots={selectedSlots}
                onConfirm={handleScheduleConfirm} 
                onBack={navigateBack}
                bookingMode={bookingMode}
                appData={appData}
              />
            ) : null;
        case 'summary':
            return selectedProduct ? (
                <BookingSummary 
                    bookingDetails={{ product: selectedProduct, slots: selectedSlots, userInfo }}
                    onProceedToConfirmation={handleProceedToUserInfo}
                    onBack={navigateBack}
                    appData={appData}
                />
            ) : null;
        case 'group_experience':
            return <GroupInquiryForm inquiryType="group" onSubmit={(data) => handleInquirySubmit(data, 'group')} isSubmitted={inquirySubmitted} onReset={resetToStart} />;
        case 'couples_experience':
            return <GroupInquiryForm inquiryType="couple" onSubmit={(data) => handleInquirySubmit(data, 'couple')} isSubmitted={inquirySubmitted} onReset={resetToStart} />;
        default: return null;
    }
  }

  return (
    <div className="bg-brand-background min-h-screen font-sans text-brand-text">
      <Header />
      {isInfoModalVisible && selectedProduct && (
        <ClassInfoModal 
          product={selectedProduct} 
          onConfirm={handleInfoModalConfirm}
          onClose={handleInfoModalClose}
        />
      )}
       {isBookingTypeModalVisible && (
        <BookingTypeModal 
            onSelect={handleBookingTypeSelect}
            onClose={() => setIsBookingTypeModalVisible(false)}
        />
      )}
      {isUserInfoModalVisible && (
        <UserInfoModal 
            onClose={() => setIsUserInfoModalVisible(false)}
            onSubmit={handleUserInfoSubmit}
            onShowPolicies={handleShowPolicies}
        />
      )}
      {isPolicyModalVisible && (
        <PolicyModal 
            onClose={handleClosePolicies}
            policiesText={appData.policies}
        />
      )}
      {isPrerequisiteModalVisible && (
        <PrerequisiteModal
            onClose={() => setIsPrerequisiteModalVisible(false)}
            onConfirm={() => { setIsPrerequisiteModalVisible(false); navigateTo('techniques'); }}
            onGoToIntro={() => { setIsPrerequisiteModalVisible(false); navigateTo('intro_classes'); }}
        />
      )}
      
      <main className={`py-10 px-4 ${containerClass}`}>
        <AnnouncementsBoard announcements={appData.announcements} />
        <div className={appData.announcements.length > 0 ? "mt-6" : ""}>
          {renderContent()}
        </div>
      </main>
      
      {appData.footerInfo && (
        <footer className="bg-brand-background border-t border-brand-border/80 mt-12 py-8 text-center text-brand-secondary">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex justify-center items-center gap-x-6 gap-y-2 flex-wrap mb-4">
                    <a href={appData.footerInfo.googleMapsLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-brand-accent"><LocationPinIcon className="w-4 h-4" /> {appData.footerInfo.address}</a>
                    <a href={`https://wa.me/${appData.footerInfo.whatsapp.replace(/\s/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-brand-accent"><WhatsAppIcon className="w-4 h-4" /> {appData.footerInfo.whatsapp}</a>
                    <a href={`mailto:${appData.footerInfo.email}`} className="flex items-center gap-2 hover:text-brand-accent"><MailIcon className="w-4 h-4" /> {appData.footerInfo.email}</a>
                    <a href={`https://instagram.com/${appData.footerInfo.instagramHandle.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-brand-accent"><InstagramIcon className="w-4 h-4" /> {appData.footerInfo.instagramHandle}</a>
                </div>
                <p className="text-sm">{new Date().getFullYear()} &copy; {t('footer.text')}</p>
            </div>
        </footer>
      )}
    </div>
  );
};

export default App;