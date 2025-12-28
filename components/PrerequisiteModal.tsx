import React from 'react';
// ...existing code...

interface PrerequisiteModalProps {
    onClose: () => void;
    onConfirm: () => void;
    onGoToIntro: () => void;
}

export const PrerequisiteModal: React.FC<PrerequisiteModalProps> = ({ onClose, onConfirm, onGoToIntro }) => {
    // Wording exacto según la imagen adjunta
    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-brand-surface rounded-xl shadow-2xl p-8 w-full max-w-lg animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-brand-primary mb-4">¡Un Momento!</h2>
                    <p className="text-brand-secondary mb-8 whitespace-pre-wrap">
                        Nuestros paquetes de clases están diseñados para alumnos que ya han completado nuestra Clase Introductoria. Este primer paso es esencial para garantizar que todos tengan una base sólida en seguridad, técnicas de amasado y el uso correcto del torno. Es la mejor manera de asegurar que aproveches al máximo tu tiempo en el taller.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row-reverse gap-4 justify-center">
                    <button
                        onClick={onGoToIntro}
                        className="bg-brand-surface border border-brand-secondary text-brand-secondary font-bold py-3 px-6 rounded-lg hover:border-brand-text transition-colors h-12 flex items-center justify-center"
                    >
                        Ir a la Clase Introductoria
                    </button>
                    <button
                        onClick={onConfirm}
                        className="bg-brand-primary text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity h-12 flex items-center justify-center"
                    >
                        Ya tomé la clase, continuar
                    </button>
                </div>
            </div>
        </div>
    );
};
