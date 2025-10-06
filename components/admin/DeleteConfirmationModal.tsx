import React from 'react';
// Eliminado useLanguage, la app ahora es monolingüe en español

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  // Monolingüe español, textos hardcodeados. No usar useLanguage ni contextos de idioma.
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-brand-text mb-4">{title}</h3>
        <p className="text-brand-secondary mb-6">{message}</p>
        <div className="flex justify-end gap-4 pt-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
            Cancelar
          </button>
          <button onClick={() => {
            onConfirm();
            onClose();
          }} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};