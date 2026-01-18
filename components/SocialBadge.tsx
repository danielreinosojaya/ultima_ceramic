import React from 'react';

interface SocialBadgeProps {
    currentCount: number;
    maxCapacity: number;
    variant?: 'compact' | 'full';
}

export const SocialBadge: React.FC<SocialBadgeProps> = ({ 
    currentCount, 
    maxCapacity,
    variant = 'compact'
}) => {
    // Validaciones de seguridad
    if (maxCapacity === 0 || maxCapacity < 0) return null;
    if (currentCount < 0) return null;
    
    // Normalizar si currentCount excede maxCapacity (error de datos)
    const normalizedCount = Math.min(currentCount, maxCapacity);
    const percentage = (normalizedCount / maxCapacity) * 100;
    const remaining = maxCapacity - normalizedCount;

    // Determinar tipo de badge y estilos
    let badge: { emoji: string; text: string; bgColor: string; textColor: string; shouldPulse: boolean } | null = null;

    if (percentage === 100) {
        // Clase llena - más prominente
        badge = {
            emoji: '🔥',
            text: 'Lleno',
            bgColor: 'bg-red-500',
            textColor: 'text-white',
            shouldPulse: false
        };
    } else if (percentage >= 75) {
        // Últimos cupos - urgencia
        badge = {
            emoji: '✨',
            text: `${remaining} ${remaining === 1 ? 'cupo' : 'cupos'}`,
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-700',
            shouldPulse: true
        };
    } else if (percentage >= 50) {
        // Clase popular - social proof fuerte
        badge = {
            emoji: '🔥',
            text: 'Popular',
            bgColor: 'bg-orange-100',
            textColor: 'text-orange-700',
            shouldPulse: true
        };
    } else if (percentage >= 26) {
        // 26-49% - Social proof suave
        badge = {
            emoji: '👥',
            text: variant === 'full' ? `${normalizedCount} ${normalizedCount === 1 ? 'persona' : 'personas'}` : `${normalizedCount}`,
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-700',
            shouldPulse: false
        };
    } else if (normalizedCount > 0) {
        // 1-25% - Mostrar contador suave
        badge = {
            emoji: '👤',
            text: variant === 'full' ? `${normalizedCount} ${normalizedCount === 1 ? 'persona' : 'personas'}` : `${normalizedCount}`,
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-600',
            shouldPulse: false
        };
    } else {
        // 0% - Clase vacía, mostrar disponibilidad
        badge = {
            emoji: '✨',
            text: variant === 'full' ? 'Abierto' : '+',
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
            shouldPulse: false
        };
    }

    return (
        <div 
            className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                ${badge.bgColor} ${badge.textColor}
                ${badge.shouldPulse ? 'animate-pulse' : ''}
                transition-all duration-300
            `}
            title={percentage === 100 ? 'Clase completa' : `${normalizedCount} de ${maxCapacity} cupos ocupados`}
        >
            <span className="text-xs">{badge.emoji}</span>
            <span className="whitespace-nowrap">{badge.text}</span>
        </div>
    );
};
