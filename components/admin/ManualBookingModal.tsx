import React, { useState, useEffect } from 'react';
import { getEcuadorToday, formatDateToYYYYMMDD } from '../../utils/formatters';
import type { Product, UserInfo, Customer, TimeSlot, Booking } from '../../types';
import * as dataService from '../../services/dataService';
import * as adminValidator from '../../services/adminValidator';
import type { ValidationResult, ValidationWarning } from '../../services/adminValidator';
import { ConfirmAdminOverrideModal } from './ConfirmAdminOverrideModal';
import { SpaceRentalBookingForm } from './SpaceRentalBookingForm';
import { COUNTRIES } from '@/constants';
import { useAdminData } from '../../context/AdminDataContext';
import { customerMatchesSearch } from '../../utils/textSearch';
import {
  CREATIVE_CATEGORIES,
  getCreativeSku,
  skusForCategory,
  totalPriceCharged,
  unitPriceCharged,
  type CreativeSku,
} from '../../config/creativeExperiences';

interface ManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingAdded: () => void;
  existingBookings?: Booking[];
  /** @deprecated Ya no se listan productos legacy en este modal; se mantiene por compatibilidad de callers. */
  availableProducts?: Product[];
  preselectedCustomer?: Customer;
}

function isCreativeCatalogProduct(product: Product | null): boolean {
  if (!product) return false;
  const details = (product as any).details || {};
  return (
    details.bookingSource === 'creative_experiences' ||
    Boolean(details.serviceKind) ||
    String(product.id || '').startsWith('creative-')
  );
}

function catalogSingleClassForcesOnePerson(product: Product | null): boolean {
  if (!product || product.type !== 'SINGLE_CLASS') return false;
  return !isCreativeCatalogProduct(product);
}

/** Mismo shape que el wizard público: capacityTechnique + serviceKind para cupos. */
function buildCreativeAdminProduct(sku: CreativeSku, participants: number, totalPrice?: number): Product {
  const charged = totalPrice ?? totalPriceCharged(sku, participants);
  return {
    id: `creative-${sku.id}`,
    name: sku.label,
    type: 'SINGLE_CLASS',
    price: charged,
    classes: 1,
    description: sku.shortDesc || sku.label,
    isActive: true,
    details: {
      technique: sku.capacityTechnique,
      serviceKind: sku.id,
      bookingSource: 'creative_experiences',
      participants,
      duration: sku.duration || 'hasta 2 horas',
      durationHours: 2,
      minParticipants: sku.minParticipants,
      maxParticipants: sku.maxParticipants,
    },
  } as Product;
}

function techniqueLabelForCreative(sku: CreativeSku): string {
  switch (sku.capacityTechnique) {
    case 'potters_wheel':
      return 'cupo torno';
    case 'painting':
      return 'cupo pintura';
    default:
      return 'cupo mesa';
  }
}

