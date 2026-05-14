import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Booking, FooterInfo, Product, Instructor, OpenStudioSubscription, GroupTechnique } from '../types';
import * as dataService from './dataService';
import { DAY_NAMES } from '@/constants';

// The `import 'jspdf-autotable';` statement is sufficient to load the necessary type augmentations.

// Helper para obtener nombre de técnica desde metadata
const getTechniqueName = (technique: GroupTechnique | string): string => {
  const names: Record<string, string> = {
    'potters_wheel': 'Torno Alfarero',
    'hand_modeling': 'Modelado a Mano',
    'painting': 'Pintura de piezas',
    'molding': 'Modelado a Mano'
  };
  return names[technique] || technique;
};

// Helper para traducir productType a nombre legible
const getProductTypeName = (productType?: string): string => {
  const typeNames: Record<string, string> = {
    'SINGLE_CLASS': 'Clase Suelta',
    'CLASS_PACKAGE': 'Paquete de Clases',
    'INTRODUCTORY_CLASS': 'Clase Introductoria',
    'GROUP_CLASS': 'Clase Grupal',
    'COUPLES_EXPERIENCE': 'Experiencia de Parejas',
    'OPEN_STUDIO': 'Estudio Abierto',
    'CUSTOM_GROUP_EXPERIENCE': 'Experiencia Grupal Personalizada'
  };
  return typeNames[productType || ''] || 'Clase';
};

// Detecta si un booking corresponde al upsell de pintura post-clase
// (cliente vuelve a pintar SU propia pieza ya hecha en una clase anterior).
// Marcado explícitamente desde schedulePaintingBooking con product.kind.
const isPaintingUpsell = (booking: Booking): boolean => {
  const product = booking.product as any;
  return product?.kind === 'painting_upsell'
    || (booking.productType === 'CUSTOM_GROUP_EXPERIENCE'
        && booking.technique === 'painting'
        && booking.productId === 'painting_service');
};

// Etiqueta amigable para distinguir las dos pinturas en displays:
//   - Upsell: el cliente trae SU pieza (la que hizo en una clase previa)
//   - Resto:  pintura de pieza nueva (catálogo / experiencia personalizada)
const PAINTING_UPSELL_LABEL = 'Upsell - pieza ya hecha';

// Helper para obtener el nombre del producto/técnica de un booking
// CRÍTICO: Para SINGLE_CLASS, SIEMPRE mostrar técnica, nunca "Clase Suelta"
const getBookingDisplayName = (booking: Booking): string => {
  // 0a. Upsell de pintura post-clase: etiqueta explícita y diferenciada
  if (isPaintingUpsell(booking)) {
    return PAINTING_UPSELL_LABEL;
  }

  // 0. CRÍTICO: Para SINGLE_CLASS, SIEMPRE priorizar técnica (nunca "Clase Suelta")
  if (booking.productType === 'SINGLE_CLASS') {
    if (booking.technique) {
      return getTechniqueName(booking.technique as GroupTechnique);
    }
    // Fallback: derivar de product.name
    const productName = booking.product?.name?.toLowerCase() || '';
    if (productName.includes('torno')) return 'Torno Alfarero';
    if (productName.includes('modelado')) return 'Modelado a Mano';
    if (productName.includes('pintura')) return 'Pintura de piezas';
    // Último fallback para SINGLE_CLASS sin identificador
    return 'Clase';
  }

  // 1. Para experiencia grupal personalizada, priorizar técnica sobre nombre genérico
  if (
    booking.technique &&
    (booking.productType === 'CUSTOM_GROUP_EXPERIENCE' || booking.product?.name === 'Experiencia Grupal Personalizada')
  ) {
    return getTechniqueName(booking.technique as GroupTechnique);
  }

  // 2. Si tiene groupClassMetadata con techniqueAssignments (GROUP_CLASS)
  if (booking.groupClassMetadata?.techniqueAssignments && booking.groupClassMetadata.techniqueAssignments.length > 0) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map(a => a.technique);
    const uniqueTechniques = [...new Set(techniques)];
    
    if (uniqueTechniques.length === 1) {
      return getTechniqueName(uniqueTechniques[0]);
    } else {
      return `Clase Grupal (mixto)`;
    }
  }
  
  // 3. Prioridad: product.name (es la fuente más confiable para otros tipos)
  const productName = booking.product?.name;
  if (productName && productName !== 'Unknown Product' && productName !== 'Unknown' && productName !== null) {
    return productName;
  }
  
  // 4. Fallback: technique directamente (solo si product.name no existe)
  if (booking.technique) {
    return getTechniqueName(booking.technique as GroupTechnique);
  }
  
  // 5. Último fallback: productType
  return getProductTypeName(booking.productType);
};

