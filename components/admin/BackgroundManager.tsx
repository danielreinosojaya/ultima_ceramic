import React, { useState, useEffect, useRef } from 'react';
import type { BackgroundSettings, BackgroundImageSetting } from '../../types';
import * as dataService from '../../services/dataService';
// import { useLanguage } from '../../context/LanguageContext';
import { ImageIcon } from '../icons/ImageIcon';
import { TrashIcon } from '../icons/TrashIcon';

const BackgroundControl: React.FC<{
    title: string;
    setting: BackgroundImageSetting | null;
    onUpdate: (newSetting: BackgroundImageSetting | null) => void;
}> = ({ title, setting, onUpdate }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (file.size > 2 * 1024 * 1024) { alert("Image is too large (max 2MB)"); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            onUpdate({
                url: reader.result as string,
                opacity: setting?.opacity ?? 0.1,
                blendMode: setting?.blendMode ?? 'multiply',
            });
        };
        reader.readAsDataURL(file);
    };

    const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (setting) {
            onUpdate({ ...setting, opacity: parseFloat(e.target.value) });
        }
    };

    const handleBlendModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (setting) {
            onUpdate({ ...setting, blendMode: e.target.checked ? 'multiply' : 'normal' });
        }
    };

    return (
        <div className="bg-white p-4 rounded-md border border-gray-200">
            <h4 className="font-semibold text-brand-text mb-3">{title}</h4>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
            
            <div className="w-full aspect-video bg-gray-100 rounded-md mb-3 flex items-center justify-center overflow-hidden">
                {setting?.url ? (
                    <img src={setting.url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-gray-400">
                        <ImageIcon className="w-12 h-12 mx-auto" />
                        <p className="text-xs mt-1">No image selected</p>
                    </div>
                )}
            </div>

            <div className="flex gap-2 mb-4">
                 <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-grow bg-white border border-brand-secondary text-brand-secondary text-sm font-bold py-2 px-4 rounded-lg hover:bg-gray-100">
                    Upload Image
                </button>
                {setting && (
                    <button type="button" onClick={() => onUpdate(null)} className="flex-shrink-0 p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                )}
            </div>

            {setting && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Opacity ({setting.opacity.toFixed(2)})</label>
                        <input type="range" min="0" max="1" step="0.01" value={setting.opacity} onChange={handleOpacityChange} className="w-full" />
                    </div>
                     <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-brand-text">
                            <input type="checkbox" checked={setting.blendMode === 'multiply'} onChange={handleBlendModeChange} className="h-4 w-4 rounded text-brand-primary focus:ring-brand-primary" />
                            Use 'Multiply' Blend Mode
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};

export const BackgroundManager: React.FC = () => {
    // const { t } = useLanguage();
    const [settings, setSettings] = useState<BackgroundSettings>({ topLeft: null, bottomRight: null });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            setSettings(await dataService.getBackgroundSettings());
        };
        fetchSettings();
    }, []);

    const handleUpdate = (position: 'topLeft' | 'bottomRight', newSetting: BackgroundImageSetting | null) => {
        setSettings(prev => ({ ...prev, [position]: newSetting }));
    };

    const handleSave = () => {
        dataService.updateBackgroundSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="bg-brand-background p-4 rounded-lg">
            <h3 className="block text-sm font-bold text-brand-secondary mb-1">
                Gestión de Fondos
            </h3>
            <p className="text-xs text-brand-secondary mb-4">
                Controla las imágenes de fondo decorativas del sitio.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <BackgroundControl 
                    title="Imagen Superior Izquierda"
                    setting={settings.topLeft}
                    onUpdate={(newSetting) => handleUpdate('topLeft', newSetting)}
                />
                 <BackgroundControl 
                    title="Imagen Inferior Derecha"
                    setting={settings.bottomRight}
                    onUpdate={(newSetting) => handleUpdate('bottomRight', newSetting)}
                />
            </div>
             <div className="mt-4 flex justify-end items-center gap-4">
                {saved && (
                    <p className="text-sm font-semibold text-brand-success animate-fade-in">
                        ¡Fondos guardados!
                    </p>
                )}
                <button
                    onClick={handleSave}
                    className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-accent"
                >
                    Guardar Fondos
                </button>
            </div>
        </div>
    );
};