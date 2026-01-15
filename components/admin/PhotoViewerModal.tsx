import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface PhotoViewerModalProps {
    isOpen: boolean;
    photos: string[];
    initialIndex?: number;
    onClose: () => void;
}

// Validar si URL es segura
const isValidImageUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    try {
        // Aceptar data URLs y URLs https
        if (url.startsWith('data:')) return true;
        const urlObj = new URL(url);
        return urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
    } catch {
        return false;
    }
};

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
    isOpen,
    photos,
    initialIndex = 0,
    onClose
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [touchStartX, setTouchStartX] = useState(0);
    const [imageError, setImageError] = useState(false);
    const [loadingImage, setLoadingImage] = useState(true);

    // ✅ CRITICAL FIX: useMemo para evitar violar reglas de hooks
    const validPhotos = useMemo(() => photos.filter(isValidImageUrl), [photos]);

    // Sync initialIndex cuando cambia
    useEffect(() => {
        if (isOpen && validPhotos.length > 0) {
            const newIndex = Math.min(initialIndex, validPhotos.length - 1);
            setCurrentIndex(Math.max(0, newIndex));
            setImageError(false);
            setLoadingImage(true);
        }
    }, [initialIndex, isOpen, validPhotos.length]);

    const handlePrevious = useCallback(() => {
        setCurrentIndex((prev) => (prev === 0 ? validPhotos.length - 1 : prev - 1));
        setImageError(false);
        setLoadingImage(true);
    }, [validPhotos.length]);

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev === validPhotos.length - 1 ? 0 : prev + 1));
        setImageError(false);
        setLoadingImage(true);
    }, [validPhotos.length]);

    const handleDownload = useCallback(() => {
        if (!currentPhoto) return;
        try {
            const link = document.createElement('a');
            link.href = currentPhoto;
            link.download = `pieza-${currentIndex + 1}-${Date.now()}.jpg`;
            // Para data URLs o CORS protected, usar blob
            if (currentPhoto.startsWith('data:')) {
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                // Intentar fetch para evitar CORS issues
                fetch(currentPhoto, { mode: 'no-cors' })
                    .then(res => res.blob())
                    .then(blob => {
                        const url = window.URL.createObjectURL(blob);
                        link.href = url;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                    })
                    .catch(() => {
                        // Fallback: intentar descarga directa
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    });
            }
        } catch (error) {
            console.error('[PhotoViewerModal] Error downloading photo:', error);
            alert('❌ Error al descargar la foto. Intenta nuevamente.');
        }
    }, [currentIndex, validPhotos]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') handlePrevious();
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'Escape') onClose();
    }, [handlePrevious, handleNext, onClose]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        if (diff > 50) handleNext();
        else if (diff < -50) handlePrevious();
    }, [touchStartX, handleNext, handlePrevious]);

    // ✅ MOVER early return DESPUÉS de todos los hooks
    if (!isOpen || validPhotos.length === 0) return null;

    const currentPhoto = validPhotos[currentIndex];

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
                {/* Close Button */}
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
                    📷 Foto {currentIndex + 1} de {validPhotos.length}
                </div>

                {/* Imagen */}
                <div className="flex-1 flex items-center justify-center w-full mb-3 sm:mb-4 px-2 sm:px-0">
                    {!imageError ? (
                        <>
                            {loadingImage && (
                                <div className="absolute text-white text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                                </div>
                            )}
                            <img
                                src={currentPhoto}
                                alt={`Foto ${currentIndex + 1}`}
                                className={`max-w-full max-h-[calc(95vh-280px)] sm:max-h-[calc(90vh-200px)] object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${
                                    loadingImage ? 'opacity-0' : 'opacity-100'
                                }`}
                                onLoad={() => setLoadingImage(false)}
                                onError={() => {
                                    console.error('[PhotoViewerModal] Error loading image:', currentPhoto);
                                    setImageError(true);
                                    setLoadingImage(false);
                                }}
                            />
                        </>
                    ) : (
                        <div className="text-white text-center p-4 bg-red-900/50 rounded-lg">
                            <p className="text-lg sm:text-xl">⚠️ No se pudo cargar la imagen</p>
                            <p className="text-xs sm:text-sm text-gray-300 mt-2">La URL puede ser inválida o bloqueada por CORS</p>
                            <p className="text-xs text-gray-400 mt-3 break-all">{currentPhoto.substring(0, 100)}...</p>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="w-full flex justify-between items-center gap-2 sm:gap-4 px-2 sm:px-0 mb-3 sm:mb-4">
                    <button
                        onClick={handlePrevious}
                        disabled={validPhotos.length <= 1}
                        className="flex-shrink-0 text-white hover:text-gray-200 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors p-3 sm:p-4 hover:bg-white/10 rounded-lg"
                        aria-label="Foto anterior (←)"
                        title="Foto anterior (← o swipe derecha)"
                    >
                        <ChevronLeftIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                    </button>

                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg transition-all transform hover:scale-105 text-xs sm:text-sm font-semibold shadow-lg"
                        title="Descargar foto"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">Descargar</span>
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