// Helper para obtener el nombre del producto/técnica de un slot
// CRÍTICO: Para SINGLE_CLASS, mostrar técnica en lugar de "Clase Suelta"
const getSlotDisplayName = (slot: { product: Product; bookings: Booking[] }): string => {
  // 0a. Si TODOS los bookings del slot son upsells de pintura, etiquetar como tal.
  //     Si el slot mezcla upsell con otras pinturas, fallback a "Pintura de piezas"
  //     (lo decide el resto del flujo de prioridades).
  if (slot.bookings.length > 0 && slot.bookings.every(isPaintingUpsell)) {
    return PAINTING_UPSELL_LABEL;
  }

  // 0. CRÍTICO: Para SINGLE_CLASS con técnica, mostrar técnica
  const singleClassWithTechnique = slot.bookings.find(
    b => b.technique && b.productType === 'SINGLE_CLASS'
  );
  if (singleClassWithTechnique?.technique) {
    return getTechniqueName(singleClassWithTechnique.technique as GroupTechnique);
  }

  // 1. Para experiencia grupal personalizada, priorizar técnica
  const customBookingWithTechnique = slot.bookings.find(
    b => b.technique && (b.productType === 'CUSTOM_GROUP_EXPERIENCE' || b.product?.name === 'Experiencia Grupal Personalizada')
  );
  if (customBookingWithTechnique?.technique) {
    return getTechniqueName(customBookingWithTechnique.technique as GroupTechnique);
  }

  // 2. Si hay bookings con groupClassMetadata, usar la primera técnica encontrada
  for (const booking of slot.bookings) {
    if (booking.groupClassMetadata?.techniqueAssignments && booking.groupClassMetadata.techniqueAssignments.length > 0) {
      const techniques = booking.groupClassMetadata.techniqueAssignments.map(a => a.technique);
      const uniqueTechniques = [...new Set(techniques)];
      
      if (uniqueTechniques.length === 1) {
        return getTechniqueName(uniqueTechniques[0]);
      } else {
        return `Clase Grupal (mixto)`;
      }
    }
  }
  
  // 3. Prioridad: product.name (fuente más confiable)
  const productName = slot.product?.name;
  if (productName && productName !== 'Unknown Product' && productName !== 'Unknown') {
    return productName;
  }
  
  // 4. Fallback: technique del primer booking (si product.name no existe)
  for (const booking of slot.bookings) {
    if (booking.technique) {
      return getTechniqueName(booking.technique as GroupTechnique);
    }
  }
  
  // 5. Último fallback: productType
  const firstBooking = slot.bookings[0];
  return firstBooking ? getProductTypeName(firstBooking.productType) : 'Clase';
};

interface PdfTranslations {
  title: string;
  schoolName: string;
  customerInfoTitle: string;
  statusNotPaid: string;
  bookingCode: string;
  packageName: string;
  packageDetailsTitle: string;
  durationLabel: string;
  durationValue: string;
  activitiesLabel: string;
  activitiesValue: string[];
  generalRecommendationsLabel: string;
  generalRecommendationsValue: string;
  materialsLabel: string;
  materialsValue: string;
  scheduleTitle: string;
  dateHeader: string;
  timeHeader: string;
  instructorHeader: string;
  importantInfoTitle: string;
  policyTitle: string;
  addressLabel: string;
  emailLabel: string;
  whatsappLabel: string;
  googleMapsLabel: string;
  instagramLabel: string;
  accessDurationLabel: string;
  accessIncludesLabel: string;
  howItWorksLabel: string;
  days: string;
}

