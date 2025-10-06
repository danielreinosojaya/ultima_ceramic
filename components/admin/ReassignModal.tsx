
import React, { useState, useEffect } from 'react';
import type { Instructor } from '../../types';
import * as dataService from '../../services/dataService';
// import { useLanguage } from '../../context/LanguageContext';

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (replacementInstructorId: number) => void;
  instructorToDelete: Instructor;
}

export const ReassignModal: React.FC<ReassignModalProps> = ({ isOpen, onClose, onConfirm, instructorToDelete }) => {
  // const { t } = useLanguage();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [replacementId, setReplacementId] = useState<number | null>(null);

  useEffect(() => {
    const fetchInstructors = async () => {
      if (isOpen) {
        // FIX: Await the asynchronous call to get instructors
        const allInstructors = await dataService.getInstructors();
        const availableReplacements = allInstructors.filter(i => i.id !== instructorToDelete.id);
        setInstructors(availableReplacements);
        if (availableReplacements.length > 0) {
          setReplacementId(availableReplacements[0].id);
        }
      }
    };
    fetchInstructors();
  }, [isOpen, instructorToDelete]);

  const handleConfirm = () => {
    if (replacementId) {
      onConfirm(replacementId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-red-600 mb-2">Reasignar Instructor</h3>
        <p className="text-brand-secondary mb-4">El instructor {instructorToDelete.name} tiene clases asignadas. Selecciona un instructor de reemplazo:</p>

        {instructors.length > 0 ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="replacement-instructor" className="block text-sm font-bold text-brand-secondary mb-1">
                Reasignar a:
              </label>
              <select
                id="replacement-instructor"
                value={replacementId || ''}
                onChange={(e) => setReplacementId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary"
              >
                {instructors.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md text-sm font-semibold bg-gray-200 hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!replacementId}
                className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
              >
                Confirmar Reasignación
              </button>
            </div>
          </div>
        ) : (
          <p className="text-brand-secondary p-4 bg-yellow-100 rounded-md">
            Cannot delete instructor as there are no other instructors to reassign classes to.
          </p>
        )}
      </div>
    </div>
  );
};