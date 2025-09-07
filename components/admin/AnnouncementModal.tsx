import React, { useState, useEffect } from 'react';
import type { Announcement, UrgencyLevel } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Announcement, 'id' | 'createdAt'>, id?: string) => void;
  announcementToEdit: Announcement | null;
}

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.id} className="block text-sm font-bold text-brand-secondary mb-1">{label}</label>
        <input 
            {...props}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors"
        />
    </div>
);

const TextareaField: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.id} className="block text-sm font-bold text-brand-secondary mb-1">{label}</label>
        <textarea 
            {...props}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors"
        />
    </div>
);

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ isOpen, onClose, onSave, announcementToEdit }) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('info');

  useEffect(() => {
    if (announcementToEdit) {
      setTitle(announcementToEdit.title);
      setContent(announcementToEdit.content);
      setUrgency(announcementToEdit.urgency);
    } else {
      setTitle('');
      setContent('');
      setUrgency('info');
    }
  }, [announcementToEdit, isOpen]);
  
  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!title || !content) return; // Basic validation
      onSave({ title, content, urgency }, announcementToEdit?.id);
  };
  
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-lg animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-serif text-brand-accent mb-4 text-center">
          {announcementToEdit ? t('admin.announcementModal.editTitle') : t('admin.announcementModal.createTitle')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
            <InputField 
                label={t('admin.announcementModal.titleLabel')}
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('admin.announcementModal.titlePlaceholder')}
                required
            />
            <TextareaField
                label={t('admin.announcementModal.contentLabel')}
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('admin.announcementModal.contentPlaceholder')}
                required
            />
            <div>
                <label className="block text-sm font-bold text-brand-secondary mb-2">{t('admin.announcementModal.urgencyLabel')}</label>
                <div className="flex items-center space-x-4">
                    {(['info', 'warning', 'urgent'] as UrgencyLevel[]).map(level => (
                        <label key={level} className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="urgency"
                                value={level}
                                checked={urgency === level}
                                onChange={() => setUrgency(level)}
                                className="h-4 w-4 text-brand-primary focus:ring-brand-accent"
                            />
                            <span className="ml-2 text-brand-text">{t(`admin.announcementModal.urgency${level.charAt(0).toUpperCase() + level.slice(1)}`)}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
             <button type="button" onClick={onClose} className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100 transition-colors">
                 {t('admin.productManager.cancelButton')}
             </button>
             <button type="submit" className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent transition-colors">
                {t('admin.announcementModal.saveButton')}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};