interface ScheduleReportPdfTranslations {
    reportTitle: string;
    dateRange: string;
    generatedOn: string;
    time: string;
    attendee: string;
    contact: string;
    package: string;
    paymentStatus: string;
    paid: string;
    unpaid: string;
    classProgress: string;  // Column header "Clase #"
    singleClassLabel: string; // Label for non-package bookings
    /** Texto pequeño bajo el encabezado del PDF explicando la columna de pago (opcional) */
    paymentLegend?: string;
    /** Etiqueta "Abono" / cobrado parcial (opcional) */
    depositLabel?: string;
    /** Etiqueta "Saldo" pendiente (opcional) */
    balanceLabel?: string;
    /** Cuando hubo abonos pero no hay precio en la reserva para calcular total */
    noListPriceHint?: string;
}

const formatMoneyScheduleReport = (n: number, language: string): string =>
    new Intl.NumberFormat(language, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

function sumBookingPaymentsForReport(booking: Booking): number {
    const raw = booking.paymentDetails;
    const arr = Array.isArray(raw) ? raw : [];
    return arr.reduce((sum, p) => {
        const a = Number(p.amount) || 0;
        const g = Number(p.giftcardAmount) || 0;
        return sum + a + g;
    }, 0);
}

function getBookingListPriceForReport(booking: Booking): number | null {
    const p = Number(booking.price);
    if (Number.isFinite(p) && p > 0) return p;
    const pr = booking.product as Product | undefined;
    const pp = Number(pr?.price);
    if (Number.isFinite(pp) && pp > 0) return pp;
    return null;
}

/** Texto de celda: pagado completo, pendiente total, o abono + saldo cuando hay datos. */
function formatScheduleReportPaymentCell(
    booking: Booking,
    t: ScheduleReportPdfTranslations,
    language: string
): string {
    const depositLbl = t.depositLabel ?? 'Abono';
    const balanceLbl = t.balanceLabel ?? 'Saldo';
    const noPriceHint = t.noListPriceHint ?? 'sin total en reserva';
    const paidSum = sumBookingPaymentsForReport(booking);
    const listPrice = getBookingListPriceForReport(booking);
    const pending =
        typeof booking.pendingBalance === 'number' && booking.pendingBalance > 0.009
            ? booking.pendingBalance
            : listPrice !== null
              ? Math.max(0, listPrice - paidSum)
              : null;

    const looksFullyPaid =
        booking.isPaid ||
        (listPrice !== null && paidSum > 0.009 && pending !== null && pending <= 0.009) ||
        (listPrice !== null && paidSum >= listPrice - 0.009);

    if (looksFullyPaid) {
        if (paidSum > 0.009) {
            return `${t.paid} (${formatMoneyScheduleReport(paidSum, language)})`;
        }
        return t.paid;
    }

    if (paidSum > 0.009) {
        if (listPrice !== null && pending !== null && pending > 0.009) {
            return `${depositLbl} ${formatMoneyScheduleReport(paidSum)} · ${balanceLbl} ${formatMoneyScheduleReport(pending)}`;
        }
        return `${depositLbl} ${formatMoneyScheduleReport(paidSum)} (${noPriceHint})`;
    }

    return t.unpaid;
}

// Helper: Returns class progress string for a booking slot
// CLASS_PACKAGE -> "X/Y" (e.g. "2/4")  |  Other types -> singleClassLabel
const getClassProgress = (
    booking: Booking,
    currentDate: string,
    currentTime: string,
    singleClassLabel: string
): string => {
    if (booking.productType !== 'CLASS_PACKAGE') {
        return singleClassLabel;
    }
    // Sort slots chronologically to determine order
    const sortedSlots = [...booking.slots].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
    });
    const total = sortedSlots.length;
    const idx = sortedSlots.findIndex(s => s.date === currentDate && s.time === currentTime);
    if (idx === -1) return singleClassLabel;
    return `${idx + 1}/${total}`;
};

const drawFooter = (docInstance: jsPDF, translations: PdfTranslations, footerInfo: FooterInfo) => {
    const pageHeight = docInstance.internal.pageSize.getHeight();
    const pageWidth = docInstance.internal.pageSize.getWidth();
    const pageMargin = 15;
    const footerStartY = pageHeight - 20;

    docInstance.setDrawColor('#8D7B68');
    docInstance.setLineWidth(0.25);
    docInstance.line(pageMargin, footerStartY, pageWidth - pageMargin, footerStartY);

    let currentY = footerStartY + 5;
    docInstance.setFontSize(8);
    docInstance.setTextColor('#8D7B68');

    const footerLine1 = `${translations.addressLabel}: ${footerInfo.address} | ${translations.emailLabel}: ${footerInfo.email}`;
    docInstance.text(footerLine1, pageMargin, currentY);
    currentY += 4;

    const footerLine2 = `${translations.whatsappLabel}: ${footerInfo.whatsapp} | ${translations.instagramLabel}: ${footerInfo.instagramHandle}`;
    docInstance.text(footerLine2, pageMargin, currentY);
    currentY += 4;
    
    if (footerInfo.googleMapsLink) {
        docInstance.setTextColor('#0000EE'); // Blue for link
        docInstance.textWithLink(translations.googleMapsLabel, pageMargin, currentY, { url: footerInfo.googleMapsLink });
    }
};


