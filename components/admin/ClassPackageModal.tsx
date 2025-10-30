import React, { useState, useEffect, useRef } from 'react';
import type { ClassPackage, Technique } from '../../types';
// Eliminado useLanguage, la app ahora es monolingüe en español
import { CubeIcon } from '../icons/CubeIcon';

interface ClassPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pkgData: Omit<ClassPackage, 'id' | 'isActive' | 'type'>, id?: string) => void;
  packageToEdit: ClassPackage | null;
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


export const ClassPackageModal: React.FC<ClassPackageModalProps> = ({ isOpen, onClose, onSave, packageToEdit }) => {
  // Monolingüe español, textos hardcodeados
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    classes: 0,
    price: 0,
    description: '',
    imageUrl: '',
    duration: '',
    durationHours: 0,
    activities: '',
    generalRecommendations: '',
    materials: '',
    technique: 'potters_wheel' as Technique,
  });

  useEffect(() => {
    if (packageToEdit) {
      setFormData({
        name: packageToEdit.name,
        classes: packageToEdit.classes,
        price: packageToEdit.price,
        description: packageToEdit.description,
        imageUrl: packageToEdit.imageUrl || '',
        duration: packageToEdit.details.duration,
        durationHours: packageToEdit.details.durationHours || 0,
        activities: packageToEdit.details.activities.join('\n'),
        generalRecommendations: packageToEdit.details.generalRecommendations,
        materials: packageToEdit.details.materials,
        technique: packageToEdit.details.technique || 'potters_wheel',
      });
    } else {
      setFormData({
        name: '', classes: 0, price: 0, description: '',
        imageUrl: '',
        duration: '', durationHours: 0, activities: '', generalRecommendations: '', materials: '',
        technique: 'potters_wheel',
      });
    }
  }, [packageToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    const pkgData = {
      name: formData.name,
      classes: Number(formData.classes) || 0,
      price: Number(formData.price) || 0,
      description: formData.description,
      imageUrl: formData.imageUrl,
      details: {
        duration: formData.duration,
        durationHours: Number(formData.durationHours) || 0,
        activities: formData.activities.split('\n').filter(line => line.trim() !== ''),
        generalRecommendations: formData.generalRecommendations,
        materials: formData.materials,
        technique: formData.technique,
      },
    };
    onSave(pkgData, packageToEdit?.id);
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
          {packageToEdit ? 'Editar paquete de clases' : 'Crear paquete de clases'}
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Nombre del paquete" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Ej: Paquete de 4 clases" required />
            <InputField label="Cantidad de clases" id="classes" name="classes" type="number" value={formData.classes} onChange={handleChange} placeholder="Ej: 4" required />
            <InputField label="Precio" id="price" name="price" type="number" value={formData.price} onChange={handleChange} placeholder="Ej: 180" required />
            
            <div>
              <label htmlFor="technique" className="block text-sm font-bold text-brand-secondary mb-1">Técnica</label>
              <select id="technique" name="technique" value={formData.technique} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  <option value="potters_wheel">Torno de alfarero</option>
                  <option value="molding">Modelado manual</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
                <TextareaField label="Descripción" id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Describe el paquete y lo que incluye" />
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
                  className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Subir imagen
                </button>
              </div>
            </div>
            <InputField label="Duración" id="duration" name="duration" value={formData.duration} onChange={handleChange} placeholder="Ej: 2 horas por clase" />
            <InputField label="Duración total (horas)" id="durationHours" name="durationHours" type="number" step="0.5" value={formData.durationHours} onChange={handleChange} placeholder="Ej: 8" required />
            <div className="md:col-span-2">
                <TextareaField label="Actividades" id="activities" name="activities" value={formData.activities} onChange={handleChange} placeholder="Lista de actividades, una por línea" />
            </div>
            <TextareaField label="Recomendaciones generales" id="generalRecommendations" name="generalRecommendations" value={formData.generalRecommendations} onChange={handleChange} placeholder="Ej: Traer ropa cómoda" />
            <TextareaField label="Materiales incluidos" id="materials" name="materials" value={formData.materials} onChange={handleChange} placeholder="Ej: Arcilla, esmaltes, herramientas" />
          </div>
       <div className="mt-6 flex justify-end gap-3">
         <button type="button" onClick={onClose} className="bg-white border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:bg-gray-100 transition-colors">
            Cancelar
         </button>
         <button type="submit" className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent transition-colors">
           Guardar
         </button>
       </div>
        </form>
      </div>
    </div>
  );
};