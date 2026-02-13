import React, { useState, useEffect, useMemo } from 'react';
import type { Product, UserInfo, Customer, TimeSlot, Booking } from '../../types';
import * as dataService from '../../services/dataService';
import * as adminValidator from '../../services/adminValidator';
import type { ValidationResult, ValidationWarning } from '../../services/adminValidator';
import { ConfirmAdminOverrideModal } from './ConfirmAdminOverrideModal';
import { COUNTRIES } from '@/constants';

interface ManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingAdded: () => void;
  existingBookings?: Booking[];
  availableProducts?: Product[];
  preselectedCustomer?: Customer;
}

export const ManualBookingModal: React.FC<ManualBookingModalProps> = ({ 
  isOpen, 
  onClose, 
  onBookingAdded,
  existingBookings = [],
  availableProducts = [],
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
  const [participants, setParticipants] = useState<number>(1);
  // Calendar and time picker states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // Admin Override states
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideInProgress, setOverrideInProgress] = useState(false);
  // Technique selection for CUSTOM_EXPERIENCE
  const [selectedTechnique, setSelectedTechnique] = useState<'potters_wheel' | 'hand_modeling' | 'painting' | null>(null);
  // Horarios en intervalos de 30 minutos de 09:00 a 20:30
  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = 9 + Math.floor(i / 2);
    const min = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${min}`;
  });

  // Función para obtener límites de participantes por tipo de producto
  const getParticipantsRange = (product: Product | null) => {
    if (!product) return { min: 1, max: 50 }; // Flexibilidad total por defecto
    
    switch(product.type) {
      case 'GROUP_CLASS': 
        return { 
          min: (product as any).minParticipants || 1, 
          max: 50 // Flexibilidad para grupos grandes
        };
      case 'SINGLE_CLASS':
      case 'CLASS_PACKAGE':
        return { min: 1, max: 30 }; // Máxima flexibilidad para el admin
      case 'INTRODUCTORY_CLASS':
        return { min: 1, max: 20 }; // Flexibilidad para grupos introductorios
      default:
        return { min: 1, max: 50 }; // Flexibilidad total por defecto
    }
  };

  // Validación de participantes - más flexible para admin
  const validateParticipants = (count: number, product: Product | null): boolean => {
    // Siempre permitir al menos 1 participante
    if (count < 1) return false;
    
    // Límite de seguridad muy alto para evitar errores de entrada
    if (count > 100) return false;
    
    // Para el administrador, ser más flexible con los límites
    return true;
  };

  useEffect(() => {
    // Usar los productos pasados como props
    setProducts(availableProducts);
    
    // Obtener customers correctamente usando la función async
    const fetchCustomers = async () => {
      const customers = await dataService.getCustomers();
      console.log('[ManualBookingModal] API getCustomers response:', customers);
      setAllCustomers(Array.isArray(customers) ? customers : []);
    };
    fetchCustomers();
  }, [availableProducts]);

  // Efecto para manejar el cliente preseleccionado
  useEffect(() => {
    if (preselectedCustomer?.userInfo) {
      setSelectedCustomer(preselectedCustomer);
      setUserInfo({
        firstName: preselectedCustomer.userInfo.firstName || '',
        lastName: preselectedCustomer.userInfo.lastName || '',
        email: preselectedCustomer.userInfo.email || '',
        phone: preselectedCustomer.userInfo.phone || '',
        countryCode: preselectedCustomer.userInfo.countryCode || COUNTRIES[0].code,
        birthday: preselectedCustomer.userInfo.birthday || ''
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
      setParticipants(1);
      setValidationResult(null);
      setShowOverrideModal(false);
      setOverrideInProgress(false);
      setAllCustomers(prev => {
        console.log('[ManualBookingModal] Reset allCustomers state:', prev);
        return Array.isArray(prev) ? prev : [];
      });
      if (preselectedCustomer?.userInfo) {
        setUserInfo({
          firstName: preselectedCustomer.userInfo.firstName || '',
          lastName: preselectedCustomer.userInfo.lastName || '',
          email: preselectedCustomer.userInfo.email || '',
          phone: preselectedCustomer.userInfo.phone || '',
          countryCode: preselectedCustomer.userInfo.countryCode || COUNTRIES[0].code,
          birthday: preselectedCustomer.userInfo.birthday || ''
        });
      } else {
        setUserInfo({ firstName: '', lastName: '', email: '', phone: '', countryCode: COUNTRIES[0].code, birthday: '' });
      }
    }
  }, [isOpen, preselectedCustomer]);

  // Efecto para resetear participants cuando cambia el producto
  useEffect(() => {
    if (selectedProduct) {
      const range = getParticipantsRange(selectedProduct);
      setParticipants(range.min);
      // Reset technique when product changes (unless it's CUSTOM_EXPERIENCE)
      if (selectedProduct.type !== 'CUSTOM_EXPERIENCE') {
        setSelectedTechnique(null);
      } else {
        // Default to potters_wheel for CUSTOM_EXPERIENCE
        setSelectedTechnique('potters_wheel');
      }
    }
  }, [selectedProduct]);

  const filteredCustomers = useMemo(() => {
    console.log('[ManualBookingModal] filteredCustomers useMemo - allCustomers:', allCustomers, 'searchTerm:', searchTerm);
    if (!searchTerm) return [];
    const safeCustomers = Array.isArray(allCustomers) ? allCustomers : [];
    return safeCustomers.filter(c =>
      c?.userInfo?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c?.userInfo?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c?.userInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [allCustomers, searchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setUserInfo(customer?.userInfo || { firstName: '', lastName: '', email: '', phone: '', countryCode: COUNTRIES[0].code, birthday: '' });
    setSearchTerm('');
  };
  const resetCustomerSelection = () => {
    setSelectedCustomer(null);
    setUserInfo({ firstName: '', lastName: '', email: '', phone: '', countryCode: COUNTRIES[0].code, birthday: '' });
  };

  // Validar y mostrar confirmación si hay warnings
  const handleValidateAndSubmit = async () => {
    setSubmitDisabled(true);
    setProductError('');
    try {
      // Validación básica
      if (!selectedCustomer) throw new Error('Selecciona un cliente');
      
      // Determinar si es Experiencia Personalizada (selectedProduct === null) o producto de catálogo
      const isCustomExperience = selectedProduct === null;
      
      if (!isCustomExperience && !selectedProduct) {
        setProductError('Selecciona un producto o experiencia antes de continuar.');
        setSubmitDisabled(false);
        return;
      }
      
      if (isCustomExperience && !selectedTechnique) {
        throw new Error('Selecciona una técnica para la experiencia personalizada');
      }
      
      if (!selectedSlots.length) throw new Error('Agrega al menos un horario');
      if (participants < 1 || participants > 100) {
        throw new Error('Número de participantes debe estar entre 1 y 100');
      }

      // Para Experiencia Personalizada, no hay validación de reglas (es más flexible)
      if (isCustomExperience) {
        // Validación simple para availability
        const validation = await adminValidator.validateAdminBooking({
          date: selectedSlots[0].date,
          time: selectedSlots[0].time,
          technique: selectedTechnique,
          participants,
          productType: 'CUSTOM_EXPERIENCE',
          product: null
        });

        setValidationResult(validation);

        if (!validation.isValid || validation.warnings.length > 0) {
          setShowOverrideModal(true);
          setSubmitDisabled(false);
          return;
        }
      } else {
        // Para productos de catálogo, validar reglas completas
        const validation = await adminValidator.validateAdminBooking({
          date: selectedSlots[0].date,
          time: selectedSlots[0].time,
          technique: selectedProduct.details?.technique,
          participants,
          productType: selectedProduct.type,
          product: selectedProduct
        });

        setValidationResult(validation);

        if (!validation.isValid || validation.warnings.length > 0) {
          setShowOverrideModal(true);
          setSubmitDisabled(false);
          return;
        }
      }

      // Si es válido → crear directamente sin override
      await performBookingSubmit(false, '');
    } catch (err: any) {
      if (typeof window !== 'undefined') {
        window.alert(err.message || 'Error al validar la reserva');
      }
      setSubmitDisabled(false);
    }
  };

  // Realizar el envío de la reserva (con o sin override)
  const performBookingSubmit = async (adminOverride: boolean, overrideReason: string) => {
    setOverrideInProgress(true);
    try {
      const isCustomExperience = selectedProduct === null;
      const firstSlot = selectedSlots[0];

      if (isCustomExperience) {
        // Para Experiencia Personalizada: usar createCustomExperienceBooking
        const customExperiencePayload = {
          experienceType: 'ceramic_only',
          technique: selectedTechnique,
          date: firstSlot.date,
          time: firstSlot.time,
          participants,
          config: {
            participants
          },
          userInfo: selectedCustomer?.userInfo || {
            firstName: selectedCustomer?.userInfo?.firstName || '',
            lastName: selectedCustomer?.userInfo?.lastName || '',
            email: selectedCustomer?.userInfo?.email || '',
            phone: selectedCustomer?.userInfo?.phone || '',
            countryCode: selectedCustomer?.userInfo?.countryCode || '',
            birthday: selectedCustomer?.userInfo?.birthday || null
          },
          totalPrice: Number(price) || 0,
          menuSelections: [],
          adminOverride,
          overrideReason: adminOverride ? overrideReason : undefined,
          violatedRules: adminOverride ? (validationResult?.warnings || []) : undefined,
          clientNote
        };

        const response = await fetch('/api/data?action=createCustomExperienceBooking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customExperiencePayload)
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'No se pudo crear la experiencia personalizada');
        }
      } else {
        // Para productos de catálogo: usar addBooking
        const bookingData = {
          userInfo: selectedCustomer?.userInfo || {
            firstName: selectedCustomer?.userInfo?.firstName || '',
            lastName: selectedCustomer?.userInfo?.lastName || '',
            email: selectedCustomer?.userInfo?.email || '',
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
          paymentDetails: [],
          participants,
          // Técnica para CUSTOM_EXPERIENCE
          ...(selectedProduct.type === 'CUSTOM_EXPERIENCE' && selectedTechnique ? { technique: selectedTechnique } : {}),
          // Admin override flags
          adminOverride,
          overrideReason: adminOverride ? overrideReason : undefined,
          violatedRules: adminOverride ? (validationResult?.warnings || []) : undefined
        };

        const result = await dataService.addBooking(bookingData);
        if (!result.success) throw new Error(result.message || 'No se pudo agendar la clase');
      }

      // Feedback visual profesional
      if (typeof window !== 'undefined') {
        window.alert(
          adminOverride 
            ? '✅ Experiencia/Clase agendada exitosamente con override admin'
            : '✅ Experiencia/Clase agendada exitosamente'
        );
      }

      onBookingAdded();
      onClose();
    } catch (err: any) {
      if (typeof window !== 'undefined') {
        window.alert(err.message || 'Error al agendar la clase');
      }
    } finally {
      setOverrideInProgress(false);
      setShowOverrideModal(false);
      setSubmitDisabled(false);
    }
  };

  // No renderizar si el modal no está abierto
  if (!isOpen) {
    return null;
  }

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
          <label className="block text-sm font-bold mb-1">Producto o Experiencia</label>
          <div className="space-y-2">
            {/* Opción de Experiencia Personalizada (sin producto de catálogo) */}
            <button
              type="button"
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors duration-200 ${selectedProduct === null && (selectedTechnique !== null) ? 'border-brand-primary bg-purple-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
              onClick={() => { 
                setSelectedProduct(null); 
                setSelectedTechnique('potters_wheel');
                setProductError(''); 
              }}
              aria-label="Crear experiencia personalizada"
            >
              <span className="material-icons text-purple-600">celebration</span>
              <div className="flex-1 text-left">
                <div className="font-bold text-brand-text">Experiencia Personalizada</div>
                <div className="text-xs text-brand-secondary">Crear una experiencia única (sin producto de catálogo)</div>
              </div>
            </button>

            {/* Productos de catálogo */}
            {(() => {
              const seenNames = new Set<string>();
              const filtered = products
                .filter(p => {
                  if (p.type === 'SINGLE_CLASS') {
                    if (seenNames.has(p.name)) return false;
                    seenNames.add(p.name);
                    return true;
                  }
                  if (p.isActive && (p.type === 'CLASS_PACKAGE' || p.type === 'INTRODUCTORY_CLASS')) {
                    return true;
                  }
                  return false;
                });
              
              return filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors duration-200 ${selectedProduct?.id === p.id ? 'border-brand-primary bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                  onClick={() => { setSelectedProduct(p); setSelectedTechnique(null); setProductError(''); }}
                  aria-label={`Seleccionar ${p.name}`}
                >
                  <span className="inline-block">
                    {p.type === 'CLASS_PACKAGE' && <span className="material-icons text-brand-primary">layers</span>}
                    {p.type === 'SINGLE_CLASS' && <span className="material-icons text-green-600">person</span>}
                    {p.type === 'INTRODUCTORY_CLASS' && <span className="material-icons text-indigo-600">star</span>}
                  </span>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-brand-text">{p.name}</div>
                    <div className="text-xs text-brand-secondary">{p.type === 'CLASS_PACKAGE' ? 'Paquete de Clases' : p.type === 'SINGLE_CLASS' ? 'Clase Individual' : 'Introductoria'}</div>
                    <div className="text-xs text-gray-500">{p.details?.duration || ''}</div>
                  </div>
                  <div className="font-bold text-brand-primary">${p.price?.toFixed(2) || ''}</div>
                </button>
              ));
            })()}
          </div>
          {productError && <div className="text-red-500 text-sm mt-2">{productError}</div>}
        </div>
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Precio</label>
            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">
              Participantes
              <span className="text-xs text-gray-500 ml-1">
                {selectedProduct?.type === 'SINGLE_CLASS' ? '(Siempre 1)' : '(1-100 personas)'}
              </span>
            </label>
            <input 
              type="number" 
              min={1}
              max={selectedProduct?.type === 'SINGLE_CLASS' ? 1 : 100}
              value={participants} 
              onChange={e => {
                const value = Math.max(1, parseInt(e.target.value) || 1);
                // Para SINGLE_CLASS, forzar siempre 1
                if (selectedProduct?.type === 'SINGLE_CLASS') {
                  setParticipants(1);
                } else if (value >= 1 && value <= 100) {
                  setParticipants(value);
                }
              }}
              disabled={selectedProduct?.type === 'SINGLE_CLASS'}
              className={`w-full px-3 py-2 border rounded-lg ${
                selectedProduct?.type === 'SINGLE_CLASS' 
                  ? 'bg-gray-100 cursor-not-allowed' 
                  : ''
              } ${participants < 1 || participants > 100 ? 'border-red-500' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Nota</label>
            <input type="text" value={clientNote} onChange={e => setClientNote(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
          </div>
        </div>
        
        {/* Técnica selector para Experiencia Personalizada (selectedProduct === null) */}
        {(selectedProduct === null || selectedProduct?.type === 'CUSTOM_EXPERIENCE') && (
          <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <label className="block text-sm font-bold mb-3 text-purple-900">Seleccionar Técnica</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTechnique('potters_wheel')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedTechnique === 'potters_wheel'
                    ? 'border-blue-600 bg-blue-100 text-blue-900 font-bold'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                🎡 Torno Alfarero
              </button>
              <button
                type="button"
                onClick={() => setSelectedTechnique('hand_modeling')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedTechnique === 'hand_modeling'
                    ? 'border-green-600 bg-green-100 text-green-900 font-bold'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                ✋ Modelado a Mano
              </button>
              <button
                type="button"
                onClick={() => setSelectedTechnique('painting')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedTechnique === 'painting'
                    ? 'border-red-600 bg-red-100 text-red-900 font-bold'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                🎨 Pintura de Piezas
              </button>
            </div>
          </div>
        )}
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
          <button type="button" onClick={handleValidateAndSubmit} disabled={submitDisabled} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent disabled:bg-gray-400">Guardar</button>
        </div>
      </div>

      {/* Modal de confirmación de override */}
      <ConfirmAdminOverrideModal
        isOpen={showOverrideModal}
        onClose={() => {
          setShowOverrideModal(false);
          setValidationResult(null);
        }}
        onConfirm={(reason) => performBookingSubmit(true, reason)}
        warnings={validationResult?.warnings || []}
        bookingDetails={{
          customerName: selectedCustomer 
            ? `${selectedCustomer.userInfo?.firstName} ${selectedCustomer.userInfo?.lastName}`
            : 'Cliente desconocido',
          productName: selectedProduct?.name || 'Producto desconocido',
          date: selectedSlots[0]?.date || '',
          time: selectedSlots[0]?.time || '',
          participants
        }}
        isLoading={overrideInProgress}
      />
    </div>
  );
};