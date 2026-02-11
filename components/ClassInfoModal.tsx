import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product, OpenStudioSubscription } from '../types.js';
import { ClockIcon } from './icons/ClockIcon.js';
import { SparklesIcon } from './icons/SparklesIcon.js';
import { InfoCircleIcon } from './icons/InfoCircleIcon.js';
import { PaintBrushIcon } from './icons/PaintBrushIcon.js';
import { KeyIcon } from './icons/KeyIcon.js';
import { CheckCircleIcon } from './icons/CheckCircleIcon.js';
import { Card } from './ui/Card.js';
import { Button } from './ui/Button.js';

interface ClassInfoModalProps {
  product: Product;
  onConfirm: () => void;
  onClose: () => void;
}

const InfoDetail: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
    <motion.div
      className="flex items-start text-left"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
        <div className="flex-shrink-0 mr-4 mt-1 text-brand-primary">{icon}</div>
        <div className="flex-grow">
            <h4 className="font-bold text-brand-text">{label}</h4>
            <div className="text-brand-secondary">{children}</div>
        </div>
    </motion.div>
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
          {/* Header con título y precio integrados */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-start justify-between gap-6 mb-4">
              <div className="flex-grow">
                <h3 className="text-2xl font-bold text-brand-text mb-2">¿Qué es Open Studio?</h3>
                <p className="text-brand-secondary text-base leading-relaxed">
                  Ven a nuestro Open Studio de cerámica y trabaja en tus proyectos a tu propio ritmo. Este es un espacio colaborativo donde puedes usar nuestros tornos, herramientas y hornos. <span className="text-brand-text font-medium">Ideal para quienes ya tienen experiencia y buscan un lugar para crear libremente.</span>
                </p>
              </div>
              <motion.div
                className="flex-shrink-0"
                whileHover={{ scale: 1.05 }}
              >
                <Card variant="premium">
                  <div className="text-right">
                    <p className="text-xs font-medium text-brand-secondary uppercase tracking-wider mb-0.5">Mensual</p>
                    <p className="text-3xl font-bold text-brand-primary">${product.price}</p>
                    <p className="text-xs text-brand-secondary mt-0.5">30 días</p>
                  </div>
                </Card>
              </motion.div>
            </div>
          </motion.div>

          <InfoDetail icon={<ClockIcon className="w-6 h-6" />} label="Duración">
            <p>30 días de acceso</p>
          </InfoDetail>
          <InfoDetail icon={<KeyIcon className="w-6 h-6" />} label="El Acceso Incluye">
            <ul className="list-disc list-inside space-y-1">
                <li>Sin límites de horarios (según disponibilidad)</li>
                <li>12 libras de pasta cerámica incluidas</li>
                <li>Esmaltes de alta temperatura suficientes para tus 12 libras</li>
            </ul>
          </InfoDetail>
          <InfoDetail icon={<InfoCircleIcon className="w-6 h-6" />} label="Cómo Funciona">
            <ul className="list-disc list-inside space-y-1">
                <li><strong>Uso de equipos:</strong> Acceso a torno alfarero, mesas de trabajo para modelado a mano, extrusora y áreas de secado.</li>
                <li><strong>Herramientas:</strong> Alambres de corte, esponjas, estecas, agujas, espátulas, raspadores, tornetas, variedad de sellos y cortadores.</li>
                <li><strong>Pasta cerámica adicional:</strong> Disponible para compra en el estudio. Por políticas de calidad, no se permite traer pasta de otros proveedores.</li>
                <li><strong>Esmaltes:</strong> Incluimos esmaltes para tus 12 libras. ¿Tienes esmaltes propios? Puedes traerlos, solo necesitamos hacer una prueba previa para confirmar que sean compatibles con nuestras quemas de alta temperatura.</li>
                <li><strong>Servicio de horno:</strong> Cocción de bizcocho y esmalte de alta temperatura incluidos.</li>
                <li><strong>Comunidad:</strong> Un ambiente colaborativo donde compartir ideas, técnicas y experiencias con otros ceramistas.</li>
            </ul>
          </InfoDetail>
          <div className="mt-6 border-t border-brand-border pt-6 text-left">
            <motion.div
              className="flex items-center gap-3 mb-4"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <CheckCircleIcon className="w-7 h-7 text-brand-success flex-shrink-0" />
              <h3 className="text-xl font-semibold text-brand-text">Cómo Activar Tu Suscripción</h3>
            </motion.div>
            <motion.ol
              className="list-decimal list-inside space-y-2 ml-4 text-brand-secondary mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, staggerChildren: 0.05 }}
            >
                  <li>Completa tu compra y la información de usuario.</li>
                  <li>Confirmaremos tu pago dentro de las próximas 24 horas hábiles.</li>
                  <li>Una vez confirmado, tu acceso comienza y podrás empezar a reservar tu espacio en el taller vía WhatsApp.</li>
              </motion.ol>
              <motion.div
                className="bg-gradient-to-r from-amber-50 to-amber-100/50 p-4 rounded-lg border border-amber-300 shadow-subtle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className="text-sm font-semibold text-amber-900 text-center">
                    Tus 30 días de acceso comienzan desde el momento en que se confirma tu pago.
                </p>
              </motion.div>
          </div>
          {/* Botón WhatsApp solo para Open Studio */}
          <motion.div
            className="mt-8 flex justify-end"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <motion.a
              href="https://wa.me/593985813327?text=Hola%2C%20quiero%20más%20información%20sobre%20Open%20Studio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-premium hover:shadow-premium-hover transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.85.504 3.63 1.46 5.19L2 22l4.93-1.43A9.953 9.953 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.64 0-3.22-.5-4.57-1.44l-.33-.22-2.93.85.84-2.86-.22-.34A7.963 7.963 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8zm4.13-5.47c-.22-.11-1.3-.64-1.5-.71-.2-.07-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.16-.48.05-.22-.11-.93-.34-1.77-1.07-.66-.59-1.1-1.31-1.23-1.53-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.07-.11-.5-1.21-.68-1.66-.18-.44-.36-.38-.5-.39-.13-.01-.28-.01-.43-.01-.15 0-.39.06-.6.28-.21.22-.8.78-.8 1.9s.82 2.21.93 2.37c.11.15 1.62 2.47 3.93 3.36.55.19.98.3 1.31.38.55.14 1.05.12 1.45.07.44-.07 1.3-.53 1.48-1.04.18-.51.18-.95.13-1.04-.05-.09-.2-.14-.42-.25z"/></svg>
              Quiero más información
            </motion.a>
          </motion.div>
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
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Header */}
          <motion.div
            className="bg-gradient-to-r from-brand-primary to-brand-accent text-white p-8 text-center sticky top-0 z-10 shadow-premium"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-3xl font-semibold text-white">{product.name}</h2>
            <p className="text-white/80 mt-2">Información y detalles del curso</p>
          </motion.div>

          {/* Content */}
          <motion.div
            className="p-8 space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, staggerChildren: 0.05 }}
          >
           {renderProductDetails()}
          </motion.div>

          {/* Footer - Buttons */}
          <motion.div
            className="bg-gradient-to-r from-white/80 to-gray-50/80 border-t border-brand-border/20 p-6 flex flex-col sm:flex-row gap-4 justify-end shadow-subtle sticky bottom-0 z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                  Volver
              </Button>
              <Button variant="premium" onClick={onConfirm} className="w-full sm:w-auto">
                  Confirmar
              </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
