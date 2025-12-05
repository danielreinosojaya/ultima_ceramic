import React from 'react';

/**
 * Simple landing page for cashier reconciliation
 * This component handles URL routing for /cuadre path
 * Actual dashboard is rendered based on pathname detection in App.tsx
 */
export const CashierLanding: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-background">
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold text-brand-primary">Cuadre de Caja</h1>
        <p className="text-brand-secondary mt-2">Sistema de control y reconciliación de caja diaria</p>
      </div>
    </div>
  );
};
