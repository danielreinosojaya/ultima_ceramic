import React, { useState, useEffect, useRef } from 'react';
import type { OpenStudioSubscription } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { CubeIcon } from '../icons/CubeIcon';

interface OpenStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pkgData: Omit<OpenStudioSubscription, 'id' | 'isActive' | 'type'>, id?: number) => void;
  subscriptionToEdit: OpenStudioSubscription | null;
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
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors"
        />
    </div>
);


export const OpenStudioModal: React.FC<OpenStudioModalProps> = ({ isOpen, onClose, onSave, subscriptionToEdit }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Omit<OpenStudioSubscription, 'id' | 'isActive' | 'type'>>({
    name: '',
    price: 0,
    description: '',
    imageUrl: '',
    details: {
      durationDays: 30,
      timeLimit: '',
      materialsLimit: '',
      howItWorks: [],
    },
  });

  useEffect(() => {
    if (subscriptionToEdit) {
      setFormData({
        name: subscriptionToEdit.name,
        price: subscriptionToEdit.price,
        description: subscriptionToEdit.description,
        imageUrl: subscriptionToEdit.imageUrl || '',
        details: {
            durationDays: subscriptionToEdit.details.durationDays,
            timeLimit: subscriptionToEdit.details.timeLimit,
            materialsLimit: subscriptionToEdit.details.materialsLimit,
            howItWorks: subscriptionToEdit.details.howItWorks || [],
        },
      });
    } else {
      setFormData({
        name: '', price: 0, description: '', imageUrl: '',
        details: { durationDays: 30, timeLimit: '', materialsLimit: '', howItWorks: [] },
      });
    }
  }, [subscriptionToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isHowItWorks = name === 'howItWorks';
    setFormData(prev => ({
        ...prev,
        details: {
            ...prev.details,
            [name]: isHowItWorks ? value.split('\n').filter(line => line.trim() !== '') : value
        }
    }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
          alert("Image is too large. Please select an image smaller than 2MB.");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subData: Omit<OpenStudioSubscription, 'id' | 'isActive' | 'type'> = {
        ...formData,
        price: Number(formData.price) || 0,
        details: {
            ...formData.details,
            durationDays: Number(formData.details.durationDays) || 30
        }
    };
    onSave(subData, subscriptionToEdit?.id);
  };
  
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-serif text-brand-accent mb-4 text-center">
          {subscriptionToEdit ? t('admin.openStudioModal.editTitle') : t('admin.openStudioModal.createTitle')}
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileChange(e)}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label={t('admin.packageModal.nameLabel')} id="name" name="name" value={formData.name} onChange={handleChange} placeholder={t('admin.openStudioModal.namePlaceholder')} required />
            <InputField label={t('admin.packageModal.priceLabel')} id="price" name="price" type="number" value={formData.price} onChange={handleChange} placeholder={t('admin.packageModal.pricePlaceholder')} required />
            <div className="md:col-span-2">
                <TextareaField label={t('admin.packageModal.descriptionLabel')} id="description" name="description" value={formData.description} onChange={handleChange} placeholder={t('admin.packageModal.descriptionPlaceholder')} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-brand-secondary mb-1">{t('admin.packageModal.imageLabel')}</label>
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
                  className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {t('admin.packageModal.uploadImageButton')}
                </button>
              </div>
            </div>

            <InputField label={t('admin.openStudioModal.durationLabel')} id="durationDays" name="durationDays" type="number" value={formData.details.durationDays} onChange={handleDetailChange} required />
            <InputField label={t('admin.openStudioModal.timeLimitLabel')} id="timeLimit" name="timeLimit" value={formData.details.timeLimit} onChange={handleDetailChange} placeholder={t('admin.openStudioModal.timeLimitPlaceholder')} />
            <InputField label={t('admin.openStudioModal.materialsLimitLabel')} id="materialsLimit" name="materialsLimit" value={formData.details.materialsLimit} onChange={handleDetailChange} placeholder={t('admin.openStudioModal.materialsLimitPlaceholder')} />
            <div className="md:col-span-2">
              <TextareaField label={t('admin.openStudioModal.howItWorksLabel')} id="howItWorks" name="howItWorks" value={formData.details.howItWorks.join('\n')} onChange={handleDetailChange} placeholder={t('admin.openStudioModal.howItWorksPlaceholder')} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
             <button type="button" onClick={onClose} className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100 transition-colors">
                 {t('admin.productManager.cancelButton')}
             </button>
             <button type="submit" className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent transition-colors">
                {t('admin.packageModal.saveButton')}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};