export const generateBookingPDF = async (booking: Booking, translations: PdfTranslations, footerInfo: FooterInfo, policiesText: string, language: string): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const { product, slots, userInfo, isPaid, bookingCode } = booking;
  const brandText = '#4A4540';
  const brandAccent = '#A47551';
  const brandSecondary = '#8D7B68';
  const pageMargin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 25;
  
  const instructors = await dataService.getInstructors();
  const getInstructorName = (id: number) => instructors.find(i => i.id === id)?.name || 'N/A';

  // --- HEADER ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(brandAccent);
  doc.text(translations.schoolName, pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(brandSecondary);
  doc.text(translations.title, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  // --- STATUS & CODE ---
  if (!isPaid && bookingCode) {
    doc.setFillColor('#FFF9F5'); // Lighter brand background
    doc.roundedRect(pageMargin, currentY, pageWidth - (pageMargin * 2), 22, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandAccent);
    doc.text(translations.statusNotPaid.toUpperCase(), pageMargin + 5, currentY + 7);
    
    if (bookingCode) {
        doc.text(translations.bookingCode.toUpperCase(), pageWidth - pageMargin - 5, currentY + 7, { align: 'right' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(brandText);
        doc.text(bookingCode, pageWidth - pageMargin - 5, currentY + 15, { align: 'right' });
    }
    currentY += 28;
  }


  // --- CUSTOMER INFO ---
  if (userInfo) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandText);
    doc.text(translations.customerInfoTitle, pageMargin, currentY);
    currentY += 6;
    doc.setDrawColor(brandAccent);
    doc.line(pageMargin, currentY, pageWidth - pageMargin, currentY);
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(brandText);
    doc.text(`${userInfo.firstName} ${userInfo.lastName}`, pageMargin, currentY);
    doc.text(userInfo.email, pageMargin, currentY + 5);
    doc.text(`${userInfo.countryCode} ${userInfo.phone}`, pageMargin, currentY + 10);
    currentY += 20;
  }
  
  // --- PACKAGE DETAILS ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandText);
  doc.text(`${translations.packageDetailsTitle}: ${product.name}`, pageMargin, currentY);
  currentY += 6;
  doc.setDrawColor(brandAccent);
  doc.line(pageMargin, currentY, pageWidth - pageMargin, currentY); // Underline
  currentY += 8;
  
  const detail = (label: string, value: string | string[], y: number): number => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(brandAccent);
    doc.text(label, pageMargin + 5, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(brandText);
    
    const valueX = pageMargin + 55;
    const maxWidth = pageWidth - valueX - pageMargin;
    
    let textToRender = Array.isArray(value) 
        ? value.map(item => `- ${item}`).join('\n') 
        : value || '';

    if (!textToRender.trim()) return y + 4;

    const lines = doc.splitTextToSize(textToRender, maxWidth);
    doc.text(lines, valueX, y);

    const lineHeight = doc.getLineHeight() / doc.internal.scaleFactor;
    const textHeight = lines.length * lineHeight;
    
    return y + textHeight + 6;
  };

  if (product.type === 'OPEN_STUDIO_SUBSCRIPTION') {
      const openStudioDetails = product.details as OpenStudioSubscription['details'];
      currentY = detail(translations.accessDurationLabel, `${openStudioDetails.durationDays} ${translations.days}`, currentY);
      currentY = detail(translations.accessIncludesLabel, [openStudioDetails.timeLimit, openStudioDetails.materialsLimit], currentY);
      currentY = detail(translations.howItWorksLabel, openStudioDetails.howItWorks, currentY);
  } else {
      currentY = detail(translations.durationLabel, translations.durationValue, currentY);
      currentY = detail(translations.activitiesLabel, translations.activitiesValue, currentY);
      currentY = detail(translations.generalRecommendationsLabel, translations.generalRecommendationsValue, currentY);
      currentY = detail(translations.materialsLabel, translations.materialsValue, currentY);
  }
  currentY += 10;

  // --- SCHEDULE TABLE ---
  if (product.type !== 'OPEN_STUDIO_SUBSCRIPTION' && slots.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandText);
    doc.text(translations.scheduleTitle, pageMargin, currentY);
    currentY += 8;

    const sortedSlots = [...slots].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
      return adjustedDate.toLocaleDateString(language, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
    };

    const tableBody = await Promise.all(sortedSlots.map(async (slot) => [
        formatDate(slot.date),
        slot.time,
        getInstructorName(slot.instructorId)
    ]));

    (doc as any).autoTable({
      startY: currentY,
      head: [[translations.dateHeader, translations.timeHeader, translations.instructorHeader]],
      body: tableBody,
      theme: 'grid',
      headStyles: {
          fillColor: brandAccent,
          textColor: '#FFFFFF',
          fontStyle: 'bold'
      },
      styles: {
          font: 'helvetica',
          fontSize: 10,
          cellPadding: 2.5
      },
      margin: { left: pageMargin, right: pageMargin }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- IMPORTANT INFO & POLICIES ---
  const policyMaxWidth = pageWidth - (pageMargin * 2);
  const spaceForFooter = 30; // Reserve space for the footer

  // Check if we have enough space to even start the section, if not, new page.
  if (currentY + 20 > pageHeight - spaceForFooter) { // 20 is arbitrary height for title
      doc.addPage();
      currentY = pageMargin + 10;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandText);
  doc.text(translations.importantInfoTitle, pageMargin, currentY);
  currentY += 8;
  doc.setDrawColor(brandAccent);
  doc.line(pageMargin, currentY, pageWidth - pageMargin, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(brandSecondary);
  
  const policyLines = doc.splitTextToSize(policiesText, policyMaxWidth);
  const lineHeight = doc.getLineHeight() / doc.internal.scaleFactor;

  for (const line of policyLines) {
      // Before printing a line, check if it fits. If not, create a new page.
      if (currentY + lineHeight > pageHeight - spaceForFooter) {
          doc.addPage();
          currentY = pageMargin + 10; // Reset Y for new page
      }
      doc.text(line, pageMargin, currentY);
      currentY += lineHeight;
  }
  
  // --- FOOTER ---
  const pageCount = (doc.internal as any).pages.length;
  for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawFooter(doc, translations, footerInfo);
  }

  // --- SAVE ---
  doc.save('CeramicAlma_Reserva.pdf');
};


export const generateScheduleReportPDF = (
  bookings: Booking[],
  dateRange: { start: Date; end: Date },
  translations: ScheduleReportPdfTranslations,
  language: string
): void => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageMargin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    // --- Filter and structure data ---
    const reportData: Record<string, Record<string, Booking[]>> = {};

    bookings.forEach(booking => {
        booking.slots.forEach(slot => {
            const slotDate = new Date(slot.date + 'T00:00:00');
            if (slotDate >= dateRange.start && slotDate <= dateRange.end) {
                if (!reportData[slot.date]) {
                    reportData[slot.date] = {};
                }
                if (!reportData[slot.date][slot.time]) {
                    reportData[slot.date][slot.time] = [];
                }
                reportData[slot.date][slot.time].push(booking);
            }
        });
    });

    const sortedDates = Object.keys(reportData).sort();

    // --- PDF HEADER ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor('#A47551');
    doc.text(translations.reportTitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#8D7B68');
    const formattedStartDate = dateRange.start.toLocaleDateString(language);
    const formattedEndDate = dateRange.end.toLocaleDateString(language);
    doc.text(`${translations.dateRange}: ${formattedStartDate} - ${formattedEndDate}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;
    doc.text(`${translations.generatedOn}: ${new Date().toLocaleString(language)}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    if (translations.paymentLegend) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor('#6B5F58');
        const legendLines = doc.splitTextToSize(translations.paymentLegend, pageWidth - pageMargin * 2);
        doc.text(legendLines, pageMargin, currentY);
        currentY += legendLines.length * 3.5 + 4;
        doc.setFont('helvetica', 'normal');
    }

    // --- CREATE TABLES FOR EACH DAY ---
    if (sortedDates.length === 0) {
      doc.text("No classes scheduled for this period.", pageWidth / 2, currentY + 20, { align: 'center' });
    } else {
      sortedDates.forEach(dateStr => {
          const date = new Date(dateStr + 'T00:00:00');
          const dayTitle = date.toLocaleDateString(language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.setTextColor('#4A4540');
          doc.text(dayTitle, pageMargin, currentY);
          currentY += 6;

          const sortedTimes = Object.keys(reportData[dateStr]).sort();
          sortedTimes.forEach(time => {
              const attendees = reportData[dateStr][time];
              (doc as any).autoTable({
                  startY: currentY,
                  head: [[
                      `${translations.time}: ${time}`,
                      translations.attendee,
                      'Asistentes',
                      translations.package,
                      translations.classProgress,
                      translations.paymentStatus
                  ]],
                  body: attendees.map(b => [
                      '', // Empty first column for grouping
                      `${b.userInfo.firstName} ${b.userInfo.lastName}`,
                      typeof b.participants === 'number' ? b.participants : 1,
                      getBookingDisplayName(b),
                      getClassProgress(b, dateStr, time, translations.singleClassLabel),
                      formatScheduleReportPaymentCell(b, translations, language)
                  ]),
                  theme: 'grid',
                  headStyles: {
                      fillColor: '#C8A18F',
                      textColor: '#FFFFFF',
                      fontStyle: 'bold',
                      halign: 'center'
                  },
                  columnStyles: {
                      0: { halign: 'center', cellWidth: 20 },
                      2: { halign: 'center', cellWidth: 20 },
                      3: { cellWidth: 40 },
                      4: { halign: 'center', cellWidth: 20 },
                      5: { halign: 'left', cellWidth: 48, overflow: 'linebreak' as const }
                  },
                  styles: {
                      font: 'helvetica',
                      fontSize: 9,
                      cellPadding: 2,
                      valign: 'middle'
                  },
                  margin: { left: pageMargin, right: pageMargin }
              });
              currentY = (doc as any).lastAutoTable.finalY + 5;
          });
          currentY += 5; // Extra space between days
      });
    }

    // --- SAVE ---
    doc.save('CeramicAlma_Schedule_Report.pdf');
};

export const generateWeeklySchedulePDF = (
  weekDates: Date[],
  scheduleData: Map<number, { instructor: Instructor, schedule: Record<string, any[]> }>,
  language: string,
  isFiltered?: boolean,
  filteredSubtitle?: string
): void => {
    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' }); // Landscape
    const pageMargin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;

    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];

    // --- PDF HEADER ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor('#A47551');
    doc.text('Vista Semanal', pageWidth / 2, currentY, { align: 'center' });
    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#8D7B68');
    const formattedStartDate = weekStart.toLocaleDateString(language, { month: 'short', day: 'numeric' });
    const formattedEndDate = weekEnd.toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' });
    doc.text(`${formattedStartDate} - ${formattedEndDate}`, pageWidth / 2, currentY, { align: 'center' });
    
    if (isFiltered && filteredSubtitle) {
        currentY += 5;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor('#D95F43');
        doc.text(filteredSubtitle, pageWidth / 2, currentY, { align: 'center' });
    }
    
    currentY += 10;
    
    // --- CREATE TABLE ---
    const head = [['Instructor', ...weekDates.map(d => `${d.toLocaleDateString(language, { weekday: 'short' })} ${d.getDate()}`)]];
    const body = [...scheduleData.values()].map(({ instructor, schedule }) => {
        const row = [instructor.name];
        weekDates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            const slots = schedule[dateStr] || [];
            const cellText = slots.map(slot => 
                `${slot.time}\n${getSlotDisplayName(slot).substring(0, 20)}\n(${slot.bookings.length}/${slot.capacity})`
            ).join('\n\n');
            row.push(cellText);
        });
        return row;
    });

    (doc as any).autoTable({
        startY: currentY,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: {
            fillColor: '#414141',
            textColor: '#FFFFFF',
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 2,
            valign: 'top',
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 30 },
        },
        margin: { left: pageMargin, right: pageMargin }
    });

    // --- SAVE ---
    doc.save(`CeramicAlma_Vista_Semanal_${weekStart.toISOString().split('T')[0]}.pdf`);
};