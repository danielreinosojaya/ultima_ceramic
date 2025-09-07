import type { BookingDetails } from '../types';

interface CsvHeaders {
  mainTitle: string;
  packageTitle: string;
  date: string;
  day: string;
  time: string;
}

export const exportScheduleToCSV = (bookingDetails: BookingDetails, headers: CsvHeaders): void => {
  const { product, slots } = bookingDetails;
  
  const sortedSlots = [...slots].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    return a.time.localeCompare(b.time);
  });
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += `${headers.mainTitle}\r\n`;
  csvContent += `${product.name}\r\n\r\n`;
  csvContent += `${headers.date},${headers.day},${headers.time}\r\n`;
  
  sortedSlots.forEach(slot => {
    const date = new Date(slot.date);
    const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    const dayOfWeek = adjustedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = adjustedDate.toLocaleDateString('en-US');
    csvContent += `${formattedDate},${dayOfWeek},${slot.time}\r\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "pottery_schedule.csv");
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
};