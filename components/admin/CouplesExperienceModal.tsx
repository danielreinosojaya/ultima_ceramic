import React, { useState, useEffect, useRef } from 'react';
import type { CouplesExperience, Instructor, SchedulingRule, SessionOverride } from '../../types';
import * as dataService from '../../services/dataService';
import { CubeIcon } from '../icons/CubeIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { DAY_NAMES } from '../../constants';

interface CouplesExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (experienceData: Omit<CouplesExperience, 'id' | 'isActive' | 'type'>, id?: string) => void;
  experienceToEdit: CouplesExperience | null;
}

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.id} className="block text-sm font-bold text-brand-secondary mb-1">{label}</label>
        <input {...props} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary" />
    </div>
);

const TextareaField: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.id} className="block text-sm font-bold text-brand-secondary mb-1">{label}</label>
        <textarea {...props} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary"/>
    </div>
);

export const CouplesExperienceModal: React.FC<CouplesExperienceModalProps> = ({ isOpen, onClose, onSave, experienceToEdit }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Omit<CouplesExperience, 'id' | 'isActive' | 'type'>>({
    name: 'Experiencia en Pareja', 
    price: 190, 
    description: '', 
    imageUrl: '', 
    schedulingRules: [], 
    overrides: [],
    details: {
      duration: '2 horas',
      durationHours: 2,
      activities: [],
      generalRecommendations: 'Llega 15 minutos antes',
      materials: 'Incluidos',
      technique: 'potters_wheel'
    }
  });
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [newRule, setNewRule] = useState({ dayOfWeek: 1, time: '', instructorId: 0, capacity: 4, technique: 'potters_wheel' as 'potters_wheel' | 'molding' });

  useEffect(() => {
    const initialize = async () => {
      const currentInstructors = await dataService.getInstructors();
      setInstructors(currentInstructors);
      if (currentInstructors.length > 0) {
          setNewRule(s => ({...s, instructorId: currentInstructors[0].id}));
      }

      if (experienceToEdit) {
        setFormData({
          name: experienceToEdit.name,
          price: experienceToEdit.price,
          description: experienceToEdit.description,
          imageUrl: experienceToEdit.imageUrl || '',
          schedulingRules: experienceToEdit.schedulingRules || [],
          overrides: experienceToEdit.overrides || [],
          details: experienceToEdit.details || {
            duration: '2 horas',
            durationHours: 2,
            activities: [],
            generalRecommendations: 'Llega 15 minutos antes',
            materials: 'Incluidos',
            technique: 'potters_wheel'
          }
        });
      } else {
        setFormData({
          name: 'Experiencia en Pareja', 
          price: 190, 
          description: '', 
          imageUrl: '', 
          schedulingRules: [], 
          overrides: [],
          details: {
            duration: '2 horas',
            durationHours: 2,
            activities: [],
            generalRecommendations: 'Llega 15 minutos antes',
            materials: 'Incluidos',
            technique: 'potters_wheel'
          }
        });
      }
    };
    if (isOpen) {
      initialize();
    }
  }, [experienceToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) { alert("Image too large (max 2MB)"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };
  
  const handleAddRule = () => {
    if (!newRule.time || !newRule.instructorId) {
        alert("Please fill time, technique, and instructor for the new rule.");
        return;
    }
    const ruleToAdd: SchedulingRule = {
      ...newRule,
      id: `${newRule.dayOfWeek}-${newRule.time.replace(':', '')}-${newRule.instructorId}-${newRule.technique}`,
    };
    
    if(formData.schedulingRules.some(r => r.id === ruleToAdd.id)) {
        alert("This exact rule already exists.");
        return;
    }

    setFormData(prev => ({ 
      ...prev, 
      schedulingRules: [...prev.schedulingRules, ruleToAdd].sort((a,b) => 
        a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time) || (a.technique || '').localeCompare(b.technique || '')
      ) 
    }));
    
    // Reset form
    setNewRule({ dayOfWeek: 1, time: '', instructorId: newRule.instructorId, capacity: 4, technique: 'potters_wheel' });
  };

  const handleRemoveRule = (ruleId: string) => {
    setFormData(prev => ({ ...prev, schedulingRules: prev.schedulingRules.filter(r => r.id !== ruleId)}));
  };
  
  const handleOverridesChange = (newOverrides: SessionOverride[]) => {
      setFormData(prev => ({ ...prev, overrides: newOverrides }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const experienceData: Omit<CouplesExperience, 'id' | 'isActive' | 'type'> = {
        ...formData,
        price: 190, // Fixed price for couples
    };
    onSave(experienceData, experienceToEdit?.id);
  };

  if (!isOpen) return null;

  const getTechniqueName = (technique?: string) => {
    return technique === 'potters_wheel' ? '🎯 Torno' : '✋ Moldeo';
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-serif text-brand-accent mb-4 text-center">
          {experienceToEdit ? 'Editar Experiencia en Pareja' : 'Crear Experiencia en Pareja'}
        </h2>
        <form onSubmit={handleSubmit}>
           <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <InputField label="Nombre" id="name" name="name" value={formData.name} onChange={handleChange} required />
            <div>
              <label className="block text-sm font-bold text-brand-secondary mb-1">Precio (Fijo: $190)</label>
              <input type="text" disabled value="$190" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500" />
            </div>
            <div className="md:col-span-2">
              <TextareaField label="Descripción" id="description" name="description" value={formData.description} onChange={handleChange} />
            </div>

            <div className="md:col-span-2">
                <label className="block text-sm font-bold text-brand-secondary mb-1">Imagen</label>
                <div className="mt-1 flex items-center gap-4 p-2 border-2 border-dashed border-gray-300 rounded-lg">
                    {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Preview" className="w-24 h-24 object-cover rounded-md" />
                    ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                        <CubeIcon className="w-10 h-10" />
                    </div>
                    )}
                    <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-100"
                    >
                    Subir imagen
                    </button>
                </div>
            </div>

            <div className="md:col-span-2 border-t pt-4 mt-2">
                <h3 className="font-bold text-brand-accent mb-4">Reglas de Disponibilidad</h3>
                <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        <select 
                            value={newRule.dayOfWeek} 
                            onChange={(e) => setNewRule({...newRule, dayOfWeek: parseInt(e.target.value)})}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            {DAY_NAMES.map((day, idx) => (
                                <option key={idx} value={idx}>{day}</option>
                            ))}
                        </select>
                        <input 
                            type="time" 
                            value={newRule.time} 
                            onChange={(e) => setNewRule({...newRule, time: e.target.value})}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <select 
                            value={newRule.technique} 
                            onChange={(e) => setNewRule({...newRule, technique: e.target.value as 'potters_wheel' | 'molding'})}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="potters_wheel">🎯 Torno</option>
                            <option value="molding">✋ Moldeo</option>
                        </select>
                        <select 
                            value={newRule.instructorId} 
                            onChange={(e) => setNewRule({...newRule, instructorId: parseInt(e.target.value)})}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            {instructors.map(inst => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                        </select>
                        <button 
                            type="button" 
                            onClick={handleAddRule}
                            className="p-2.5 bg-brand-primary text-white rounded-md hover:bg-opacity-80"
                        >
                            <PlusIcon className="w-4 h-4"/>
                        </button>
                    </div>
                </div>

                {formData.schedulingRules.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="font-semibold text-brand-text mb-2">Reglas Configuradas:</h4>
                        <ul className="space-y-2">
                            {formData.schedulingRules.map((rule, idx) => (
                                <li key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                                    <span className="text-sm text-brand-text">
                                        {DAY_NAMES[rule.dayOfWeek]} • {rule.time} • {getTechniqueName(rule.technique)} • 
                                        {instructors.find(i => i.id === rule.instructorId)?.name} • Capacidad: {rule.capacity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveRule(rule.id)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="md:col-span-2 border-t pt-4 mt-2">
                <h3 className="font-bold text-brand-accent mb-4">Excepciones (Overrides)</h3>
                <p className="text-sm text-brand-secondary">Las excepciones pueden configurarse desde el Gestor de Horarios una vez creada la experiencia.</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6 justify-center">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg text-brand-secondary hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2 bg-brand-primary text-white rounded-lg hover:bg-opacity-80">
              {experienceToEdit ? 'Guardar Cambios' : 'Crear Experiencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
