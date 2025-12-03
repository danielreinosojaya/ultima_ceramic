import React from 'react';

export interface ExperienceTypeSelectorProps {
  onSelectType: (type: 'individual' | 'group' | 'experience') => void;
  isLoading?: boolean;
}

export const ExperienceTypeSelector: React.FC<ExperienceTypeSelectorProps> = ({
  onSelectType,
  isLoading = false
}) => {
  const options = [
    {
      id: 'individual',
      title: 'Clase Individual',
      description: 'Aprende a tu ritmo con instrucción personalizada',
      icon: '👤',
      subtitle: 'Para ti'
    },
    {
      id: 'group',
      title: 'Clase Grupal',
      description: 'Diviértete con tus amigos o familia',
      icon: '👥',
      subtitle: '2-8 personas'
    },
    {
      id: 'experience',
      title: 'Experiencia Personalizada',
      description: 'Diseña tu propia creación con piezas especiales',
      icon: '🎨',
      subtitle: 'Tu diseño'
    }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Elige tu Experiencia</h2>
        <p className="text-gray-600">Selecciona el tipo de clase que mejor se adapte a ti</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => !isLoading && onSelectType(option.id as 'individual' | 'group' | 'experience')}
            disabled={isLoading}
            className="relative group p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            {/* Icon */}
            <div className="text-4xl mb-4">{option.icon}</div>

            {/* Content */}
            <h3 className="text-lg font-bold mb-1">{option.title}</h3>
            <p className="text-sm text-gray-500 mb-3">{option.subtitle}</p>
            <p className="text-sm text-gray-600">{option.description}</p>

            {/* Arrow indicator */}
            <div className="absolute bottom-4 right-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </div>
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center mt-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default ExperienceTypeSelector;