export const ManualBookingModal: React.FC<ManualBookingModalProps> = ({ 
  isOpen, 
  onClose, 
  onBookingAdded,
  existingBookings = [],
  preselectedCustomer
}) => {
  const adminData = useAdminData();
  const [manualMode, setManualMode] = useState<'standard' | 'choose' | 'space_rental'>('choose');
  const [productError, setProductError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(preselectedCustomer || null);
  const [userInfo, setUserInfo] = useState<UserInfo>({ firstName: '', lastName: '', email: '', phone: '', countryCode: COUNTRIES[0].code, birthday: '' });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  /** SKU creativo elegido (leather, tote, charm…); null = experiencia personalizada */
  const [selectedCreativeSkuId, setSelectedCreativeSkuId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [clientNote, setClientNote] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [createCustomerError, setCreateCustomerError] = useState('');
  const [newCustomerForm, setNewCustomerForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: COUNTRIES[0].code,
  });
  const [participants, setParticipants] = useState<number>(1);
  /** Texto del input — evita forzar "1" mientras el admin borra para escribir otro número */
  const [participantsInput, setParticipantsInput] = useState('1');

  const commitParticipantsInput = (raw: string): number => {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) {
      setParticipants(1);
      setParticipantsInput('1');
      return 1;
    }
    const clamped = Math.min(100, n);
    setParticipants(clamped);
    setParticipantsInput(String(clamped));
    return clamped;
  };
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
  // Horarios admin: 09:00–21:00 (flexibilidad fuera del tope público de 18:00)
  const timeOptions = Array.from({ length: 25 }, (_, i) => {
    const hour = 9 + Math.floor(i / 2);
    const min = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${min}`;
  });

  const selectedCreativeSku = selectedCreativeSkuId
    ? getCreativeSku(selectedCreativeSkuId) || null
    : null;

  // Función para obtener límites de participantes por tipo de producto
  const getParticipantsRange = (product: Product | null, creativeSku: CreativeSku | null = null) => {
    if (creativeSku) {
      // Admin: mínimo del SKU, máximo flexible (puede override)
      return { min: creativeSku.minParticipants || 1, max: 100 };
    }
    if (!product) return { min: 1, max: 50 }; // Flexibilidad total por defecto
    
    switch(product.type) {
      case 'GROUP_CLASS': 
        return { 
          min: (product as any).minParticipants || 1, 
          max: 50 // Flexibilidad para grupos grandes
        };
      case 'SINGLE_CLASS':
        if (isCreativeCatalogProduct(product)) {
          const details = (product as any).details || {};
          return {
            min: Number(details.minParticipants) || 1,
            max: 100,
          };
        }
        return { min: 1, max: 1 };
      case 'CLASS_PACKAGE':
        return { min: 1, max: 30 }; // Máxima flexibilidad para el admin
      case 'INTRODUCTORY_CLASS':
        return { min: 1, max: 20 }; // Flexibilidad para grupos introductorios
      default:
        return { min: 1, max: 50 }; // Flexibilidad total por defecto
    }
  };

  const selectCreativeSku = (sku: CreativeSku) => {
    const count = Math.max(sku.minParticipants || 1, 1);
    const product = buildCreativeAdminProduct(sku, count);
    setSelectedCreativeSkuId(sku.id);
    setSelectedProduct(product);
    setSelectedTechnique(null);
    setParticipants(count);
    setParticipantsInput(String(count));
    setPrice(String(totalPriceCharged(sku, count)));
    setProductError('');
  };

  const clearCreativeSelection = () => {
    setSelectedCreativeSkuId(null);
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

  // Búsqueda de clientes en vivo (server-side) — getCustomers ahora paginado devolvía objeto y el dropdown quedaba vacío
  useEffect(() => {
    if (selectedCustomer) return;
    const term = searchTerm.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setIsSearchingCustomers(false);
      return;
    }

    let cancelled = false;
    setIsSearchingCustomers(true);
    const timer = window.setTimeout(async () => {
      try {
        const [fromSearch, fromStandalone] = await Promise.all([
          dataService.getCustomers({ search: term, limit: 30 }),
          dataService.getStandaloneCustomers(term),
        ]);
        if (cancelled) return;

        const map = new Map<string, Customer>();
        const add = (c: Customer) => {
          const key = (c.email || c.userInfo?.email || '').trim().toLowerCase();
          if (!key) return;
          if (!map.has(key)) map.set(key, { ...c, email: key });
        };
        fromSearch.forEach(add);
        fromStandalone.forEach(add);
        // También incluir clientes ya cargados en admin (reservas) — sin tildes
        (adminData.customers || []).forEach((c) => {
          if (customerMatchesSearch(c, term)) add(c);
        });

        setSearchResults(Array.from(map.values()).slice(0, 12));
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setIsSearchingCustomers(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchTerm, selectedCustomer, adminData.customers]);

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
      setSelectedCreativeSkuId(null);
      setPrice('');
      setClientNote('');
      setSelectedSlots([]);
      setSelectedDate('');
      setSelectedTime('');
      setShowCalendar(false);
      setShowTimePicker(false);
      setProductError('');
      setSearchTerm('');
      setSearchResults([]);
      setShowCreateCustomer(false);
      setCreateCustomerError('');
      setCreatingCustomer(false);
      setManualMode('choose');
      setNewCustomerForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        countryCode: COUNTRIES[0].code,
      });
      setParticipants(1);
      setParticipantsInput('1');
      setValidationResult(null);
      setShowOverrideModal(false);
      setOverrideInProgress(false);
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

  // Efecto para resetear participants cuando cambia el producto (no creativo: selectCreativeSku ya fija cupos/precio)
  useEffect(() => {
    if (!selectedProduct || selectedCreativeSkuId) return;
    const range = getParticipantsRange(selectedProduct, null);
    setParticipants(range.min);
    setParticipantsInput(String(range.min));
    if (selectedProduct.type !== 'CUSTOM_EXPERIENCE') {
      setSelectedTechnique(null);
    } else {
      setSelectedTechnique('potters_wheel');
    }
  }, [selectedProduct, selectedCreativeSkuId]);

  // Recalcular precio sugerido al cambiar participantes de una experiencia creativa
  useEffect(() => {
    if (!selectedCreativeSkuId) return;
    const sku = getCreativeSku(selectedCreativeSkuId);
    if (!sku) return;
    const n = Math.max(1, participants);
    setSelectedProduct(buildCreativeAdminProduct(sku, n));
    setPrice(String(totalPriceCharged(sku, n)));
  }, [participants, selectedCreativeSkuId]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setUserInfo(customer?.userInfo || { firstName: '', lastName: '', email: '', phone: '', countryCode: COUNTRIES[0].code, birthday: '' });
    setSearchTerm('');
    setSearchResults([]);
    setShowCreateCustomer(false);
    setManualMode('choose');
  };
  const resetCustomerSelection = () => {
    setSelectedCustomer(null);
    setUserInfo({ firstName: '', lastName: '', email: '', phone: '', countryCode: COUNTRIES[0].code, birthday: '' });
    setManualMode('choose');
    setSearchTerm('');
    setSearchResults([]);
  };

  const openCreateCustomer = () => {
    const parts = searchTerm.trim().split(/\s+/).filter(Boolean);
    setNewCustomerForm({
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      email: searchTerm.includes('@') ? searchTerm.trim().toLowerCase() : '',
      phone: '',
      countryCode: COUNTRIES[0].code,
    });
    setCreateCustomerError('');
    setShowCreateCustomer(true);
  };

  const handleCreateCustomer = async () => {
    setCreateCustomerError('');
    const email = newCustomerForm.email.trim().toLowerCase();
    const firstName = newCustomerForm.firstName.trim();
    const lastName = newCustomerForm.lastName.trim();
    const phone = newCustomerForm.phone.trim();
    if (!firstName || !lastName) {
      setCreateCustomerError('Nombre y apellido son obligatorios.');
      return;
    }
    if (!email || !email.includes('@')) {
      setCreateCustomerError('Indica un email válido.');
      return;
    }
    if (!phone) {
      setCreateCustomerError('Indica un teléfono.');
      return;
    }

    setCreatingCustomer(true);
    try {
      const created = await dataService.createCustomer({
        email,
        firstName,
        lastName,
        phone,
        countryCode: newCustomerForm.countryCode || COUNTRIES[0].code,
      });
      handleSelectCustomer(created);
    } catch (err: any) {
      setCreateCustomerError(err?.message || 'No se pudo crear el cliente.');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Validar y mostrar confirmación si hay warnings
  const handleValidateAndSubmit = async () => {
    setSubmitDisabled(true);
    setProductError('');
    try {
      // Validación básica
      if (!selectedCustomer) throw new Error('Selecciona un cliente');
      
      // Experiencia Personalizada = selectedProduct === null y sin SKU creativo
      const isCustomExperience = selectedProduct === null && !selectedCreativeSku;
      
      if (!isCustomExperience && !selectedProduct && !selectedCreativeSku) {
        setProductError('Selecciona un producto o experiencia antes de continuar.');
        setSubmitDisabled(false);
        return;
      }
      
      if (isCustomExperience && !selectedTechnique) {
        throw new Error('Selecciona una técnica para la experiencia personalizada');
      }
      
      if (!selectedSlots.length) throw new Error('Agrega al menos un horario');
      const participantsCount =
        !isCustomExperience && catalogSingleClassForcesOnePerson(selectedProduct)
          ? 1
          : commitParticipantsInput(participantsInput);
      if (participantsCount < 1 || participantsCount > 100) {
        throw new Error('Número de participantes debe estar entre 1 y 100');
      }

      const productForValidation = selectedCreativeSku
        ? buildCreativeAdminProduct(
            selectedCreativeSku,
            participantsCount,
            Number(price) || totalPriceCharged(selectedCreativeSku, participantsCount)
          )
        : selectedProduct;

      // Para Experiencia Personalizada, no hay validación de reglas (es más flexible)
      if (isCustomExperience) {
        // Validación simple para availability
        const validation = await adminValidator.validateAdminBooking({
          date: selectedSlots[0].date,
          time: selectedSlots[0].time,
          technique: selectedTechnique,
          participants: participantsCount,
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
        // Catálogo / experiencias creativas
        const validation = await adminValidator.validateAdminBooking({
          date: selectedSlots[0].date,
          time: selectedSlots[0].time,
          technique:
            (productForValidation as any)?.details?.technique ||
            selectedCreativeSku?.capacityTechnique,
          participants: participantsCount,
          productType: productForValidation?.type || 'SINGLE_CLASS',
          product: productForValidation
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
      const isCustomExperience = selectedProduct === null && !selectedCreativeSku;
      const participantsCount =
        !isCustomExperience && catalogSingleClassForcesOnePerson(selectedProduct)
          ? 1
          : commitParticipantsInput(participantsInput);
      const firstSlot = selectedSlots[0];

      let createdBooking: Booking | null = null;

      if (isCustomExperience) {
        // Para Experiencia Personalizada: usar createCustomExperienceBooking
        const customExperiencePayload = {
          experienceType: 'ceramic_only',
          technique: selectedTechnique,
          date: firstSlot.date,
          time: firstSlot.time,
          participants: participantsCount,
          config: {
            participants: participantsCount
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

        const customResult = await dataService.createCustomExperienceBooking(customExperiencePayload);
        if (!customResult.success) {
          throw new Error(customResult.error || 'No se pudo crear la experiencia personalizada');
        }
        createdBooking = customResult.booking ?? null;
      } else {
        const productToBook = selectedCreativeSku
          ? buildCreativeAdminProduct(
              selectedCreativeSku,
              participantsCount,
              Number(price) || totalPriceCharged(selectedCreativeSku, participantsCount)
            )
          : selectedProduct;

        if (!productToBook) {
          throw new Error('Selecciona un producto o experiencia');
        }

        // Catálogo o experiencia creativa (leather, tote, charm…)
        const bookingData = {
          userInfo: selectedCustomer?.userInfo || {
            firstName: selectedCustomer?.userInfo?.firstName || '',
            lastName: selectedCustomer?.userInfo?.lastName || '',
            email: selectedCustomer?.userInfo?.email || '',
            phone: selectedCustomer?.userInfo?.phone || '',
            countryCode: selectedCustomer?.userInfo?.countryCode || '',
            birthday: selectedCustomer?.userInfo?.birthday || null
          },
          productId: productToBook.id,
          price: Number(price) || productToBook.price,
          clientNote,
          slots: selectedSlots,
          product: productToBook,
          productType: productToBook.type,
          bookingMode: 'flexible',
          isPaid: false,
          paymentDetails: [],
          participants: participantsCount,
          technique:
            productToBook.type === 'CUSTOM_EXPERIENCE' && selectedTechnique
              ? selectedTechnique
              : (productToBook as any).details?.technique ||
                selectedCreativeSku?.capacityTechnique ||
                undefined,
          adminOverride,
          overrideReason: adminOverride ? overrideReason : undefined,
          violatedRules: adminOverride ? (validationResult?.warnings || []) : undefined
        };

        const result = await dataService.addBooking(bookingData);
        if (!result.success) throw new Error(result.message || 'No se pudo agendar la clase');
        createdBooking = result.booking ?? null;
      }

      if (createdBooking?.id) {
        adminData.optimisticUpsertBooking(createdBooking);
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
            <label className="block text-sm font-semibold text-brand-text mb-1">Buscar cliente</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setShowCreateCustomer(false);
              }}
              placeholder="Nombre, apellido o email (mín. 2 letras)"
              className="w-full p-2.5 border rounded-lg"
              autoFocus
            />
            {searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
              <p className="text-xs text-brand-secondary mt-1">Escribe al menos 2 caracteres para buscar.</p>
            )}
            {isSearchingCustomers && (
              <p className="text-xs text-brand-secondary mt-2">Buscando…</p>
            )}
            {searchResults.length > 0 && (
              <ul className="bg-white border rounded-lg mt-1 shadow-lg max-h-56 overflow-y-auto z-10 relative">
                {searchResults.map(c => (
                  <li
                    key={c.email || c.userInfo?.email}
                    onClick={() => handleSelectCustomer(c)}
                    className="p-2.5 hover:bg-brand-primary/5 cursor-pointer border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium text-brand-text text-sm">
                      {c.userInfo?.firstName} {c.userInfo?.lastName}
                    </div>
                    <div className="text-xs text-brand-secondary">{c.userInfo?.email || c.email}</div>
                  </li>
                ))}
              </ul>
            )}
            {!isSearchingCustomers && searchTerm.trim().length >= 2 && searchResults.length === 0 && !showCreateCustomer && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-950 font-medium">No encontramos ese cliente.</p>
                <p className="text-xs text-amber-900/80 mt-0.5">Puedes crearlo aquí sin salir de esta pantalla.</p>
                <button
                  type="button"
                  onClick={openCreateCustomer}
                  className="mt-2 text-sm font-semibold text-brand-primary hover:underline"
                >
                  + Crear cliente nuevo
                </button>
              </div>
            )}
            {!showCreateCustomer && searchTerm.trim().length >= 2 && searchResults.length > 0 && (
              <button
                type="button"
                onClick={openCreateCustomer}
                className="mt-2 text-sm font-semibold text-brand-secondary hover:text-brand-primary"
              >
                + El cliente no está en la lista — crear nuevo
              </button>
            )}

            {showCreateCustomer && (
              <div className="mt-3 rounded-2xl border border-brand-border bg-brand-surface p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-brand-text">Nuevo cliente</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateCustomer(false)}
                    className="text-xs font-semibold text-brand-secondary hover:text-brand-text"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={newCustomerForm.firstName}
                    onChange={(e) => setNewCustomerForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Apellido"
                    value={newCustomerForm.lastName}
                    onChange={(e) => setNewCustomerForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={newCustomerForm.email}
                  onChange={(e) => setNewCustomerForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full p-2 border rounded-lg text-sm"
                />
                <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr] gap-2">
                  <select
                    value={newCustomerForm.countryCode}
                    onChange={(e) => setNewCustomerForm((p) => ({ ...p, countryCode: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-sm bg-white"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
                {createCustomerError && <p className="text-sm text-red-600">{createCustomerError}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateCustomer(false)}
                    className="px-3 py-2 text-sm font-semibold border rounded-lg text-brand-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCustomer}
                    disabled={creatingCustomer}
                    className="px-3 py-2 text-sm font-semibold rounded-lg bg-brand-primary text-white disabled:bg-gray-300"
                  >
                    {creatingCustomer ? 'Creando…' : 'Crear y continuar'}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button type="button" onClick={onClose} className="bg-white border text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100">
                Cancelar
              </button>
            </div>
          </div>
        )}
        {selectedCustomer && (
          <div className="mb-4 p-3 bg-gray-100 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Cliente Seleccionado:</h3>
            <div className="text-sm text-gray-600 flex justify-between items-start gap-2">
              <div>
                <strong>{selectedCustomer.userInfo?.firstName} {selectedCustomer.userInfo?.lastName}</strong><br />
                {selectedCustomer.email || selectedCustomer.userInfo?.email}
              </div>
              <button onClick={resetCustomerSelection} className="text-red-500 font-bold text-sm shrink-0" type="button">
                Cambiar
              </button>
            </div>
          </div>
        )}

        {selectedCustomer && manualMode === 'choose' && (
          <div className="space-y-3 mb-2">
            <p className="text-sm text-brand-secondary">¿Qué quieres agendar?</p>
            <button
              type="button"
              onClick={() => setManualMode('standard')}
              className="w-full text-left rounded-2xl border border-brand-border p-4 hover:border-brand-primary/40 hover:bg-brand-primary/[0.03] transition-all"
            >
              <div className="font-semibold text-brand-text">Experiencia creativa</div>
              <div className="text-xs text-brand-secondary mt-1">
                Cerámica, tote, leather, charm, canvas, cepillo… o precio personalizado.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setManualMode('space_rental')}
              className="w-full text-left rounded-2xl border border-brand-primary/25 bg-brand-primary/[0.04] p-4 hover:border-brand-primary/50 transition-all"
            >
              <div className="font-semibold text-brand-text">Alquiler de espacio</div>
              <div className="text-xs text-brand-secondary mt-1">
                Evento privado. Bloquea todo el taller mientras dure. El cliente recibe un correo al confirmar.
              </div>
            </button>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={onClose} className="bg-white border text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {selectedCustomer && manualMode === 'space_rental' && (
          <SpaceRentalBookingForm
            selectedCustomer={selectedCustomer}
            onBack={() => setManualMode('choose')}
            onSuccess={(booking, message) => {
              if (booking?.id) {
                adminData.optimisticUpsertBooking(booking);
              }
              if (typeof window !== 'undefined') {
                window.alert(message);
              }
              onBookingAdded();
              onClose();
            }}
          />
        )}

        {selectedCustomer && manualMode === 'standard' && (
        <>
        <button
          type="button"
          onClick={() => setManualMode('choose')}
          className="text-sm font-semibold text-brand-secondary hover:text-brand-text mb-3"
        >
          ← Cambiar tipo de reserva
        </button>
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1">Producto o Experiencia</label>
          <div className="space-y-3">
            {/* Catálogo creativo (mismo que la web) — único listado de actividades */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
              <div>
                <div className="text-sm font-bold text-emerald-950">Experiencias creativas</div>
                <div className="text-xs text-emerald-900/70">
                  Cerámica, tote bag, leather, charm bar, canvas y cepillo.
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                {CREATIVE_CATEGORIES.map((category) => {
                  const skus = skusForCategory(category.id);
                  if (skus.length === 0) return null;
                  return (
                    <div key={category.id}>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800/80 mb-1">
                        {category.label}
                      </div>
                      <div className="space-y-1">
                        {skus.map((sku) => {
                          const selected = selectedCreativeSkuId === sku.id;
                          const unit = unitPriceCharged(sku);
                          return (
                            <button
                              key={sku.id}
                              type="button"
                              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                                selected
                                  ? 'border-emerald-600 bg-white shadow-sm'
                                  : 'border-emerald-100 bg-white/80 hover:bg-white'
                              }`}
                              onClick={() => selectCreativeSku(sku)}
                              aria-label={`Seleccionar ${sku.label}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-brand-text text-sm truncate">{sku.label}</div>
                                <div className="text-[11px] text-brand-secondary">
                                  {techniqueLabelForCreative(sku)}
                                  {sku.minParticipants > 1 ? ` · mín. ${sku.minParticipants}` : ''}
                                  {sku.maxParticipants > 1 ? ` · hasta ${sku.maxParticipants}` : ''}
                                </div>
                              </div>
                              <div className="text-sm font-bold text-emerald-800 shrink-0">
                                ${unit.toFixed(2)}
                                <span className="text-[10px] font-medium text-brand-secondary"> /p</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Precio / técnica acordada fuera del catálogo */}
            <button
              type="button"
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors duration-200 ${selectedProduct === null && !selectedCreativeSkuId && (selectedTechnique !== null) ? 'border-brand-primary bg-purple-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
              onClick={() => { 
                clearCreativeSelection();
                setSelectedProduct(null); 
                setSelectedTechnique('potters_wheel');
                setProductError(''); 
              }}
              aria-label="Crear experiencia personalizada"
            >
              <div className="flex-1 text-left">
                <div className="font-bold text-brand-text">Experiencia personalizada</div>
                <div className="text-xs text-brand-secondary">Precio o técnica especial acordada (sin SKU del catálogo)</div>
              </div>
            </button>
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
                {catalogSingleClassForcesOnePerson(selectedProduct)
                  ? '(Siempre 1)'
                  : selectedCreativeSku?.minParticipants && selectedCreativeSku.minParticipants > 1
                    ? `(mín. ${selectedCreativeSku.minParticipants}, admin flexible)`
                    : '(1-100 personas)'}
              </span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={participantsInput}
              onChange={e => {
                if (catalogSingleClassForcesOnePerson(selectedProduct)) {
                  setParticipants(1);
                  setParticipantsInput('1');
                  return;
                }
                const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
                setParticipantsInput(digits);
                if (digits !== '') {
                  const n = parseInt(digits, 10);
                  if (n >= 1 && n <= 100) setParticipants(n);
                }
              }}
              onBlur={() => {
                if (catalogSingleClassForcesOnePerson(selectedProduct)) {
                  setParticipants(1);
                  setParticipantsInput('1');
                  return;
                }
                commitParticipantsInput(participantsInput);
              }}
              disabled={catalogSingleClassForcesOnePerson(selectedProduct)}
              className={`w-full px-3 py-2 border rounded-lg ${
                catalogSingleClassForcesOnePerson(selectedProduct)
                  ? 'bg-gray-100 cursor-not-allowed'
                  : ''
              } ${participants < 1 || participants > 100 ? 'border-red-500' : ''}`}
            />
            {selectedCreativeSku && (
              <p className="text-xs text-brand-secondary mt-1">
                Precio sugerido: ${unitPriceCharged(selectedCreativeSku).toFixed(2)} × {participants} = $
                {totalPriceCharged(selectedCreativeSku, participants).toFixed(2)} (editable arriba)
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Nota interna</label>
            <input
              type="text"
              value={clientNote}
              onChange={e => setClientNote(e.target.value)}
              placeholder="Ej. abono pendiente, niño de 8 años…"
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-brand-secondary mt-1">
              Visible en el detalle del slot y en el PDF del calendario. No se envía al cliente (salvo alquiler de espacio).
            </p>
          </div>
        </div>
        
        {/* Técnica selector para Experiencia Personalizada (sin SKU creativo) */}
        {!selectedCreativeSkuId && (selectedProduct === null || selectedProduct?.type === 'CUSTOM_EXPERIENCE') && (
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
              min={formatDateToYYYYMMDD(getEcuadorToday())}
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
        </>
        )}
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
          productName: selectedCreativeSku?.label || selectedProduct?.name || 'Producto desconocido',
          date: selectedSlots[0]?.date || '',
          time: selectedSlots[0]?.time || '',
          participants
        }}
        isLoading={overrideInProgress}
      />
    </div>
  );
};