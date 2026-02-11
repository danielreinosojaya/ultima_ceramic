import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface PolicyModalProps {
    onClose: () => void;
    policiesText: string;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ onClose, policiesText }) => {
    // Animation variants
    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    };

    const modalVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.3, ease: 'easeOut' }
        },
        exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
            >
                <motion.div
                    className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-premium"
                    onClick={(e) => e.stopPropagation()}
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                >
                    {/* Header with Gradient */}
                    <motion.div
                        className="bg-gradient-to-r from-brand-primary to-brand-accent text-white p-6 text-center shadow-premium"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <h2 className="text-2xl font-serif text-white">
                            Políticas de Devoluciones
                        </h2>
                    </motion.div>

                    {/* Content */}
                    <motion.div
                        className="flex-grow overflow-y-auto p-8 bg-white"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                    >
                        <div className="text-brand-secondary whitespace-pre-wrap leading-relaxed text-sm">
                            {policiesText}
                        </div>
                    </motion.div>

                    {/* Footer */}
                    <motion.div
                        className="bg-gradient-to-r from-white/80 to-gray-50/80 border-t border-brand-border/20 p-6 flex justify-end shadow-subtle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <Button variant="premium" onClick={onClose}>
                            Cerrar
                        </Button>
                    </motion.div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};