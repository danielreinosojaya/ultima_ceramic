import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Booking, FooterInfo, Product, Instructor, OpenStudioSubscription } from '../types';
import * as dataService from './dataService';
import { DAY_NAMES } from '@/constants';

// The `import 'jspdf-autotable';` statement is sufficient to load the necessary type augmentations.

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
}

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


export const generateBookingPDF = async (booking: Booking, translations: PdfTranslations, footerInfo: FooterInfo, policiesText: string, language: string): Promise<Blob> => {
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

    // --- RETURN PDF AS BLOB ---
    const pdfArrayBuffer = doc.output('arraybuffer');
    return new Blob([pdfArrayBuffer], { type: 'application/pdf' });
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
                      translations.contact,
                      translations.package,
                      translations.paymentStatus
                  ]],
                  body: attendees.map(b => [
                      '', // Empty first column for grouping
                      `${b.userInfo.firstName} ${b.userInfo.lastName}`,
                      `${b.userInfo.email}\n${b.userInfo.countryCode} ${b.userInfo.phone}`,
                      b.product?.name || 'N/A',
                      b.isPaid ? translations.paid : translations.unpaid
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
                      3: { cellWidth: 40 },
                      4: { halign: 'center' }
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
                `${slot.time}\n${slot.product.name.substring(0, 20)}\n(${slot.bookings.length}/${slot.capacity})`
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