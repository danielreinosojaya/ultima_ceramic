import React from 'react';

interface CourseWheelLandingProps {
    onContinue: () => void;
    onBack: () => void;
}

export const CourseWheelLanding: React.FC<CourseWheelLandingProps> = ({ onContinue, onBack }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-brand-background py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <button 
                    onClick={onBack}
                    className="mb-6 text-brand-secondary hover:text-brand-text transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver
                </button>

                {/* Badge Nuevo */}
                <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                        🆕 NUEVO
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        🎓 CURSO COMPLETO
                    </span>
                </div>

                {/* Hero Section */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-8 text-white">
                        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
                            Curso Completo de Torno
                        </h1>
                        <p className="text-xl text-indigo-100 mb-6">
                            De cero a crear tus primeras piezas en 6 horas
                        </p>
                        
                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                            <div className="text-center">
                                <div className="text-3xl font-bold">6h</div>
                                <div className="text-sm text-indigo-200">Total</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold">3-6</div>
                                <div className="text-sm text-indigo-200">Sesiones</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold">6</div>
                                <div className="text-sm text-indigo-200">Max. Alumnos</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold">$150</div>
                                <div className="text-sm text-indigo-200">Precio Total</div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        {/* Qué Incluye */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-brand-text mb-4 flex items-center gap-2">
                                <span className="text-indigo-600">✓</span> Qué Incluye
                            </h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                {[
                                    'Todos los materiales y arcilla',
                                    'Instrucción personalizada paso a paso',
                                    'Grupos reducidos (máx 6 personas)',
                                    'Quema de tus piezas incluida',
                                    'Certificado al completar',
                                    'Acceso a grupo privado de estudiantes'
                                ].map((item, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-brand-secondary">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Plan de Estudios */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-brand-text mb-4 flex items-center gap-2">
                                <span className="text-indigo-600">📚</span> Plan de Estudios
                            </h2>
                            <div className="space-y-4">
                                {[
                                    { session: 'Sesiones 1-2', title: 'Fundamentos del Torno', topics: ['Postura y centrado', 'Control de la arcilla', 'Cilindros básicos'] },
                                    { session: 'Sesiones 3-4', title: 'Formas y Técnicas', topics: ['Cuencos y platos', 'Manejo del grosor', 'Acabados profesionales'] },
                                    { session: 'Sesiones 5-6', title: 'Proyecto Final', topics: ['Pieza personalizada', 'Refinamiento', 'Decoración y glaseado'] }
                                ].map((module, index) => (
                                    <div key={index} className="bg-gradient-to-r from-indigo-50 to-white rounded-xl p-6 border border-indigo-100">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm text-indigo-600 font-semibold mb-1">{module.session}</div>
                                                <h3 className="text-lg font-bold text-brand-text mb-2">{module.title}</h3>
                                                <ul className="space-y-1">
                                                    {module.topics.map((topic, i) => (
                                                        <li key={i} className="text-sm text-brand-secondary flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                                                            {topic}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Opciones de Horario */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-brand-text mb-4 flex items-center gap-2">
                                <span className="text-indigo-600">⏱️</span> Opciones de Horario
                            </h2>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-white border-2 border-brand-border rounded-xl p-6 hover:border-indigo-300 transition-all">
                                    <div className="text-lg font-bold text-brand-text mb-2">Noches</div>
                                    <div className="text-sm text-brand-secondary mb-4">3 días × 2 horas</div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                            </svg>
                                            <span>Mar - Mié - Jue</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                            <span>19:00 - 21:00</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white border-2 border-brand-border rounded-xl p-6 hover:border-indigo-300 transition-all">
                                    <div className="text-lg font-bold text-brand-text mb-2">Mañanas</div>
                                    <div className="text-sm text-brand-secondary mb-4">2 días × 3 horas</div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                            </svg>
                                            <span>Miércoles - Jueves</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                            <span>10:00 - 13:00</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Precio */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-8 text-white text-center">
                            <div className="text-sm text-indigo-200 mb-2">Inversión Total</div>
                            <div className="text-5xl font-bold mb-2">$150</div>
                            <div className="text-lg text-indigo-100 mb-6">
                                <span className="line-through opacity-75">$180</span>
                                <span className="ml-2 font-semibold">Solo $25/hora</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-sm text-indigo-100">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Pago en efectivo o transferencia
                            </div>
                        </div>

                        {/* CTA */}
                        <button
                            onClick={onContinue}
                            className="mt-8 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl text-lg"
                        >
                            Ver Horarios Disponibles →
                        </button>

                        {/* FAQ */}
                        <div className="mt-8 pt-8 border-t border-brand-border">
                            <h3 className="text-lg font-bold text-brand-text mb-4">Preguntas Frecuentes</h3>
                            <div className="space-y-4 text-sm">
                                <details className="group">
                                    <summary className="cursor-pointer font-semibold text-brand-text mb-2 flex items-center justify-between">
                                        ¿Necesito experiencia previa?
                                        <svg className="w-5 h-5 group-open:rotate-180 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </summary>
                                    <p className="text-brand-secondary pl-4">No, este curso está diseñado para principiantes absolutos. Empezamos desde cero con fundamentos básicos.</p>
                                </details>
                                <details className="group">
                                    <summary className="cursor-pointer font-semibold text-brand-text mb-2 flex items-center justify-between">
                                        ¿Qué pasa si falto a una sesión?
                                        <svg className="w-5 h-5 group-open:rotate-180 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </summary>
                                    <p className="text-brand-secondary pl-4">Puedes coordinar una sesión de reposición con el instructor. Es importante completar todas las sesiones para aprovechar el curso.</p>
                                </details>
                                <details className="group">
                                    <summary className="cursor-pointer font-semibold text-brand-text mb-2 flex items-center justify-between">
                                        ¿Me llevo mis piezas?
                                        <svg className="w-5 h-5 group-open:rotate-180 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </summary>
                                    <p className="text-brand-secondary pl-4">Sí, todas las piezas que crees son tuyas. La quema está incluida y te avisamos cuando estén listas para recoger.</p>
                                </details>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
