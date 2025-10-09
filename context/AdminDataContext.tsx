import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as dataService from '../services/dataService';
import type { Product, Booking, Customer, GroupInquiry, Instructor, ScheduleOverrides, DayKey, AvailableSlot, ClassCapacity, CapacityMessageSettings, Announcement, InvoiceRequest } from '../types';

interface AdminData {
  products: Product[];
  bookings: Booking[];
  customers: Customer[];
  inquiries: GroupInquiry[];
  instructors: Instructor[];
  availability: any;
  scheduleOverrides: ScheduleOverrides;
  classCapacity: ClassCapacity;
  capacityMessages: CapacityMessageSettings;
  announcements: Announcement[];
  invoiceRequests: InvoiceRequest[];
  loading: boolean;
  refresh: () => void;
}

const AdminDataContext = createContext<AdminData | undefined>(undefined);

export const useAdminData = () => {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within AdminDataProvider');
  return ctx;
};

export const AdminDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<Omit<AdminData, 'loading' | 'refresh'>>({
    products: [],
    bookings: [],
    customers: [],
    inquiries: [],
    instructors: [],
    availability: {},
    scheduleOverrides: {},
    classCapacity: {},
    capacityMessages: {},
    announcements: [],
    invoiceRequests: [],
  });
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [products, bookings, customers, inquiries, instructors, availability, scheduleOverrides, classCapacity, capacityMessages, announcements, invoiceRequests] = await Promise.all([
        dataService.getProducts(),
        dataService.getBookings(),
        dataService.getCustomers(),
        dataService.getGroupInquiries(),
        dataService.getInstructors(),
        dataService.getAvailability(),
        dataService.getScheduleOverrides(),
        dataService.getClassCapacity(),
        dataService.getCapacityMessageSettings(),
        dataService.getAnnouncements(),
        dataService.getInvoiceRequests(),
      ]);
      setData({ products, bookings, customers, inquiries, instructors, availability, scheduleOverrides, classCapacity, capacityMessages, announcements, invoiceRequests });
    } catch {
      setData({ products: [], bookings: [], customers: [], inquiries: [], instructors: [], availability: {}, scheduleOverrides: {}, classCapacity: {}, capacityMessages: {}, announcements: [], invoiceRequests: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [version]);

  const refresh = () => {
    setVersion(v => v + 1);
  };

  return (
    <AdminDataContext.Provider value={{ ...data, loading, refresh }}>
      {children}
    </AdminDataContext.Provider>
  );
};
