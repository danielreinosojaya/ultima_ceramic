import React, { useState, useEffect } from 'react';
// Eliminado useLanguage, la app ahora es monolingüe en español
import * as dataService from '../services/dataService';
import type { GroupInquiry, FooterInfo } from '../types';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { InfoCircleIcon } from './icons/InfoCircleIcon';

interface GroupInquiryFormProps {
  onBack: () => void;
  inquiryType: 'group' | 'couple' | 'team_building';
  footerInfo: FooterInfo;
}

type FormData = Omit<GroupInquiry, 'id' | 'status' | 'createdAt' | 'inquiryType'>;

const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'Tipo de Evento (Opcional)' },
  { value: 'birthday', label: 'Cumpleaños' },
  { value: 'anniversary', label: 'Aniversario / Cita Especial' },
  { value: 'bachelorette_party', label: 'Despedida de Soltera' },
  { value: 'family_gathering', label: 'Reunión Familiar' },
  { value: 'other', label: 'Otro' }
];

export const GroupInquiryForm: React.FC<GroupInquiryFormProps> = ({ onBack, inquiryType, footerInfo }) => {
  // Eliminado useLanguage, la app ahora es monolingüe en español
  
  const formConfig = {
    group: {
      minParticipants: 6,
      titleKey: 'inquiryForm.groupExperienceTitle',
      subtitleKey: 'inquiryForm.groupExperienceSubtitle',
    },
    couple: {
      minParticipants: 2,
      titleKey: 'inquiryForm.couplesExperienceTitle',
      subtitleKey: 'inquiryForm.couplesExperienceSubtitle',
    },
    team_building: {
      minParticipants: 6,
      titleKey: 'inquiryForm.teamBuildingExperienceTitle',
      subtitleKey: 'inquiryForm.teamBuildingExperienceSubtitle',
    }
  };

  const currentConfig = formConfig[inquiryType];

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    countryCode: '+593',
    participants: currentConfig.minParticipants,
    tentativeDate: null,
    tentativeTime: null,
    eventType: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const generateWhatsappLink = () => {
    if (!footerInfo?.whatsapp) return '';

  const inquiryTypeText = inquiryType === 'group' ? 'Grupo' : inquiryType === 'couple' ? 'Pareja' : 'Team Building';
    
    const messageDetails = {
      inquiryType: inquiryTypeText,
      participants: formData.participants,
      name: formData.name,
  eventType: formData.eventType ? formData.eventType : 'No especificado',
  date: formData.tentativeDate || 'No especificado',
  time: formData.tentativeTime || 'No especificado'
    };

  const message = `Hola, quiero hacer una consulta de tipo ${messageDetails.inquiryType} para ${messageDetails.participants} personas. Nombre: ${messageDetails.name}. Evento: ${messageDetails.eventType}. Fecha: ${messageDetails.date}. Hora: ${messageDetails.time}.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappNumber = footerInfo.whatsapp.replace(/\D/g, '');
    return `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validación de mínimo de participantes para grupos y team building
    if ((inquiryType === 'group' || inquiryType === 'team_building') && Number(formData.participants) < 6) {
      alert('El número mínimo de participantes para experiencias grupales es 6.');
      return;
    }
    try {
      await dataService.addGroupInquiry({ ...formData, inquiryType });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to submit inquiry:", error);
      alert('Error al enviar la consulta.');
    }
  };

  if (isSubmitted) {
    const whatsappLink = generateWhatsappLink();
    return (
      <div className="text-center p-4 sm:p-6 md:p-8 bg-brand-surface rounded-xl shadow-subtle animate-fade-in-up max-w-lg mx-auto mx-4">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-text mb-4">¡Gracias!</h2>
        <p className="text-xs sm:text-sm md:text-lg text-brand-secondary mb-8">
          Hemos recibido tu consulta y nos pondremos en contacto contigo en las próximas 24 horas para ayudarte a planificar tu evento perfecto.
        </p>
        <div className="mb-6">
          <p className="text-xs sm:text-sm md:text-base text-brand-secondary">
            Para una atención más ágil y personalizada, haz click aquí y comunícate con nosotros directamente por WhatsApp.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onBack}
            className="w-full sm:w-auto bg-transparent border border-brand-secondary text-brand-secondary font-bold py-3 px-8 rounded-lg hover:bg-brand-secondary hover:text-white transition-colors duration-300"
          >
            Volver al Inicio
          </button>
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-600 transition-colors duration-300"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Chatear por WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-brand-surface rounded-xl shadow-subtle animate-fade-in-up max-w-2xl mx-auto">
      <button onClick={onBack} className="text-sm font-semibold text-brand-secondary hover:text-brand-text mb-4 transition-colors">
        &larr; Editar Selección
      </button>
      <div className="text-center mb-6">
        <h2 className="text-3xl font-semibold text-brand-text">
          {inquiryType === 'group' ? 'Consulta de Experiencia Grupal' : inquiryType === 'couple' ? 'Consulta de Experiencia en Pareja' : 'Consulta de Team Building'}
        </h2>
        <p className="text-brand-secondary mt-2">
          Cuéntanos sobre tu evento y te ayudaremos a crear una experiencia memorable.
        </p>
      </div>

      {inquiryType === 'couple' && (
        <div className="mb-6 p-4 bg-amber-100 border-l-4 border-amber-500 rounded-r-lg animate-fade-in">
          <div className="flex">
            <div className="flex-shrink-0">
              <InfoCircleIcon className="h-5 w-5 text-amber-500" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-md font-bold text-amber-900">
                {'Precio base: Desde $190'}
              </h3>
              <div className="mt-2 text-sm text-amber-800">
                <p>El precio final puede variar según los adicionales que desees incluir en tu experiencia. ¡Contáctanos para crear una cita perfecta y recibir una cotización personalizada!</p>
              </div>
            </div>
          </div>
        </div>
      )}
        
        {inquiryType === 'group' && (
          <div className="mb-6 p-4 bg-amber-100 border-l-4 border-amber-500 rounded-r-lg animate-fade-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <InfoCircleIcon className="h-5 w-5 text-amber-500" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-md font-bold text-amber-900">
                  Precio base: Desde $45 por persona
                </h3>
                <div className="mt-2 text-sm text-amber-800">
                  <p>El precio final puede variar según los adicionales o personalizaciones para tu grupo. ¡Contáctanos para una cotización a medida!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {inquiryType === 'team_building' && (
          <div className="mb-6 p-4 bg-blue-100 border-l-4 border-blue-500 rounded-r-lg animate-fade-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <InfoCircleIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-xl font-bold text-blue-900">
                  Una escapada creativa para tu equipo
                </h3>
                <div className="mt-2 text-base text-blue-800">
                  <p>
                    Nuestros talleres de team building están diseñados para fomentar la colaboración, la comunicación y la creatividad fuera de la oficina. Es una experiencia práctica donde los compañeros pueden relajarse, aprender una nueva habilidad y crear algo tangible juntos. Contáctanos para hablar sobre los objetivos de tu equipo y diseñaremos el evento perfecto.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" name="name" placeholder="Nombre" value={formData.name} onChange={handleChange} required className="w-full p-3 border border-brand-border rounded-lg"/>
          <input type="email" name="email" placeholder="Correo electrónico" value={formData.email} onChange={handleChange} required className="w-full p-3 border border-brand-border rounded-lg"/>
        </div>
  <input type="tel" name="phone" placeholder="Teléfono" value={formData.phone} onChange={handleChange} required className="w-full p-3 border border-brand-border rounded-lg"/>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input 
                  type="number" name="participants" 
                  placeholder="Número de participantes" 
                  value={formData.participants} 
                  onChange={handleChange} 
                  required 
                  min={currentConfig.minParticipants}
                  readOnly={inquiryType === 'couple'}
                  disabled={inquiryType === 'couple'}
                  className="w-full p-3 border border-brand-border rounded-lg"
              />
            {inquiryType !== 'couple' && <p className="text-xs text-brand-secondary mt-1 ml-1">Mínimo de participantes requerido.</p>}
          </div>
          {inquiryType !== 'team_building' && (
            <select name="eventType" value={formData.eventType} onChange={handleChange} className="w-full p-3 border border-brand-border rounded-lg bg-white">
              {EVENT_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="date" name="tentativeDate" value={formData.tentativeDate || ''} onChange={handleChange} required className="w-full p-3 border border-brand-border rounded-lg"/>
            <input type="time" name="tentativeTime" value={formData.tentativeTime || ''} onChange={handleChange} className="w-full p-3 border border-brand-border rounded-lg"/>
        </div>

  <textarea name="message" placeholder="Mensaje adicional" value={formData.message} onChange={handleChange} rows={4} className="w-full p-3 border border-brand-border rounded-lg"></textarea>
        
        <div className="flex justify-end pt-4">
          <button type="submit" className="bg-brand-primary text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity">
            {'Enviar consulta'}
          </button>
        </div>
      </form>
    </div>
  );
};