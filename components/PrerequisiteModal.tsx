import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface PrerequisiteModalProps {
    onClose: () => void;
    onConfirm: () => void;
    onGoToIntro: () => void;
}

export const PrerequisiteModal: React.FC<PrerequisiteModalProps> = ({ onClose, onConfirm, onGoToIntro }) => {
    const { t } = useLanguage();

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
                    <h2 className="text-2xl font-semibold text-brand-primary mb-4">{t('prerequisiteModal.title')}</h2>
                    <p className="text-brand-secondary mb-8 whitespace-pre-wrap">{t('prerequisiteModal.message')}</p>
                </div>
                <div className="flex flex-col sm:flex-row-reverse gap-4 justify-center">
                    <button
                        onClick={onConfirm}
                        className="bg-brand-primary text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        {t('prerequisiteModal.confirmButton')}
                    </button>
                    <button
                        onClick={onGoToIntro}
                        className="bg-brand-surface border border-brand-secondary text-brand-secondary font-bold py-3 px-6 rounded-lg hover:border-brand-text transition-colors"
                    >
                        {t('prerequisiteModal.goToIntroButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};
