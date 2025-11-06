import React, { useState } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface PhotoViewerModalProps {
    isOpen: boolean;
    photos: string[];
    initialIndex?: number;
    onClose: () => void;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
    isOpen,
    photos,
    initialIndex = 0,
    onClose
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    if (!isOpen || photos.length === 0) return null;

    const currentPhoto = photos[currentIndex];

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    };

    const handleDownload = () => {
        try {
            if (!currentPhoto) return;

            // Crear elemento temporal para descargar
            const link = document.createElement('a');
            link.href = currentPhoto;
            link.download = `pieza-${currentIndex + 1}-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('[PhotoViewerModal] Error downloading photo:', error);
            alert('❌ Error al descargar la foto. Intenta nuevamente.');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') handlePrevious();
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'Escape') onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <div className="flex flex-col items-center max-w-4xl max-h-screen w-full mx-4">
                {/* Header */}
                <div className="w-full flex justify-between items-center mb-4">
                    <div className="text-white text-sm font-semibold">
                        Foto {currentIndex + 1} de {photos.length}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-300 transition-colors p-2"
                        aria-label="Cerrar"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Imagen */}
                <div className="flex-1 flex items-center justify-center w-full mb-4">
                    {currentPhoto.startsWith('data:') || currentPhoto.startsWith('http://') || currentPhoto.startsWith('https://') ? (
                        <img
                            src={currentPhoto}
                            alt={`Foto ${currentIndex + 1}`}
                            className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg"
                            onError={(e) => {
                                console.error('[PhotoViewerModal] Error loading image');
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" font-size="18" text-anchor="middle" dy=".3em" fill="%236b7280"%3ENo se pudo cargar la imagen%3C/text%3E%3C/svg%3E';
                            }}
                        />
                    ) : (
                        <div className="text-white text-center">
                            <p>⚠️ URL de foto inválida</p>
                            <p className="text-sm text-gray-400 mt-2">La foto no se puede mostrar</p>
                        </div>
                    )}
                </div>

                {/* Controles */}
                <div className="w-full flex justify-between items-center">
                    <button
                        onClick={handlePrevious}
                        disabled={photos.length <= 1}
                        className="text-white hover:text-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors p-2"
                        aria-label="Foto anterior"
                    >
                        <ChevronLeftIcon className="w-8 h-8" />
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg transition-colors text-sm font-semibold"
                            title="Descargar foto"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            Descargar
                        </button>
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={photos.length <= 1}
                        className="text-white hover:text-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors p-2"
                        aria-label="Foto siguiente"
                    >
                        <ChevronRightIcon className="w-8 h-8" />
                    </button>
                </div>

                {/* Indicador de fotos */}
                {photos.length > 1 && (
                    <div className="mt-4 flex gap-2 justify-center flex-wrap">
                        {photos.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-3 h-3 rounded-full transition-colors ${
                                    index === currentIndex ? 'bg-white' : 'bg-gray-500 hover:bg-gray-400'
                                }`}
                                aria-label={`Ver foto ${index + 1}`}
                            />
                        ))}
                    </div>
                )}

                {/* Instrucciones */}
                <div className="text-gray-400 text-xs mt-4 text-center">
                    ⌨️ Usa ← → para navegar • ESC para cerrar
                </div>
            </div>
        </div>
    );
};
