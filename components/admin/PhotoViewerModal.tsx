import React, { useState, useEffect } from 'react';
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
    const [touchStartX, setTouchStartX] = useState(0);

    // Sync initialIndex when it changes
    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

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

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        
        // Swipe left → next photo
        if (diff > 50) {
            handleNext();
        }
        // Swipe right → previous photo
        else if (diff < -50) {
            handlePrevious();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-2 sm:p-4"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            onClick={onClose}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Main Container */}
            <div 
                className="flex flex-col items-center max-w-4xl max-h-[95vh] w-full relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button - Large and Visible */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 sm:top-4 sm:right-4 z-60 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 sm:p-3 shadow-lg transition-all transform hover:scale-110 flex items-center justify-center"
                    aria-label="Cerrar (ESC)"
                    title="Cerrar foto (ESC)"
                >
                    <XMarkIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>

                {/* Header Info */}
                <div className="w-full text-center text-white text-sm sm:text-base font-semibold mb-3 sm:mb-4">
                    📷 Foto {currentIndex + 1} de {photos.length}
                </div>

                {/* Imagen */}
                <div className="flex-1 flex items-center justify-center w-full mb-3 sm:mb-4 px-2 sm:px-0">
                    {currentPhoto.startsWith('data:') || currentPhoto.startsWith('http://') || currentPhoto.startsWith('https://') ? (
                        <img
                            src={currentPhoto}
                            alt={`Foto ${currentIndex + 1}`}
                            className="max-w-full max-h-[calc(95vh-280px)] sm:max-h-[calc(90vh-200px)] object-contain rounded-lg shadow-2xl"
                            onError={(e) => {
                                console.error('[PhotoViewerModal] Error loading image');
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" font-size="18" text-anchor="middle" dy=".3em" fill="%236b7280"%3ENo se pudo cargar la imagen%3C/text%3E%3C/svg%3E';
                            }}
                        />
                    ) : (
                        <div className="text-white text-center p-4">
                            <p className="text-lg sm:text-xl">⚠️ URL de foto inválida</p>
                            <p className="text-xs sm:text-sm text-gray-400 mt-2">La foto no se puede mostrar</p>
                        </div>
                    )}
                </div>

                {/* Controls - Touch Friendly */}
                <div className="w-full flex justify-between items-center gap-2 sm:gap-4 px-2 sm:px-0 mb-3 sm:mb-4">
                    {/* Previous Button */}
                    <button
                        onClick={handlePrevious}
                        disabled={photos.length <= 1}
                        className="flex-shrink-0 text-white hover:text-gray-200 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors p-3 sm:p-4 hover:bg-white/10 rounded-lg"
                        aria-label="Foto anterior (←)"
                        title="Foto anterior (← o swipe derecha)"
                    >
                        <ChevronLeftIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                    </button>

                    {/* Download Button */}
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg transition-all transform hover:scale-105 text-xs sm:text-sm font-semibold shadow-lg"
                        title="Descargar foto"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">Descargar</span>
                        <span className="sm:hidden">Descargar</span>
                    </button>

                    {/* Next Button */}
                    <button
                        onClick={handleNext}
                        disabled={photos.length <= 1}
                        className="flex-shrink-0 text-white hover:text-gray-200 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors p-3 sm:p-4 hover:bg-white/10 rounded-lg"
                        aria-label="Foto siguiente (→)"
                        title="Foto siguiente (→ o swipe izquierda)"
                    >
                        <ChevronRightIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                    </button>
                </div>

                {/* Thumbnail Indicators */}
                {photos.length > 1 && (
                    <div className="w-full flex gap-1.5 sm:gap-2 justify-center flex-wrap px-2">
                        {photos.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                                    index === currentIndex 
                                        ? 'bg-white scale-125' 
                                        : 'bg-gray-500 hover:bg-gray-400 hover:scale-110'
                                }`}
                                aria-label={`Ver foto ${index + 1}`}
                                title={`Foto ${index + 1}`}
                            />
                        ))}
                    </div>
                )}

                {/* Instructions */}
                <div className="text-gray-300 text-xs sm:text-sm mt-3 sm:mt-4 text-center">
                    <p>⌨️ ← → para navegar • 🔄 Swipe en táctil • ESC o ✕ para cerrar</p>
                </div>
            </div>
        </div>
    );
};
