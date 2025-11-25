import React from 'react';
import { InfoCircleIcon } from './icons/InfoCircleIcon';

interface CouplesTourModalProps {
  onContinue: () => void;
  onBack: () => void;
}

export const CouplesTourModal: React.FC<CouplesTourModalProps> = ({ onContinue, onBack }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-brand-surface rounded-2xl shadow-lifted max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-up">
        {/* Header */}
        <div className="bg-brand-primary text-white p-8 text-center">
          <h2 className="text-4xl font-bold mb-2">Experiencia en Pareja</h2>
          <p className="text-lg opacity-90">Un momento especial para crear juntos</p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Tagline */}
          <div className="text-center">
            <p className="text-xl text-brand-text mb-2 font-serif italic">
              "Un par de horas para hacer algo diferente, único y creativo con tu persona favorita"
            </p>
          </div>

          {/* Main Info Box */}
          <div className="bg-brand-background border border-brand-border rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div>
                <h3 className="font-bold text-lg text-brand-text mb-2">Una Cita Creativa Inolvidable</h3>
                <p className="text-brand-secondary">
                  Juntos crearán algo tangible y hermoso, mientras disfrutan de un ambiente relajado 
                  y profesional con instructor especializado.
                </p>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div>
            <h3 className="text-2xl font-bold text-brand-text mb-4">¿QUÉ INCLUYE?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <div>
                  <p className="font-semibold text-brand-text">Clase Guiada</p>
                  <p className="text-sm text-brand-secondary">2 horas de experiencia directa</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div>
                  <p className="font-semibold text-brand-text">Técnica a Elegir</p>
                  <p className="text-sm text-brand-secondary">Torno o Moldeo a Mano</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div>
                  <p className="font-semibold text-brand-text">Todos los Materiales</p>
                  <p className="text-sm text-brand-secondary">Herramientas, barro, esmaltes</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div>
                  <p className="font-semibold text-brand-text">Horneado Profesional</p>
                  <p className="text-sm text-brand-secondary">Cerámicas listas para usar</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div>
                  <p className="font-semibold text-brand-text">Botella de Vino</p>
                  <p className="text-sm text-brand-secondary">Para brindar después</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div>
                  <p className="font-semibold text-brand-text">Piqueos para Dos</p>
                  <p className="text-sm text-brand-secondary">Aperitivos incluidos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Product Features */}
          <div className="bg-brand-background/70 rounded-lg p-6 space-y-3">
            <h4 className="font-bold text-brand-text text-lg">Características Especiales:</h4>
            <ul className="space-y-2">
              <li className="flex gap-2 items-center">
                <span className="text-green-500">✓</span>
                <span className="text-brand-text">Piezas aptas para alimentos</span>
              </li>
              <li className="flex gap-2 items-center">
                <span className="text-green-500">✓</span>
                <span className="text-brand-text">Seguras para microondas y lavavajillas</span>
              </li>
              <li className="flex gap-2 items-center">
                <span className="text-green-500">✓</span>
                <span className="text-brand-text">Instructor especializado incluido</span>
              </li>
              <li className="flex gap-2 items-center">
                <span className="text-green-500">✓</span>
                <span className="text-brand-text">Ambiente relajado y creativo</span>
              </li>
            </ul>
          </div>

          {/* Important Info Box */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <div className="flex gap-3">
              <InfoCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-bold text-amber-900 mb-1">Reserva Anticipada</p>
                <p className="text-sm text-amber-800">
                  Pago completo anticipado ($190). Se coordina día y hora según disponibilidad del estudio.
                </p>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="text-center bg-brand-accent/10 rounded-xl p-6">
            <p className="text-sm text-brand-secondary mb-2">PRECIO TOTAL</p>
            <p className="text-5xl font-bold text-brand-primary">$190</p>
            <p className="text-sm text-brand-secondary mt-2">Para ambos (pareja)</p>
          </div>

          {/* Duration */}
          <div className="flex justify-around text-center">
            <div>
              <p className="font-semibold text-brand-text">Duración</p>
              <p className="text-sm text-brand-secondary">2 horas aprox</p>
            </div>
            <div>
              <p className="font-semibold text-brand-text">Capacidad</p>
              <p className="text-sm text-brand-secondary">Para 2 personas</p>
            </div>
            <div>
              <p className="font-semibold text-brand-text">Ubicación</p>
              <p className="text-sm text-brand-secondary">CeramicAlma</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-brand-background/50 border-t border-brand-border p-6 flex gap-4 justify-end">
          <button
            onClick={onBack}
            className="px-6 py-3 border border-brand-secondary text-brand-secondary rounded-lg hover:bg-brand-secondary hover:text-white transition-colors font-semibold"
          >
            Volver
          </button>
          <button
            onClick={onContinue}
            className="px-6 py-3 bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity font-semibold"
          >
            Continuar a Técnica
          </button>
        </div>
      </div>
    </div>
  );
};
