import React from 'react';
import type { Product, OpenStudioSubscription } from '../types.js';
import { ClockIcon } from './icons/ClockIcon.js';
import { SparklesIcon } from './icons/SparklesIcon.js';
import { InfoCircleIcon } from './icons/InfoCircleIcon.js';
import { PaintBrushIcon } from './icons/PaintBrushIcon.js';
import { KeyIcon } from './icons/KeyIcon.js';
import { CheckCircleIcon } from './icons/CheckCircleIcon.js';


interface ClassInfoModalProps {
  product: Product;
  onConfirm: () => void;
  onClose: () => void;
}

const InfoDetail: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
    <div className="flex items-start text-left">
        <div className="flex-shrink-0 mr-4 mt-1 text-brand-primary">{icon}</div>
        <div>
            <h4 className="font-bold text-brand-text">{label}</h4>
            <div className="text-brand-secondary">{children}</div>
        </div>
    </div>
);


export const ClassInfoModal: React.FC<ClassInfoModalProps> = ({ product, onConfirm, onClose }) => {

  const renderProductDetails = () => {
    if (product.type === 'GROUP_EXPERIENCE' || product.type === 'COUPLES_EXPERIENCE') {
        return null; // These experiences don't have this modal view.
    }

    if (product.type === 'OPEN_STUDIO_SUBSCRIPTION') {
      // wording exacto de la imagen
      return (
        <>
          {/* Badge de precio prominente */}
          <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-brand-primary/30 rounded-xl p-5 text-center shadow-sm">
            <p className="text-sm font-semibold text-brand-secondary uppercase tracking-wide mb-1">Inversión Mensual</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-5xl font-bold text-brand-primary">${product.price}</span>
              <span className="text-xl text-brand-secondary font-medium">USD</span>
            </div>
            <p className="text-sm text-brand-secondary mt-2">Acceso completo por 30 días</p>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-bold text-brand-text mb-2">¿Qué es Open Studio?</h3>
            <p className="text-brand-secondary text-lg">
              Ven a nuestro Open Studio de cerámica y trabaja en tus proyectos a tu propio ritmo. Este es un espacio colaborativo donde puedes usar nuestros tornos, herramientas y hornos. Ideal para quienes ya tienen experiencia y buscan un lugar para crear libremente.
            </p>
          </div>
          <InfoDetail icon={<ClockIcon className="w-6 h-6" />} label="Duración">
            <p>30 días de acceso</p>
          </InfoDetail>
          <InfoDetail icon={<KeyIcon className="w-6 h-6" />} label="El Acceso Incluye">
            <ul className="list-disc list-inside space-y-1">
                <li>Sin limites de horarios (según disponibilidad))</li>
                <li>12.5 libras de pasta cerámica (Material adicional a la venta en nuestro estudio)</li>
            </ul>
          </InfoDetail>
          <InfoDetail icon={<InfoCircleIcon className="w-6 h-6" />} label="Cómo Funciona">
            <ul className="list-disc list-inside space-y-1">
                <li>Uso de equipos : acceso a torno alfarero , mesas de trabajo para modelado a mano , extrusora y áreas de secado para tus piezas.</li>
                <li>Herramientas: alambres de corte, esponjas, estecas, agujas, espátulas, raspadores, tornetas, variedad de sellos y cortadores.</li>
                <li>Esmaltes : Variedad de esmaltes de alta temperatura ( que cubran las 12.5 libras de pasta cerámica adquirida). Puedes traer tus propios esmaltes.</li>
                <li>Servicio de horno: Cocción de bizcocho y esmalte de alta temperatura.</li>
                <li>Comunidad: Un ambiente colaborativo donde puedes compartir ideas , técnicas y experiencias con otros ceramistas.</li>
            </ul>
          </InfoDetail>
          <div className="mt-6 border-t border-brand-border pt-6 text-left">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircleIcon className="w-7 h-7 text-brand-success flex-shrink-0" />
              <h3 className="text-xl font-semibold text-brand-text">Cómo Activar Tu Suscripción</h3>
            </div>
              <ol className="list-decimal list-inside space-y-2 ml-4 text-brand-secondary">
                  <li>Completa tu compra y la información de usuario.</li>
                  <li>Confirmaremos tu pago dentro de las próximas 24 horas hábiles.</li>
                  <li>Una vez confirmado, tu acceso comienza y podrás empezar a reservar tu espacio en el taller vía WhatsApp.</li>
              </ol>
              <div className="mt-4 bg-amber-100 p-3 rounded-md border border-amber-300">
                <p className="text-sm font-semibold text-amber-800 text-center">
                    Tus 30 días de acceso comienzan desde el momento en que se confirma tu pago.
                </p>
              </div>
          </div>
          {/* Botón WhatsApp solo para Open Studio */}
          <div className="mt-8 flex justify-end">
            <a
              href="https://wa.me/593985813327?text=Hola%2C%20quiero%20más%20información%20sobre%20Open%20Studio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-600 transition-colors duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.85.504 3.63 1.46 5.19L2 22l4.93-1.43A9.953 9.953 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.64 0-3.22-.5-4.57-1.44l-.33-.22-2.93.85.84-2.86-.22-.34A7.963 7.963 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8zm4.13-5.47c-.22-.11-1.3-.64-1.5-.71-.2-.07-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.16-.48.05-.22-.11-.93-.34-1.77-1.07-.66-.59-1.1-1.31-1.23-1.53-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.07-.11-.5-1.21-.68-1.66-.18-.44-.36-.38-.5-.39-.13-.01-.28-.01-.43-.01-.15 0-.39.06-.6.28-.21.22-.8.78-.8 1.9s.82 2.21.93 2.37c.11.15 1.62 2.47 3.93 3.36.55.19.98.3 1.31.38.55.14 1.05.12 1.45.07.44-.07 1.3-.53 1.48-1.04.18-.51.18-.95.13-1.04-.05-.09-.2-.14-.42-.25z"/></svg>
              Quiero más información
            </a>
          </div>
        </>
      )
    }
    
    // Default for ClassPackage and IntroductoryClass
    if ('details' in product) {
      return (
        <>
          <InfoDetail icon={<ClockIcon className="w-6 h-6" />} label="Duración">
              <p>{product.details.duration}</p>
          </InfoDetail>
           <InfoDetail icon={<SparklesIcon className="w-6 h-6" />} label="Actividades">
              <ul className="list-disc list-inside space-y-1">
                  {product.details.activities.map((activity, index) => <li key={index}>{activity}</li>)}
              </ul>
          </InfoDetail>
          <InfoDetail icon={<InfoCircleIcon className="w-6 h-6" />} label="Recomendaciones Generales">
              <p>{product.details.generalRecommendations}</p>
          </InfoDetail>
          <InfoDetail icon={<PaintBrushIcon className="w-6 h-6" />} label="Materiales">
              <p>{product.details.materials}</p>
          </InfoDetail>
        </>
      )
    }
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface rounded-xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h2 className="text-3xl font-semibold text-brand-text">{product.name}</h2>
          <p className="text-brand-secondary mt-2">Información y detalles del curso</p>
        </div>

        <div className="space-y-6">
           {renderProductDetails()}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
            <button
                onClick={onClose}
                className="w-full sm:w-auto bg-brand-surface border border-brand-secondary text-brand-secondary font-bold py-2 px-6 rounded-lg hover:border-brand-text transition-colors duration-300"
            >
                Volver
            </button>
            <button
                onClick={onConfirm}
                className="w-full sm:w-auto bg-brand-primary text-white font-bold py-2 px-8 rounded-lg hover:opacity-90 transition-opacity duration-300"
            >
                Confirmar
            </button>
        </div>
      </div>
    </div>
  );
};
