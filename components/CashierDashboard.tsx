import React, { useState, useEffect } from 'react';
import { CASH_DENOMINATIONS, CashierEntry } from '../types';
import { cashierService } from '../services/cashierService';
import { formatCurrency, formatDate } from '../utils/formatters';

// Helper function to round to 2 decimals
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export const CashierDashboard: React.FC = () => {
  const [view, setView] = useState<'form' | 'history'>('form');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    initialBalance: 0,
    cashDenominations: Object.fromEntries(
      CASH_DENOMINATIONS.map(d => [d.key, 0])
    ),
    salesTC: 0,
    transfers: 0,
    manualValueFromSystem: 0,
    notes: '',
  });

  const [entries, setEntries] = useState<CashierEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<CashierEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load entries on mount
  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    try {
      setLoading(true);
      const data = await cashierService.listEntries();
      setEntries(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading entries');
    } finally {
      setLoading(false);
    }
  }

  function handleDenominationChange(key: string, value: string) {
    setFormData(prev => ({
      ...prev,
      cashDenominations: {
        ...prev.cashDenominations,
        [key]: value === '' ? 0 : parseInt(value) || 0,
      },
    }));
  }

  // Helper function to format number input value
  function formatNumberValue(value: number): string {
    return value === 0 ? '' : String(value);
  }

  function calculateTotalCash() {
    let total = 0;
    CASH_DENOMINATIONS.forEach(denom => {
      const count = formData.cashDenominations[denom.key as keyof typeof formData.cashDenominations] || 0;
      total += denom.value * (typeof count === 'number' ? count : 0);
    });
    return total;
  }

  function calculateCuadre() {
    const totalCash = calculateTotalCash();
    return {
      totalCash,
      expectedTotal: formData.initialBalance + totalCash + formData.salesTC + formData.transfers,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { expectedTotal } = calculateCuadre();
      await cashierService.create({
        date: formData.date,
        initialBalance: formData.initialBalance,
        previousSystemBalance: 0,
        cashDenominations: formData.cashDenominations as Record<any, number>,
        salesTC: formData.salesTC,
        transfers: formData.transfers,
        manualValueFromSystem: formData.manualValueFromSystem,
        notes: formData.notes,
      });

      setSuccess('Cuadre guardado exitosamente');
      
      // Reset form data
      const resetData = {
        date: new Date().toISOString().split('T')[0],
        initialBalance: 0,
        cashDenominations: Object.fromEntries(
          CASH_DENOMINATIONS.map(d => [d.key, 0])
        ),
        salesTC: 0,
        transfers: 0,
        manualValueFromSystem: 0,
        notes: '',
      };
      
      setFormData(resetData);

      // Reload entries
      await loadEntries();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error saving entry');
    } finally {
      setLoading(false);
    }
  }

  const { totalCash, expectedTotal } = calculateCuadre();
  const difference = expectedTotal - formData.manualValueFromSystem;
  const hasDiscrepancy = Math.abs(difference) > 0.01;

  return (
    <div className="min-h-screen bg-brand-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-brand-primary mb-2">Cuadre de Caja</h1>
          <p className="text-brand-secondary">Controla y verifica tu caja diaria</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-brand-border">
          <button
            onClick={() => setView('form')}
            className={`px-6 py-3 font-semibold transition ${
              view === 'form'
                ? 'text-brand-primary border-b-2 border-brand-primary'
                : 'text-brand-secondary hover:text-brand-primary'
            }`}
          >
            Nuevo Cuadre
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-6 py-3 font-semibold transition ${
              view === 'history'
                ? 'text-brand-primary border-b-2 border-brand-primary'
                : 'text-brand-secondary hover:text-brand-primary'
            }`}
          >
            Historial
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Form View */}
        {view === 'form' && !selectedEntry && (
          <form onSubmit={handleSubmit} className="max-w-4xl">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-brand-primary mb-6">Información del Día</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-brand-text mb-2">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-text mb-2">
                    Saldo Inicial de Caja
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formatNumberValue(formData.initialBalance)}
                    onChange={e => setFormData({ ...formData, initialBalance: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Cash Counter */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-brand-primary mb-6">Contador de Efectivo</h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                {CASH_DENOMINATIONS.map(denom => (
                  <div key={denom.key} className="border border-brand-border rounded-lg p-4">
                    <label className="text-sm font-semibold text-brand-text block mb-2">
                      {denom.label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formatNumberValue(formData.cashDenominations[denom.key as keyof typeof formData.cashDenominations] as number || 0)}
                      onChange={e => handleDenominationChange(denom.key, e.target.value)}
                      className="w-full px-3 py-2 border border-brand-border rounded text-center focus:outline-none focus:border-brand-primary"
                      placeholder="0.00"
                    />
                    <div className="text-xs text-brand-secondary mt-2 text-center">
                      {formatCurrency(((formData.cashDenominations[denom.key as keyof typeof formData.cashDenominations] || 0) as number) * denom.value)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-brand-background p-4 rounded-lg">
                <div className="text-lg font-bold text-brand-primary">
                  Total Efectivo: {formatCurrency(totalCash)}
                </div>
              </div>
            </div>

            {/* Sales & Transfers */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-brand-primary mb-6">Ventas y Transferencias</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-brand-text mb-2">
                    Ventas en Tarjeta Crédito
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formatNumberValue(formData.salesTC)}
                    onChange={e => setFormData({ ...formData, salesTC: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-text mb-2">
                    Transferencias
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formatNumberValue(formData.transfers)}
                    onChange={e => setFormData({ ...formData, transfers: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Manual Value & Reconciliation */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-brand-primary mb-6">Cuadre Manual</h2>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-brand-text mb-2">
                  Valor del Otro Sistema (Manual)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formatNumberValue(formData.manualValueFromSystem)}
                  onChange={e => setFormData({ ...formData, manualValueFromSystem: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-brand-background p-4 rounded-lg">
                  <div className="text-sm text-brand-secondary mb-1">Total Esperado</div>
                  <div className="text-2xl font-bold text-brand-primary">
                    {formatCurrency(expectedTotal)}
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${
                  hasDiscrepancy
                    ? 'bg-red-100'
                    : 'bg-green-100'
                }`}>
                  <div className={`text-sm mb-1 ${hasDiscrepancy ? 'text-red-700' : 'text-green-700'}`}>
                    {hasDiscrepancy ? 'Diferencia' : 'Cuadre Correcto'}
                  </div>
                  <div className={`text-2xl font-bold ${hasDiscrepancy ? 'text-red-700' : 'text-green-700'}`}>
                    {formatCurrency(difference)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-text mb-2">
                  Notas (Opcional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                  rows={3}
                  placeholder="Agrega cualquier nota sobre discrepancias o situaciones especiales..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-primary text-white font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? 'Guardando...' : 'Guardar Cuadre'}
            </button>
          </form>
        )}

        {/* History View */}
        {view === 'history' && !selectedEntry && (
          <div>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
                <p className="text-brand-secondary mt-4">Cargando historial...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-brand-secondary">No hay cuadres registrados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map(entry => (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-brand-primary">
                          {formatDate(entry.date)}
                        </h3>
                        <p className="text-sm text-brand-secondary">
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className={`px-4 py-2 rounded-lg font-semibold ${
                        entry.discrepancy
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {entry.discrepancy ? 'Diferencia' : 'Cuadrado'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-brand-secondary">Total Efectivo</div>
                        <div className="font-bold text-brand-primary">
                          {formatCurrency(roundToTwoDecimals(entry.totalCash))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-brand-secondary">Total Esperado</div>
                        <div className="font-bold text-brand-primary">
                          {formatCurrency(roundToTwoDecimals(entry.expectedTotal))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-brand-secondary">Sistema Manual</div>
                        <div className="font-bold text-brand-primary">
                          {formatCurrency(roundToTwoDecimals(entry.manualValueFromSystem))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-brand-secondary">Diferencia</div>
                        <div className={`font-bold ${entry.discrepancy ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(roundToTwoDecimals(entry.difference))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Detail View */}
        {selectedEntry && (
          <CashierDetail
            entry={selectedEntry}
            onBack={() => setSelectedEntry(null)}
            onUpdate={() => {
              setSelectedEntry(null);
              loadEntries();
            }}
          />
        )}
      </div>
    </div>
  );
};

// Detail View Component
interface CashierDetailProps {
  entry: CashierEntry;
  onBack: () => void;
  onUpdate: () => void;
}

function CashierDetail({ entry, onBack, onUpdate }: CashierDetailProps) {
  const [editMode, setEditMode] = useState(false);
  const [notes, setNotes] = useState(entry.notes || '');
  const [loading, setLoading] = useState(false);

  async function handleSaveNotes() {
    setLoading(true);
    try {
      await cashierService.updateEntry(entry.id, { notes });
      setEditMode(false);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <button
        onClick={onBack}
        className="mb-6 text-brand-primary hover:underline font-semibold"
      >
        ← Volver al historial
      </button>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-brand-primary mb-4">
          Cuadre del {formatDate(entry.date)}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-brand-background p-4 rounded-lg">
            <div className="text-sm text-brand-secondary mb-1">Saldo Inicial</div>
            <div className="text-2xl font-bold text-brand-primary">
              {formatCurrency(roundToTwoDecimals(entry.initialBalance))}
            </div>
          </div>

          <div className="bg-brand-background p-4 rounded-lg">
            <div className="text-sm text-brand-secondary mb-1">Total Efectivo</div>
            <div className="text-2xl font-bold text-brand-primary">
              {formatCurrency(roundToTwoDecimals(entry.totalCash))}
            </div>
          </div>

          <div className="bg-brand-background p-4 rounded-lg">
            <div className="text-sm text-brand-secondary mb-1">Ventas TC</div>
            <div className="text-2xl font-bold text-brand-primary">
              {formatCurrency(roundToTwoDecimals(entry.salesTC))}
            </div>
          </div>

          <div className="bg-brand-background p-4 rounded-lg">
            <div className="text-sm text-brand-secondary mb-1">Transferencias</div>
            <div className="text-2xl font-bold text-brand-primary">
              {formatCurrency(roundToTwoDecimals(entry.transfers))}
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <h3 className="text-xl font-bold text-brand-primary mb-4">Desglose de Efectivo</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {CASH_DENOMINATIONS.map(denom => {
            const count = (entry.cashDenominations[denom.key as keyof typeof entry.cashDenominations] as number) || 0;
            const total = count * denom.value;
            return (
              <div key={denom.key} className="border border-brand-border rounded-lg p-3">
                <div className="text-xs font-semibold text-brand-text">{denom.label}</div>
                <div className="text-lg font-bold text-brand-primary">{count}</div>
                <div className="text-xs text-brand-secondary">{formatCurrency(roundToTwoDecimals(total))}</div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-brand-background p-4 rounded-lg">
            <div className="text-sm text-brand-secondary mb-1">Total Esperado</div>
            <div className="text-2xl font-bold text-brand-primary">
              {formatCurrency(roundToTwoDecimals(entry.expectedTotal))}
            </div>
          </div>

          <div className="bg-brand-background p-4 rounded-lg">
            <div className="text-sm text-brand-secondary mb-1">Valor Sistema Manual</div>
            <div className="text-2xl font-bold text-brand-primary">
              {formatCurrency(roundToTwoDecimals(entry.manualValueFromSystem))}
            </div>
          </div>
        </div>

        {/* Discrepancy */}
        <div className={`p-4 rounded-lg mb-8 ${
          entry.discrepancy
            ? 'bg-red-100'
            : 'bg-green-100'
        }`}>
          <div className={`text-sm mb-1 ${entry.discrepancy ? 'text-red-700' : 'text-green-700'}`}>
            {entry.discrepancy ? 'DIFERENCIA ENCONTRADA' : 'CUADRE CORRECTO'}
          </div>
          <div className={`text-3xl font-bold ${entry.discrepancy ? 'text-red-700' : 'text-green-700'}`}>
            {formatCurrency(roundToTwoDecimals(entry.difference))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-brand-primary">Notas</h3>
            <button
              onClick={() => setEditMode(!editMode)}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90 transition"
            >
              {editMode ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          {editMode ? (
            <div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                rows={4}
              />
              <button
                onClick={handleSaveNotes}
                disabled={loading}
                className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          ) : (
            <div className="bg-brand-background p-4 rounded-lg">
              <p className="text-brand-text whitespace-pre-wrap">
                {entry.notes || '(Sin notas)'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
