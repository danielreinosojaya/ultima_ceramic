import React, { useState, useEffect } from 'react';
import { CASH_DENOMINATIONS, CashierEntry } from '../types';
import { cashierService } from '../services/cashierService';
import { formatCurrency, formatDate } from '../utils/formatters';

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export const CashierDashboard: React.FC = () => {
  const [view, setView] = useState<'form' | 'history'>('form');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    initialBalance: 0,
    cashSales: 0,
    cashDenominations: Object.fromEntries(CASH_DENOMINATIONS.map(d => [d.key, 0])),
    expenses: [] as Array<{ id: string; description: string; amount: number }>,
    notes: '',
    // Cuadre de Ventas Totales
    systemCashSales: 0,
    systemCardSales: 0,
    systemTransferSales: 0,
    myEffectiveSales: 0,
    myVouchersAccumulated: 0,
    myTransfersReceived: 0,
  });

  const [entries, setEntries] = useState<CashierEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<CashierEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  function formatNumberValue(value: number): string {
    return value === 0 ? '' : String(value);
  }

  function addExpense() {
    setFormData(prev => ({
      ...prev,
      expenses: [
        ...prev.expenses,
        { id: `exp_${Date.now()}`, description: '', amount: 0 }
      ]
    }));
  }

  function removeExpense(id: string) {
    setFormData(prev => ({
      ...prev,
      expenses: prev.expenses.filter(exp => exp.id !== id)
    }));
  }

  function updateExpense(id: string, field: 'description' | 'amount', value: string | number) {
    setFormData(prev => ({
      ...prev,
      expenses: prev.expenses.map(exp =>
        exp.id === id
          ? {
              ...exp,
              [field]: field === 'amount' ? (value === '' ? 0 : parseFloat(String(value)) || 0) : value
            }
          : exp
      )
    }));
  }

  function calculateTotalCashCounted() {
    let total = 0;
    CASH_DENOMINATIONS.forEach(denom => {
      const count = formData.cashDenominations[denom.key as keyof typeof formData.cashDenominations] || 0;
      total += denom.value * (typeof count === 'number' ? count : 0);
    });
    return total;
  }

  function calculateTotalExpenses() {
    return formData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }

  function calculateCuadre() {
    const totalExpenses = calculateTotalExpenses();
    const finalCashBalance = formData.initialBalance + formData.cashSales - totalExpenses;
    return {
      totalExpenses,
      finalCashBalance,
    };
  }

  function calculateSystemTotalSales() {
    return (formData.systemCashSales || 0) + (formData.systemCardSales || 0) + (formData.systemTransferSales || 0);
  }

  function calculateMyTotalSales() {
    return (formData.myEffectiveSales || 0) + (formData.myVouchersAccumulated || 0) + (formData.myTransfersReceived || 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await cashierService.create({
        date: formData.date,
        initialBalance: formData.initialBalance,
        cashSales: formData.cashSales,
        cashDenominations: formData.cashDenominations as Record<any, number>,
        expenses: formData.expenses,
        manualValueFromSystem: 0,
        notes: formData.notes,
        systemCashSales: formData.systemCashSales,
        systemCardSales: formData.systemCardSales,
        systemTransferSales: formData.systemTransferSales,
        myEffectiveSales: formData.myEffectiveSales,
        myVouchersAccumulated: formData.myVouchersAccumulated,
        myTransfersReceived: formData.myTransfersReceived,
      });

      setSuccess('Cuadre guardado exitosamente');
      setFormData({
        date: new Date().toISOString().split('T')[0],
        initialBalance: 0,
        cashSales: 0,
        cashDenominations: Object.fromEntries(CASH_DENOMINATIONS.map(d => [d.key, 0])),
        expenses: [],
        notes: '',
        systemCashSales: 0,
        systemCardSales: 0,
        systemTransferSales: 0,
        myEffectiveSales: 0,
        myVouchersAccumulated: 0,
        myTransfersReceived: 0,
      });

      await loadEntries();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error saving entry');
    } finally {
      setLoading(false);
    }
  }

  const { finalCashBalance, totalExpenses } = calculateCuadre();
  const totalCashCounted = calculateTotalCashCounted();
  const difference = totalCashCounted - finalCashBalance; // Físico - Calculado
  const hasDiscrepancy = Math.abs(difference) > 0.01;

  // Determine status: faltante (red), cuadrado (green), sobrante (yellow)
  let statusColor = 'bg-green-100 text-green-700';
  let statusIcon = '✓';
  let statusText = 'Cuadre Correcto';

  if (difference < -0.01) {
    // Faltante (negative difference = less cash than expected)
    statusColor = 'bg-red-100 text-red-700';
    statusIcon = '⚠️';
    statusText = `Faltante: ${formatCurrency(Math.abs(difference))}`;
  } else if (difference > 0.01) {
    // Sobrante (positive difference = more cash than expected)
    statusColor = 'bg-yellow-100 text-yellow-700';
    statusIcon = '⚠️';
    statusText = `Sobrante: ${formatCurrency(difference)}`;
  }

  return (
    <div className="min-h-screen bg-brand-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-brand-primary mb-2">Cuadre de Caja</h1>
          <p className="text-brand-secondary">Saldo inicial + Ventas en efectivo - Egresos = Saldo final de caja</p>
        </div>

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

        {view === 'form' && (
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-brand-primary mb-6">Información Básica</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-brand-text mb-2">Fecha</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-text mb-2">Saldo Inicial de Caja</label>
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

                <div>
                  <label className="block text-sm font-semibold text-brand-text mb-2">Ventas en Efectivo</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formatNumberValue(formData.cashSales)}
                    onChange={e => setFormData({ ...formData, cashSales: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-brand-primary mb-6">Contador de Efectivo (Verificación)</h2>
              <p className="text-sm text-brand-secondary mb-6">Cuenta el efectivo físico en caja para validar el cuadre.</p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                {CASH_DENOMINATIONS.map(denom => (
                  <div key={denom.key} className="border border-brand-border rounded-lg p-4">
                    <label className="text-sm font-semibold text-brand-text block mb-2">{denom.label}</label>
                    <input
                      type="number"
                      min="0"
                      value={formatNumberValue(formData.cashDenominations[denom.key as keyof typeof formData.cashDenominations] as number || 0)}
                      onChange={e => handleDenominationChange(denom.key, e.target.value)}
                      className="w-full px-3 py-2 border border-brand-border rounded text-center focus:outline-none focus:border-brand-primary"
                      placeholder="0"
                    />
                    <div className="text-xs text-brand-secondary mt-2 text-center">
                      {formatCurrency(((formData.cashDenominations[denom.key as keyof typeof formData.cashDenominations] || 0) as number) * denom.value)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-brand-background p-4 rounded-lg">
                <div className="text-lg font-bold text-brand-primary">
                  Total Contado: {formatCurrency(calculateTotalCashCounted())}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-brand-primary mb-6">Egresos (Gastos)</h2>

              <div className="space-y-4 mb-6">
                {formData.expenses.map((expense) => (
                  <div key={expense.id} className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-sm font-semibold text-brand-text block mb-2">Descripción</label>
                      <input
                        type="text"
                        value={expense.description}
                        onChange={e => updateExpense(expense.id, 'description', e.target.value)}
                        className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                        placeholder="Ej: Suministros"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-sm font-semibold text-brand-text block mb-2">Monto</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formatNumberValue(expense.amount)}
                        onChange={e => updateExpense(expense.id, 'amount', e.target.value)}
                        className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary text-right"
                        placeholder="0.00"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExpense(expense.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addExpense}
                className="mb-6 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-opacity-90 transition"
              >
                + Agregar Gasto
              </button>

              <div className="bg-brand-background p-4 rounded-lg">
                <div className="text-lg font-bold text-brand-primary">
                  Total Egresos: {formatCurrency(totalExpenses)}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-brand-primary mb-6">Saldo Final de Caja</h2>
              <p className="text-sm text-brand-secondary mb-4">Calculado automáticamente: Saldo inicial + Ventas en efectivo - Egresos</p>

              <div className="bg-brand-background p-6 rounded-lg border-2 border-brand-primary">
                <div className="text-3xl font-bold text-brand-primary text-center">
                  {formatCurrency(finalCashBalance)}
                </div>
                <p className="text-center text-sm text-brand-secondary mt-2">
                  Fórmula: {formatCurrency(formData.initialBalance)} + {formatCurrency(formData.cashSales)} - {formatCurrency(totalExpenses)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-brand-primary mb-6">Validación de Cuadre Físico</h2>
              <p className="text-sm text-brand-secondary mb-4">Comparación entre Saldo Final Calculado y Total Contado</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-brand-background p-4 rounded-lg">
                  <div className="text-sm text-brand-secondary mb-1">Saldo Final Calculado</div>
                  <div className="text-3xl font-bold text-brand-primary">
                    {formatCurrency(finalCashBalance)}
                  </div>
                </div>
                
                <div className="bg-brand-background p-4 rounded-lg">
                  <div className="text-sm text-brand-secondary mb-1">Total Contado (Físico)</div>
                  <div className="text-3xl font-bold text-brand-primary">
                    {formatCurrency(totalCashCounted)}
                  </div>
                </div>
              </div>

              <div className={`${statusColor} p-6 rounded-lg border-2 transition`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-3xl">{statusIcon}</div>
                  <div className="text-2xl font-bold">{statusText}</div>
                </div>
                <div className="text-sm font-semibold">
                  Diferencia: {formatCurrency(Math.abs(difference))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-brand-primary mb-6">Cuadre de Ventas Totales</h2>
              <p className="text-sm text-brand-secondary mb-6">Compara las ventas totales del sistema Contifico con lo que contaste: Efectivo + Vouchers (TC) + Transferencias</p>

              <div className="grid grid-cols-1 gap-6 mb-6">
                {/* Sistema (Contifico) */}
                <div className="border-2 border-brand-border rounded-lg p-6 bg-brand-background">
                  <h3 className="text-lg font-bold text-brand-primary mb-4">Sistema (Contifico)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-brand-text mb-2">Ventas en Efectivo</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.systemCashSales === 0 ? '' : String(formData.systemCashSales)}
                        onChange={e => setFormData({ ...formData, systemCashSales: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-brand-text mb-2">Ventas en Tarjeta</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.systemCardSales === 0 ? '' : String(formData.systemCardSales)}
                        onChange={e => setFormData({ ...formData, systemCardSales: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-brand-text mb-2">Ventas en Transferencia</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.systemTransferSales === 0 ? '' : String(formData.systemTransferSales)}
                        onChange={e => setFormData({ ...formData, systemTransferSales: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-white rounded-lg border-2 border-brand-primary">
                    <div className="text-sm text-brand-secondary mb-1">Total Ventas Sistema</div>
                    <div className="text-3xl font-bold text-brand-primary">
                      {formatCurrency(calculateSystemTotalSales())}
                    </div>
                  </div>
                </div>

                {/* Lo que contaste */}
                <div className="border-2 border-brand-border rounded-lg p-6 bg-brand-background">
                  <h3 className="text-lg font-bold text-brand-primary mb-4">Lo que TÚ Contaste</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-brand-text mb-2">Mis Ventas en Efectivo</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.myEffectiveSales === 0 ? '' : String(formData.myEffectiveSales)}
                        onChange={e => setFormData({ ...formData, myEffectiveSales: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-brand-text mb-2">Mis Vouchers Acumulados (TC)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.myVouchersAccumulated === 0 ? '' : String(formData.myVouchersAccumulated)}
                        onChange={e => setFormData({ ...formData, myVouchersAccumulated: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-brand-text mb-2">Mis Transferencias Recibidas</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.myTransfersReceived === 0 ? '' : String(formData.myTransfersReceived)}
                        onChange={e => setFormData({ ...formData, myTransfersReceived: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-white rounded-lg border-2 border-brand-primary">
                    <div className="text-sm text-brand-secondary mb-1">Mi Total de Ventas</div>
                    <div className="text-3xl font-bold text-brand-primary">
                      {formatCurrency(calculateMyTotalSales())}
                    </div>
                  </div>
                </div>

                {/* Validación de cuadre */}
                {(calculateSystemTotalSales() > 0 || calculateMyTotalSales() > 0) && (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-brand-background p-4 rounded-lg">
                        <div className="text-sm text-brand-secondary mb-1">Total Sistema</div>
                        <div className="text-2xl font-bold text-brand-primary">
                          {formatCurrency(calculateSystemTotalSales())}
                        </div>
                      </div>
                      <div className="bg-brand-background p-4 rounded-lg">
                        <div className="text-sm text-brand-secondary mb-1">Mi Total</div>
                        <div className="text-2xl font-bold text-brand-primary">
                          {formatCurrency(calculateMyTotalSales())}
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const salesDiff = calculateSystemTotalSales() - calculateMyTotalSales();
                      const isCuadrado = Math.abs(salesDiff) <= 0.01;
                      
                      let statusColor = 'bg-green-100 text-green-700';
                      let statusIcon = '✓';
                      let statusText = 'Cuadre Correcto';

                      if (!isCuadrado) {
                        if (calculateMyTotalSales() < calculateSystemTotalSales()) {
                          statusColor = 'bg-red-100 text-red-700';
                          statusIcon = '❌';
                          statusText = 'Faltante en Ventas';
                        } else {
                          statusColor = 'bg-yellow-100 text-yellow-700';
                          statusIcon = '⚠️';
                          statusText = 'Sobrante en Ventas';
                        }
                      }

                      return (
                        <div className={`${statusColor} p-6 rounded-lg border-2 transition`}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-3xl">{statusIcon}</div>
                            <div className="text-2xl font-bold">{statusText}</div>
                          </div>
                          <div className="text-sm font-semibold">
                            Diferencia: {formatCurrency(Math.abs(salesDiff))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <label className="block text-sm font-semibold text-brand-text mb-2">Notas (Opcional)</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                placeholder="Agrega observaciones sobre este cuadre..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-brand-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Cuadre'}
            </button>
          </form>
        )}

        {view === 'history' && (
          <div>
            {loading && <p className="text-brand-secondary">Cargando...</p>}
            {entries.length === 0 ? (
              <p className="text-brand-secondary">No hay cuadres registrados</p>
            ) : (
              <div className="space-y-6">
                {entries.map(entry => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition"
                    onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-brand-primary">{formatDate(entry.date)}</h3>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-brand-primary">
                          {formatCurrency(entry.finalCashBalance)}
                        </div>
                        <p className="text-sm text-brand-secondary">Saldo final</p>
                      </div>
                    </div>

                    {selectedEntry?.id === entry.id && (
                      <div className="mt-6 pt-6 border-t border-brand-border space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-brand-background p-4 rounded-lg">
                            <div className="text-sm text-brand-secondary">Saldo Inicial</div>
                            <div className="text-2xl font-bold text-brand-primary">
                              {formatCurrency(entry.initialBalance)}
                            </div>
                          </div>

                          <div className="bg-brand-background p-4 rounded-lg">
                            <div className="text-sm text-brand-secondary">Ventas en Efectivo</div>
                            <div className="text-2xl font-bold text-brand-primary">
                              {formatCurrency(entry.cashSales)}
                            </div>
                          </div>

                          <div className="bg-brand-background p-4 rounded-lg">
                            <div className="text-sm text-brand-secondary">Total Egresos</div>
                            <div className="text-2xl font-bold text-brand-primary">
                              {formatCurrency(entry.totalExpenses)}
                            </div>
                          </div>
                        </div>

                        {entry.expenses.length > 0 && (
                          <div className="bg-brand-background p-4 rounded-lg">
                            <h4 className="font-bold text-brand-primary mb-3">Desglose de Egresos</h4>
                            <div className="space-y-2">
                              {entry.expenses.map(exp => (
                                <div key={exp.id} className="flex justify-between text-sm">
                                  <span className="text-brand-text">{exp.description}</span>
                                  <span className="font-semibold">{formatCurrency(exp.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {entry.notes && (
                          <div className="bg-brand-background p-4 rounded-lg">
                            <h4 className="font-bold text-brand-primary mb-2">Notas</h4>
                            <p className="text-sm text-brand-text">{entry.notes}</p>
                          </div>
                        )}

                        {/* Cuadre de Ventas en historial */}
                        {(entry.systemTotalSales || entry.myTotalSales) && (
                          <div className="bg-brand-background p-4 rounded-lg">
                            <h4 className="font-bold text-brand-primary mb-3">Cuadre de Ventas</h4>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <div className="text-xs text-brand-secondary">Sistema</div>
                                <div className="text-lg font-bold text-brand-primary">{formatCurrency(entry.systemTotalSales || 0)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-brand-secondary">Tu Total</div>
                                <div className="text-lg font-bold text-brand-primary">{formatCurrency(entry.myTotalSales || 0)}</div>
                              </div>
                            </div>
                            <div className="text-xs text-brand-secondary space-y-1">
                              <div>Sistema: {formatCurrency(entry.systemCashSales || 0)} (E) + {formatCurrency(entry.systemCardSales || 0)} (TC) + {formatCurrency(entry.systemTransferSales || 0)} (Tf)</div>
                              <div>Tú: {formatCurrency(entry.myEffectiveSales || 0)} (E) + {formatCurrency(entry.myVouchersAccumulated || 0)} (V) + {formatCurrency(entry.myTransfersReceived || 0)} (Tf)</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
