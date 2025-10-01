import React from 'react';
// ...existing code...

interface PolicyModalProps {
    onClose: () => void;
    policiesText: string;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ onClose, policiesText }) => {
    // Traducción eliminada, usar texto en español directamente

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-brand-surface rounded-xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-serif text-brand-accent mb-4 text-center">
                    Políticas de Devoluciones
                </h2>
                <div className="flex-grow overflow-y-auto pr-4 -mr-4 text-brand-secondary whitespace-pre-wrap">
                   {policiesText}
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-brand-primary text-white font-bold py-2 px-8 rounded-lg hover:bg-brand-accent transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};