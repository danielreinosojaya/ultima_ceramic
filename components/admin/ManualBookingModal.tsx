import React, { useState, useEffect, useMemo } from 'react';
import type { Product, UserInfo, Customer, TimeSlot, Booking } from '../../types';
import * as dataService from '../../services/dataService';
import { COUNTRIES } from '@/constants';

interface ManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingAdded: () => void;
  existingBookings: Booking[];
  availableProducts: Product[];
  preselectedCustomer?: Customer;
}

export const ManualBookingModal: React.FC<ManualBookingModalProps> = ({ 
  isOpen, 
  onClose, 
  onBookingAdded,
  existingBookings,
  availableProducts,
  preselectedCustomer
}) => {
  const [productError, setProductError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(preselectedCustomer || null);
  const [userInfo, setUserInfo] = useState<UserInfo>({ firstName: '', lastName: '', email: '', phone: '', countryCode: COUNTRIES[0].code, birthday: '' });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [price, setPrice] = useState('');
  const [clientNote, setClientNote] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  // Calendar and time picker states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // Horarios en intervalos de 30 minutos de 09:00 a 20:30
  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = 9 + Math.floor(i / 2);
    const min = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${min}`;
  });

  useEffect(() => {
    // Usar los productos pasados como props
    setProducts(availableProducts);
    
    // Obtener customers correctamente usando la función async
    const fetchCustomers = async () => {
      const customers = await dataService.getCustomers();
      setAllCustomers(customers);
    };
    fetchCustomers();
  }, [availableProducts]);

  // Efecto para manejar el cliente preseleccionado
  useEffect(() => {
    if (preselectedCustomer) {
      setSelectedCustomer(preselectedCustomer);
      setUserInfo({
        firstName: preselectedCustomer.firstName,
        lastName: preselectedCustomer.lastName,
        email: preselectedCustomer.email,
        phone: preselectedCustomer.phone,
        countryCode: preselectedCustomer.countryCode || COUNTRIES[0].code,
        birthday: preselectedCustomer.birthday || ''
      });
    }
  }, [preselectedCustomer]);

  // Resetear estado cuando se cierre el modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedCustomer(preselectedCustomer || null);
      setSelectedProduct(null);
      setPrice('');
      setClientNote('');
      setSelectedSlots([]);
      setSelectedDate('');
      setSelectedTime('');
      setShowCalendar(false);
      setShowTimePicker(false);
      setProductError('');
      setSearchTerm('');
      if (preselectedCustomer) {
        setUserInfo({
          firstName: preselectedCustomer.firstName,
          lastName: preselectedCustomer.lastName,
          email: preselectedCustomer.email,
          phone: preselectedCustomer.phone,
          countryCode: preselectedCustomer.countryCode || COUNTRIES[0].code,
          birthday: preselectedCustomer.birthday || ''
        });
      } else {
        setUserInfo({ firstName: '', lastName: '', email: '', phone: '', countryCode: COUNTRIES[0].code, birthday: '' });
      }
    }
  }, [isOpen, preselectedCustomer]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return [];
    return allCustomers.filter(c =>
      c.userInfo.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.userInfo.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.userInfo.email.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [allCustomers, searchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setUserInfo(customer.userInfo);
    setSearchTerm('');
  };
  const resetCustomerSelection = () => {
    setSelectedCustomer(null);
    setUserInfo({ firstName: '', lastName: '', email: '', phone: '', countryCode: COUNTRIES[0].code, birthday: '' });
  };

  const handleSubmitBooking = async () => {
    setSubmitDisabled(true);
    setProductError('');
    try {
      // Validación profesional
      if (!selectedCustomer) throw new Error('Selecciona un cliente');
      if (!selectedProduct) {
        setProductError('Selecciona un producto antes de continuar.');
        setSubmitDisabled(false);
        return;
      }
      if (!selectedSlots.length) throw new Error('Agrega al menos un horario');
      // Construir datos de reserva
      const bookingData = {
        userInfo: selectedCustomer?.userInfo || {
          firstName: selectedCustomer?.userInfo?.firstName || '',
          lastName: selectedCustomer?.userInfo?.lastName || '',
          email: selectedCustomer?.email || '',
          phone: selectedCustomer?.userInfo?.phone || '',
          countryCode: selectedCustomer?.userInfo?.countryCode || '',
          birthday: selectedCustomer?.userInfo?.birthday || null
        },
        productId: selectedProduct.id,
        price: Number(price) || selectedProduct.price,
        clientNote,
        slots: selectedSlots,
        product: selectedProduct,
        productType: selectedProduct.type,
        bookingMode: 'flexible',
        isPaid: false,
        paymentDetails: []
      };
      // Llamar al servicio de agendamiento
      const result = await dataService.addBooking(bookingData);
      if (!result.success) throw new Error(result.message || 'No se pudo agendar la clase');
      // Feedback visual profesional
      if (typeof window !== 'undefined') {
        window.alert('Clase agendada exitosamente');
      }
      onBookingAdded();
      onClose();
    } catch (err: any) {
      if (typeof window !== 'undefined') {
        window.alert(err.message || 'Error al agendar la clase');
      }
    } finally {
      setSubmitDisabled(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4">Reserva manual</h2>
        {!selectedCustomer && (
          <div className="mb-4">
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar cliente" className="w-full p-2 border rounded-lg" />
            {filteredCustomers.length > 0 && (
              <ul className="bg-white border rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.map(c => (
                  <li key={c.email} onClick={() => handleSelectCustomer(c)} className="p-2 hover:bg-gray-100 cursor-pointer">{c.userInfo.firstName} {c.userInfo.lastName} ({c.userInfo.email})</li>
                ))}
              </ul>
            )}
            {selectedCustomer && (
              <div className="mt-2 p-2 bg-blue-100 rounded-lg text-sm flex justify-between items-center">
                <span>Seleccionado: {selectedCustomer.userInfo.firstName} {selectedCustomer.userInfo.lastName}</span>
                <button onClick={resetCustomerSelection} className="text-red-500 font-bold">X</button>
              </div>
            )}
          </div>
        )}
        {selectedCustomer && (
          <div className="mb-4 p-3 bg-gray-100 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Cliente Seleccionado:</h3>
            <div className="text-sm text-gray-600">
              <strong>{selectedCustomer.userInfo?.firstName} {selectedCustomer.userInfo?.lastName}</strong><br />
              {selectedCustomer.email}
            </div>
          </div>
        )}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1">Producto</label>
          <div className="space-y-2">
            {(() => {
              // Mostrar todos los productos activos, y los dos SINGLE_CLASS flexibles aunque estén inactivos (solo para admin)
              const seenNames = new Set<string>();
              const FLEXIBLE_SINGLE_CLASSES = [
                'Clase Individual de Torno',
                'Clase Individual de Modelado a Mano'
              ];
              const filtered = products
                .filter(p => {
                  // Mostrar todas las SINGLE_CLASS (activas o inactivas), deduplicadas por nombre
                  if (p.type === 'SINGLE_CLASS') {
                    if (seenNames.has(p.name)) return false;
                    seenNames.add(p.name);
                    return true;
                  }
                  // Mostrar solo productos activos de los otros tipos permitidos
                  if (p.isActive && (p.type === 'CLASS_PACKAGE' || p.type === 'INTRODUCTORY_CLASS' || p.type === 'GROUP_CLASS')) {
                    return true;
                  }
                  return false;
                });
              if (!filtered.length) {
                return <div className="text-red-500">No hay productos activos disponibles.</div>;
              }
              return filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors duration-200 ${selectedProduct?.id === p.id ? 'border-brand-primary bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                  onClick={() => { setSelectedProduct(p); setProductError(''); }}
                  aria-label={`Seleccionar ${p.name}`}
                >
                  {/* Icono por tipo */}
                  <span className="inline-block">
                    {p.type === 'CLASS_PACKAGE' && <span className="material-icons text-brand-primary">layers</span>}
                    {p.type === 'SINGLE_CLASS' && <span className="material-icons text-green-600">person</span>}
                    {p.type === 'INTRODUCTORY_CLASS' && <span className="material-icons text-indigo-600">star</span>}
                    {p.type === 'GROUP_CLASS' && <span className="material-icons text-amber-600">groups</span>}
                  </span>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-brand-text">{p.name}</div>
                    <div className="text-xs text-brand-secondary">{p.type === 'CLASS_PACKAGE' ? 'Paquete de Clases' : p.type === 'SINGLE_CLASS' ? 'Clase Individual' : p.type === 'INTRODUCTORY_CLASS' ? 'Introductoria' : p.type === 'GROUP_CLASS' ? 'Grupal' : ''}</div>
                    <div className="text-xs text-gray-500">{p.details?.duration || ''}</div>
                  </div>
                  <div className="font-bold text-brand-primary">${p.price?.toFixed(2) || ''}</div>
                </button>
              ));
            })()}
          </div>
          {productError && <div className="text-red-500 text-sm mt-2">{productError}</div>}
        </div>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Precio</label>
            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Nota</label>
            <input type="text" value={clientNote} onChange={e => setClientNote(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1">Seleccionar fecha y hora</label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-accent"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              {selectedDate ? `Fecha: ${selectedDate}` : 'Elegir fecha'}
            </button>
            <button
              type="button"
              className="bg-brand-secondary text-white px-4 py-2 rounded-lg hover:bg-brand-accent"
              onClick={() => {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                setSelectedDate(`${yyyy}-${mm}-${dd}`);
                setShowCalendar(false);
              }}
            >Hoy</button>
          </div>
          {showCalendar && (
            <input
              type="date"
              className="border rounded-lg p-2 mb-2 w-full"
              value={selectedDate}
              onChange={e => {
                setSelectedDate(e.target.value);
                setShowCalendar(false);
              }}
              min={new Date().toISOString().split('T')[0]}
            />
          )}
          {selectedDate && (
            <div className="mb-2">
              <label className="block text-sm font-bold mb-1">Seleccionar hora</label>
              <div className="flex gap-2 flex-wrap">
                {timeOptions.map(time => (
                  <button
                    key={time}
                    type="button"
                    className={`px-3 py-1 rounded-lg border ${selectedTime === time ? 'bg-brand-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => {
                      setSelectedTime(time);
                      setShowTimePicker(false);
                    }}
                  >{time}</button>
                ))}
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600"
                  disabled={!selectedDate || !selectedTime}
                  onClick={() => {
                    if (selectedDate && selectedTime) {
                      const slot = { date: selectedDate, time: selectedTime };
                      if (!selectedSlots.some(s => s.date === slot.date && s.time === slot.time)) {
                        setSelectedSlots([...selectedSlots, slot]);
                        setSelectedTime('');
                      }
                    }
                  }}
                >Agregar horario</button>
              </div>
            </div>
          )}
          <div className="space-y-1 mt-2">
            {selectedSlots.map(slot => (
              <div key={`${slot.date}-${slot.time}`} className="flex justify-between items-center bg-white p-2 rounded text-sm border">
                <span>{slot.date} @ {slot.time}</span>
                <button onClick={() => setSelectedSlots(selectedSlots.filter(s => s !== slot))} className="text-red-500 font-bold">X</button>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="bg-white border text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100">Cancelar</button>
          <button type="button" onClick={handleSubmitBooking} disabled={submitDisabled} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent disabled:bg-gray-400">Guardar</button>
        </div>
      </div>
    </div>
  );
};