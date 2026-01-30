import React from 'react';
import { HeartIcon, SparklesIcon, ClockIcon } from '@heroicons/react/24/solid';
import { VALENTINE_WORKSHOPS } from '../../types';

interface ValentineLandingProps {
    onStart: () => void;
    onBack: () => void;
}

export const ValentineLanding: React.FC<ValentineLandingProps> = ({ onStart, onBack }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-rose-100 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header con corazón grande */}
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-rose-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                            <div className="relative bg-gradient-to-r from-rose-400 to-pink-500 p-6 rounded-full shadow-2xl">
                                <HeartIcon className="w-16 h-16 text-white" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
                        San Valentín 💕
                    </h1>
                    <p className="text-xl text-rose-600 font-medium">
                        Save the Date · 14 de Febrero, 2026
                    </p>
                </div>

                {/* Introducción */}
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8 border border-rose-100">
                    <p className="text-gray-700 text-lg leading-relaxed text-center">
                        Creemos fielmente que todos los días son para celebrar el <span className="text-rose-600 font-semibold">amor y la amistad</span>, 
                        pero este 14 de febrero, queremos hacerlo aún más especial y diferente. 
                        <span className="text-rose-500"> ¡Hemos creado 3 actividades increíbles para ti!</span>
                    </p>
                </div>

                {/* Talleres */}
                <div className="space-y-6 mb-8">
                    {VALENTINE_WORKSHOPS.map((workshop, index) => (
                        <div 
                            key={workshop.type}
                            className="bg-white rounded-2xl shadow-lg overflow-hidden border border-rose-100 hover:shadow-xl transition-shadow"
                        >
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                                        index === 1 ? 'bg-gradient-to-br from-pink-400 to-rose-500' :
                                        'bg-gradient-to-br from-purple-400 to-indigo-500'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <ClockIcon className="w-4 h-4 text-rose-500" />
                                            <span className="text-sm font-medium text-rose-600">{workshop.time}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                                            {workshop.name}
                                        </h3>
                                        <p className="text-gray-600 mb-4">
                                            {workshop.description}
                                        </p>
                                        <div className="flex flex-wrap gap-3">
                                            <span className="inline-flex items-center px-3 py-1.5 bg-rose-100 text-rose-700 rounded-full text-sm font-medium">
                                                👤 ${workshop.priceIndividual} individual
                                            </span>
                                            <span className="inline-flex items-center px-3 py-1.5 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                                                👥 ${workshop.pricePair} para dos
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Lo que incluye */}
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8 border border-rose-100">
                    <div className="flex items-center gap-3 mb-5">
                        <SparklesIcon className="w-6 h-6 text-rose-500" />
                        <h2 className="text-xl font-bold text-gray-800">
                            Todas las actividades incluyen
                        </h2>
                    </div>
                    <ul className="grid md:grid-cols-2 gap-3">
                        {[
                            'Clase guiada y acompañamiento de creación',
                            'Materiales y herramientas',
                            'Horneadas cerámicas de alta temperatura',
                            'Pieza lista para su uso',
                            'Apta para alimentos, microondas y lavavajillas',
                            'Entrega en aproximadamente 2 semanas'
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-gray-700">
                                <span className="text-rose-500 mt-1">✓</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Banner de sorpresas */}
                <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-6 text-center text-white shadow-xl mb-8">
                    <p className="text-2xl font-bold mb-2">
                        💕 ¡Tendremos sorpresas y sorteos de premios increíbles! 💕
                    </p>
                    <p className="text-rose-100">
                        No te pierdas esta experiencia única
                    </p>
                </div>

                {/* Botones */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={onBack}
                        className="flex-1 py-4 px-6 border-2 border-rose-300 text-rose-600 rounded-xl font-semibold hover:bg-rose-50 transition-colors"
                    >
                        ← Volver
                    </button>
                    <button
                        onClick={onStart}
                        className="flex-1 py-4 px-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold text-lg shadow-lg hover:from-rose-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
                    >
                        <HeartIcon className="w-6 h-6" />
                        ¡Inscribirme Ahora!
                    </button>
                </div>

                {/* Footer */}
                <div className="text-center mt-10 text-gray-500 text-sm">
                    <p>¿Preguntas? Contáctanos</p>
                    <p className="mt-1">📧 cmassuh@ceramicalma.com · 📱 +593 98 581 3327</p>
                </div>
            </div>
        </div>
    );
};
