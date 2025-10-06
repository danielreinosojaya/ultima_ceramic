
import React, { useState, useEffect, useRef } from 'react';
import type { IntroductoryClass, Instructor, SchedulingRule, SessionOverride, ClassCapacity } from '../../types';
import * as dataService from '../../services/dataService';
import { CubeIcon } from '../icons/CubeIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { DAY_NAMES } from '../../constants';
import { IntroClassCalendar } from './IntroClassCalendar';

interface IntroClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pkgData: Omit<IntroductoryClass, 'id' | 'isActive' | 'type'>, id?: number) => void;
  classToEdit: IntroductoryClass | null;
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

export const IntroClassModal: React.FC<IntroClassModalProps> = ({ isOpen, onClose, onSave, classToEdit }) => {
  // Monolingüe español, textos hardcodeados. No usar useLanguage ni contextos de idioma.
  const fileInputRef = useRef<HTMLInputElement>(null);
  // FIX: Added 'technique' to the initial state to satisfy the IntroductoryClassDetails type.
  const [formData, setFormData] = useState<Omit<IntroductoryClass, 'id' | 'isActive' | 'type'>>({
    name: '', price: 0, description: '', imageUrl: '', schedulingRules: [], overrides: [],
    details: { duration: '', durationHours: 0, activities: [], generalRecommendations: '', materials: '', technique: 'potters_wheel' },
  });
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [newRule, setNewRule] = useState({ dayOfWeek: 1, time: '', instructorId: 0, capacity: 8 });

  useEffect(() => {
    const initialize = async () => {
      const [currentInstructors, classCapacity] = await Promise.all([
         dataService.getInstructors(),
         dataService.getClassCapacity()
      ]);
      setInstructors(currentInstructors);
      if (currentInstructors.length > 0) {
          setNewRule(s => ({...s, instructorId: currentInstructors[0].id, capacity: classCapacity.introductory_class || 6 }));
      }

      if (classToEdit) {
        // FIX: Ensured 'technique' is correctly populated when editing an existing class.
        setFormData({
          name: classToEdit.name,
          price: classToEdit.price,
          description: classToEdit.description,
          imageUrl: classToEdit.imageUrl || '',
          schedulingRules: classToEdit.schedulingRules || [],
          overrides: classToEdit.overrides || [],
          details: {
            duration: classToEdit.details.duration,
            durationHours: classToEdit.details.durationHours || 0,
            activities: classToEdit.details.activities || [],
            generalRecommendations: classToEdit.details.generalRecommendations,
            materials: classToEdit.details.materials,
            technique: classToEdit.details.technique || 'potters_wheel',
          },
        });
      } else {
        // FIX: Included 'technique' when resetting the form for a new class.
        setFormData({
          name: '', price: 0, description: '', imageUrl: '', schedulingRules: [], overrides: [],
          details: { duration: '', durationHours: 0, activities: [], generalRecommendations: '', materials: '', technique: 'potters_wheel' },
        });
      }
    };
    if (isOpen) {
      initialize();
    }
  }, [classToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isActivity = name === 'activities';
    setFormData(prev => ({
        ...prev,
        details: {
            ...prev.details,
            [name]: isActivity ? value.split('\n').filter(line => line.trim() !== '') : value
        }
    }));
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
        alert("Please fill time and instructor for the new rule.");
        return;
    }
    const ruleToAdd: SchedulingRule = {
      ...newRule,
      id: `${newRule.dayOfWeek}-${newRule.time.replace(':', '')}-${newRule.instructorId}`,
    };
    
    if(formData.schedulingRules.some(r => r.id === ruleToAdd.id)) {
        alert("This exact rule already exists.");
        return;
    }

    setFormData(prev => ({ ...prev, schedulingRules: [...prev.schedulingRules, ruleToAdd].sort((a,b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time)) }));
  };

  const handleRemoveRule = (ruleId: string) => {
    setFormData(prev => ({ ...prev, schedulingRules: prev.schedulingRules.filter(r => r.id !== ruleId)}));
  };
  
  const handleOverridesChange = (newOverrides: SessionOverride[]) => {
      setFormData(prev => ({ ...prev, overrides: newOverrides }));
  };

  // FIX: Add missing handleSubmit function and JSX return for the modal component.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const classData: Omit<IntroductoryClass, 'id' | 'isActive' | 'type'> = {
        ...formData,
        price: Number(formData.price) || 0,
        details: {
            ...formData.details,
            durationHours: Number(formData.details.durationHours) || 0
        }
    };
    onSave(classData, classToEdit?.id);
  };

  if (!isOpen) return null;

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
          {classToEdit ? 'Editar clase introductoria' : 'Crear clase introductoria'}
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
      <InputField label="Nombre de la clase" id="name" name="name" value={formData.name} onChange={handleChange} required />
      <InputField label="Precio" id="price" name="price" type="number" value={formData.price} onChange={handleChange} required />
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
                    {'Subir imagen'}
                    </button>
                </div>
            </div>

            <div className="md:col-span-2 border-t pt-4 mt-2">
                <h3 className="font-bold text-brand-accent mb-2">Detalles de la clase</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Duración" name="duration" value={formData.details.duration} onChange={handleDetailChange} />
                    <InputField label="Duración (horas)" name="durationHours" type="number" step="0.5" value={formData.details.durationHours} onChange={handleDetailChange} />
                    <div>
                        <label htmlFor="technique" className="block text-sm font-bold text-brand-secondary mb-1">Técnica</label>
                        <select id="technique" name="technique" value={formData.details.technique} onChange={handleDetailChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                            <option value="potters_wheel">Torno</option>
                            <option value="molding">Moldeado</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <TextareaField label="Actividades" name="activities" value={formData.details.activities.join('\n')} onChange={handleDetailChange} />
                    </div>
                    <TextareaField label="Recomendaciones generales" name="generalRecommendations" value={formData.details.generalRecommendations} onChange={handleDetailChange} />
                    <TextareaField label="Materiales" name="materials" value={formData.details.materials} onChange={handleDetailChange} />
                </div>
            </div>

             <div className="md:col-span-2 border-t pt-4 mt-2">
                <h3 className="font-bold text-brand-accent mb-2">Reglas semanales</h3>
                <p className="text-sm text-brand-secondary mb-4">Define los horarios y profesores para la clase introductoria.</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 bg-gray-50 p-2 rounded-lg">
                    {formData.schedulingRules.length > 0 ? formData.schedulingRules.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between bg-white p-2 rounded-md text-sm border">
                            <div>
                                <span className="font-semibold">{DAY_NAMES[rule.dayOfWeek]} a las {rule.time}</span>
                                <span className="text-gray-600 ml-2">({instructors.find(i => i.id === rule.instructorId)?.name}, cap: {rule.capacity})</span>
                            </div>
                            <button type="button" onClick={() => handleRemoveRule(rule.id)} className="p-1 text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    )) : <p className="text-xs text-center text-gray-500 py-2">No hay reglas semanales definidas.</p>}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <select value={newRule.dayOfWeek} onChange={e => setNewRule({...newRule, dayOfWeek: Number(e.target.value)})} className="p-2 border rounded-md text-sm bg-white">
                        {DAY_NAMES.map((day, index) => <option key={day} value={index}>{day}</option>)}
                    </select>
                    <input type="time" value={newRule.time} onChange={e => setNewRule({...newRule, time: e.target.value})} className="p-2 border rounded-md text-sm"/>
                    <select value={newRule.instructorId} onChange={e => setNewRule({...newRule, instructorId: Number(e.target.value)})} className="p-2 border rounded-md text-sm bg-white">
                        {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    <input type="number" min="1" value={newRule.capacity} onChange={e => setNewRule({...newRule, capacity: Number(e.target.value)})} className="p-2 border rounded-md text-sm w-20" placeholder="Cap."/>
                    <button type="button" onClick={handleAddRule} className="p-2.5 bg-brand-primary text-white rounded-md"><PlusIcon className="w-4 h-4"/></button>
                </div>
            </div>

            <div className="md:col-span-2 border-t pt-4 mt-2">
                <IntroClassCalendar 
                    product={{ ...classToEdit, ...formData } as IntroductoryClass}
                    onOverridesChange={handleOverridesChange} 
                />
            </div>

          </div>
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
       <button type="button" onClick={onClose} className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100">
         Cancelar
       </button>
       <button type="submit" className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent">
        Guardar
       </button>
          </div>
        </form>
      </div>
    </div>
  );
};