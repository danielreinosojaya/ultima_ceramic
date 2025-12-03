import React from 'react';
import { CalendarIcon, GiftIcon, UsersIcon, HeartIcon, SparklesIcon, BookOpenIcon } from '@heroicons/react/24/outline';

interface ModuleInfo {
    icon: React.ReactNode;
    title: string;
    description: string;
    action: string;
    color: string;
    isComingSoon?: boolean;
}

interface EnhancedWelcomeSelectorProps {
    onSelect: (userType: 'new' | 'returning' | 'group_experience' | 'couples_experience' | 'team_building' | 'open_studio') => void;
}

/**
 * EnhancedWelcomeSelector
 * 
 * Replaces WelcomeSelector with clear module descriptions and visual guides
 * Helps users understand what each module/button does
 */
export const EnhancedWelcomeSelector: React.FC<EnhancedWelcomeSelectorProps> = ({ onSelect }) => {
    const modules: ModuleInfo[] = [
        {
            icon: <BookOpenIcon className="w-8 h-8" />,
            title: 'Primero aquí',
            description: 'Aprende técnicas básicas de cerámica en una clase introductoria personalizada',
            action: 'Comenzar Curso Introductorio',
            color: 'from-blue-500 to-blue-600',
            isComingSoon: true
        },
        {
            icon: <CalendarIcon className="w-8 h-8" />,
            title: 'Mis Reservas',
            description: 'Si ya tomaste clases, accede a tus reservas, reagenda o compra más clases',
            action: 'Gestionar Mis Clases',
            color: 'from-purple-500 to-purple-600'
        },
        {
            icon: <SparklesIcon className="w-8 h-8" />,
            title: 'Clase Abierta',
            description: 'Acceso libre a nuestro taller durante horarios disponibles',
            action: 'Studio Abierto',
            color: 'from-amber-500 to-amber-600',
            isComingSoon: true
        },
        {
            icon: <GiftIcon className="w-8 h-8" />,
            title: 'Regala Cerámica',
            description: 'Compra gift cards personalizadas para compartir la experiencia con amigos',
            action: 'Comprar Gift Card',
            color: 'from-pink-500 to-pink-600'
        },
        {
            icon: <UsersIcon className="w-8 h-8" />,
            title: 'Grupo Corporativo',
            description: 'Experiencias de equipo y team building para empresas y grupos',
            action: 'Solicitar Cotización',
            color: 'from-green-500 to-green-600'
        },
        {
            icon: <HeartIcon className="w-8 h-8" />,
            title: 'Parejas',
            description: 'Experiencia romántica diseñada para dos personas',
            action: 'Reservar Experiencia',
            color: 'from-red-500 to-red-600',
            isComingSoon: true
        }
    ];

    const handleClick = (index: number) => {
        switch(index) {
            case 0: onSelect('new'); break;
            case 1: onSelect('returning'); break;
            case 2: onSelect('open_studio'); break;
            case 3: onSelect('group_experience'); break; // Será giftcard
            case 4: onSelect('group_experience'); break;
            case 5: onSelect('couples_experience'); break;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl font-bold text-brand-text mb-4">
                    Bienvenido a CeramicAlma
                </h1>
                <p className="text-lg text-brand-secondary max-w-2xl mx-auto">
                    Selecciona qué tipo de experiencia cerámica buscas. Cada opción te llevará a un flujo personalizado.
                </p>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {modules.map((module, index) => (
                    <button
                        key={index}
                        onClick={() => !module.isComingSoon && handleClick(index)}
                        disabled={module.isComingSoon}
                        className={`group h-full ${module.isComingSoon ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                        <div className={`h-full bg-white rounded-xl shadow-lg ${!module.isComingSoon ? 'hover:shadow-2xl transition-all duration-300 transform hover:scale-105' : ''} overflow-hidden flex flex-col ${module.isComingSoon ? 'border border-gray-300' : ''}`}>
                            {/* Color Header */}
                            <div className={`bg-gradient-to-r ${module.color} p-6 flex items-center justify-center text-white ${!module.isComingSoon ? 'group-hover:opacity-90' : 'opacity-70'} transition-opacity relative`}>
                                {module.icon}
                                {module.isComingSoon && (
                                    <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-semibold px-2 py-1 rounded">
                                        Próximamente
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className={`p-6 flex flex-col flex-grow ${module.isComingSoon ? 'bg-gray-50' : ''}`}>
                                <h3 className="text-xl font-bold text-brand-text mb-2">
                                    {module.title}
                                </h3>
                                <p className={`text-sm mb-6 flex-grow ${module.isComingSoon ? 'text-gray-500' : 'text-brand-secondary'}`}>
                                    {module.description}
                                </p>

                                {/* Action Button */}
                                <button
                                    onClick={() => !module.isComingSoon && handleClick(index)}
                                    disabled={module.isComingSoon}
                                    className={`w-full py-3 px-4 bg-gradient-to-r ${module.color} text-white font-semibold rounded-lg ${!module.isComingSoon ? 'hover:opacity-90 transition-opacity cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                                >
                                    {module.action}
                                </button>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 pt-8 border-t border-gray-200">
                {/* Left: Session Info */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="font-bold text-brand-text mb-3 flex items-center gap-2">
                        <span className="text-xl">ℹ️</span> ¿Eres Cliente?
                    </h3>
                    <p className="text-sm text-brand-secondary mb-4">
                        Si ya has tomado clases en CeramicAlma, puedes:
                    </p>
                    <ul className="text-sm text-brand-secondary space-y-2">
                        <li>✓ Ver tus clases reservadas</li>
                        <li>✓ Reagendar con 72h de anticipación</li>
                        <li>✓ Comprar más clases o paquetes</li>
                    </ul>
                    <p className="text-xs text-brand-secondary mt-4">
                        Usa el botón "Mi Cuenta" en la esquina superior derecha si tienes una sesión activa
                    </p>
                </div>

                {/* Right: First Time Info */}
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h3 className="font-bold text-brand-text mb-3 flex items-center gap-2">
                        <span className="text-xl">🎨</span> ¿Primera Vez?
                    </h3>
                    <p className="text-sm text-brand-secondary mb-4">
                        Te recomendamos comenzar con:
                    </p>
                    <ul className="text-sm text-brand-secondary space-y-2">
                        <li>✓ Clase introductoria (aprenderás lo básico)</li>
                        <li>✓ Técnica a elegir: rueda de cerámica o modelado</li>
                        <li>✓ Duración: 2-3 horas</li>
                    </ul>
                    <p className="text-xs text-brand-secondary mt-4">
                        Después puedes comprar paquetes de 4, 8 o 12 clases
                    </p>
                </div>
            </div>
        </div>
    );
};
