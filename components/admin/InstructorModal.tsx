import React, { useState, useEffect } from 'react';
import type { Instructor } from '../../types';
// import { useLanguage } from '../../context/LanguageContext';
import { PALETTE_COLORS } from '@/constants';
import { CheckIcon } from '../icons/CheckIcon';

interface InstructorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Instructor, 'id'>, id?: number) => void;
  instructorToEdit: Instructor | null;
}

export const InstructorModal: React.FC<InstructorModalProps> = ({ isOpen, onClose, onSave, instructorToEdit }) => {
  // const { t } = useLanguage();
  const [name, setName] = useState('');
  const [colorScheme, setColorScheme] = useState(PALETTE_COLORS[0].name);
  
  useEffect(() => {
    if (instructorToEdit) {
      setName(instructorToEdit.name);
      setColorScheme(instructorToEdit.colorScheme);
    } else {
      setName('');
      setColorScheme(PALETTE_COLORS[0].name);
    }
  }, [instructorToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      onSave({ name, colorScheme }, instructorToEdit?.id);
  };
  
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-serif text-brand-accent mb-4 text-center">
          {instructorToEdit ? 'Editar Instructor' : 'Crear Instructor'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="name" className="block text-sm font-bold text-brand-secondary mb-1">Nombre</label>
                <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre del instructor"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary"
                />
            </div>
            <div>
                 <label className="block text-sm font-bold text-brand-secondary mb-2">Color del Instructor</label>
                 <div className="flex flex-wrap gap-3">
                    {PALETTE_COLORS.map(color => (
                        <button
                            type="button"
                            key={color.name}
                            onClick={() => setColorScheme(color.name)}
                            className={`w-10 h-10 rounded-full transition-transform duration-200 ${color.bg} ${colorScheme === color.name ? 'ring-2 ring-offset-2 ring-brand-accent scale-110' : 'hover:scale-110'}`}
                        >
                           {colorScheme === color.name && <CheckIcon className={`w-6 h-6 mx-auto ${color.text}`} />}
                        </button>
                    ))}
                 </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-200">
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
