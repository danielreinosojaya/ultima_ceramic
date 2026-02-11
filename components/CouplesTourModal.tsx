import React from 'react';
import { motion } from 'framer-motion';
import { InfoCircleIcon } from './icons/InfoCircleIcon';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface CouplesTourModalProps {
  onContinue: () => void;
  onBack: () => void;
}

export const CouplesTourModal: React.FC<CouplesTourModalProps> = ({ onContinue, onBack }) => {
  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      <motion.div
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header - Enhanced with Gradient */}
        <motion.div
          className="bg-gradient-to-r from-brand-primary to-brand-accent text-white p-8 text-center shadow-premium"
          variants={itemVariants}
        >
          <motion.h2
            className="text-4xl font-bold mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Experiencia en Pareja
          </motion.h2>
          <motion.p
            className="text-lg opacity-90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Un momento especial para crear juntos
          </motion.p>
        </motion.div>

        {/* Content */}
        <motion.div
          className="p-8 space-y-6"
          variants={contentVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Tagline */}
          <motion.div className="text-center" variants={itemVariants}>
            <p className="text-xl text-brand-text mb-2 font-serif italic">
              "Un par de horas para hacer algo diferente, único y creativo con tu persona favorita"
            </p>
          </motion.div>

          {/* Main Info Box - Using Card Glass Variant */}
          <motion.div variants={itemVariants}>
            <Card variant="glass" interactive>
              <div className="flex items-start gap-4">
                <div>
                  <h3 className="font-bold text-lg text-brand-text mb-2">Una Cita Creativa Inolvidable</h3>
                  <p className="text-brand-secondary">
                    Juntos crearán algo tangible y hermoso, mientras disfrutan de un ambiente relajado 
                    y profesional con instructor especializado.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* What's Included */}
          <motion.div variants={itemVariants}>
            <h3 className="text-2xl font-bold text-brand-text mb-4">¿QUÉ INCLUYE?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Clase Guiada', desc: '2 horas de experiencia directa' },
                { title: 'Técnica a Elegir', desc: 'Torno o Moldeo a Mano' },
                { title: 'Todos los Materiales', desc: 'Herramientas, barro, esmaltes' },
                { title: 'Horneado Profesional', desc: 'Cerámicas listas para usar' },
                { title: 'Botella de Vino', desc: 'Para brindar después' },
                { title: 'Piqueos para Dos', desc: 'Aperitivos incluidos' }
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  className="flex gap-3 p-3 rounded-lg bg-white/50 hover:bg-white/75 transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div>
                    <p className="font-semibold text-brand-text">{item.title}</p>
                    <p className="text-sm text-brand-secondary">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Product Features - Using Card Elevated */}
          <motion.div variants={itemVariants}>
            <Card variant="elevated">
              <h4 className="font-bold text-brand-text text-lg mb-3">Características Especiales:</h4>
              <ul className="space-y-2">
                {[
                  'Piezas aptas para alimentos',
                  'Seguras para microondas y lavavajillas',
                  'Instructor especializado incluido',
                  'Ambiente relajado y creativo'
                ].map((feature, idx) => (
                  <motion.li
                    key={idx}
                    className="flex gap-2 items-center"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.05 }}
                  >
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-brand-text">{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </Card>
          </motion.div>

          {/* Important Info Box - Enhanced Alert Style */}
          <motion.div
            className="bg-gradient-to-r from-amber-50 to-amber-100/50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-subtle"
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex gap-3">
              <InfoCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-bold text-amber-900 mb-1">Reserva Anticipada</p>
                <p className="text-sm text-amber-800">
                  Pago completo anticipado ($190). Se coordina día y hora según disponibilidad del estudio.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Price - Premium Card */}
          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
          >
            <Card variant="premium">
              <div className="text-center">
                <p className="text-sm text-brand-secondary mb-2">PRECIO TOTAL</p>
                <p className="text-5xl font-bold text-brand-primary">$190</p>
                <p className="text-sm text-brand-secondary mt-2">Para ambos (pareja)</p>
              </div>
            </Card>
          </motion.div>

          {/* Duration Info */}
          <motion.div
            className="flex justify-around text-center"
            variants={itemVariants}
          >
            {[
              { label: 'Duración', value: '2 horas aprox' },
              { label: 'Capacidad', value: 'Para 2 personas' },
              { label: 'Ubicación', value: 'CeramicAlma' }
            ].map((info, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + idx * 0.05 }}
              >
                <p className="font-semibold text-brand-text">{info.label}</p>
                <p className="text-sm text-brand-secondary">{info.value}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Footer - Action Buttons */}
        <motion.div
          className="bg-gradient-to-r from-brand-background/80 to-white/50 border-t border-brand-border/30 p-6 flex gap-4 justify-end shadow-subtle"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Button variant="outline" onClick={onBack}>
            Volver
          </Button>
          <Button variant="premium" onClick={onContinue}>
            Continuar a Técnica
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
