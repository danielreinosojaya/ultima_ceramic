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
    cardSales: 0,
    transferSales: 0,
    cashDenominations: Object.fromEntries(CASH_DENOMINATIONS.map(d => [d.key, 0])),
    expenses: [] as Array<{ id: string; description: string; amount: number }>,
    notes: '',
  });

  const [entries, setEntries] = useState<CashierEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<CashierEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        cardSales: formData.cardSales,
        transferSales: formData.transferSales,
        cashDenominations: formData.cashDenominations as Record<any, number>,
        expenses: formData.expenses,
        manualValueFromSystem: 0,
        notes: formData.notes,
      });

      setSuccess('Cuadre guardado exitosamente');
      setFormData({
        date: new Date().toISOString().split('T')[0],
        initialBalance: 0,
        cashSales: 0,
        cardSales: 0,
        transferSales: 0,
        cashDenominations: Object.fromEntries(CASH_DENOMINATIONS.map(d => [d.key, 0])),
        expenses: [],
        notes: '',
      });

      await loadEntries();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error saving entry');
    } finally {
      setLoading(false);
    }
  }

  function openDeleteModal(entryId: string, event: React.MouseEvent) {
    event.stopPropagation(); // Prevent expanding the entry
    setEntryToDelete(entryId);
    setDeletePassword('');
    setDeleteError(null);
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setDeleteModalOpen(false);
    setDeletePassword('');
    setDeleteError(null);
    setEntryToDelete(null);
  }

  async function handleDelete() {
    if (deletePassword !== 'Admify2025') {
      setDeleteError('Contraseña incorrecta');
      return;
    }

    if (!entryToDelete) return;

    try {
      setLoading(true);
      await cashierService.deleteEntry(entryToDelete);
      await loadEntries();
      setSuccess('Registro eliminado exitosamente');
      setTimeout(() => setSuccess(null), 3000);
      closeDeleteModal();
    } catch (err: any) {
      setDeleteError(err.message || 'Error al eliminar');
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

                <div>
                  <label className="block text-sm font-semibold text-brand-text mb-2">Ventas con Tarjeta</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formatNumberValue(formData.cardSales)}
                    onChange={e => setFormData({ ...formData, cardSales: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-text mb-2">Ventas con Transferencia</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formatNumberValue(formData.transferSales)}
                    onChange={e => setFormData({ ...formData, transferSales: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:border-brand-primary"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Ingresos Totales del Día */}
              <div className="mt-6 bg-brand-background p-6 rounded-lg border-2 border-brand-primary">
                <div className="text-sm text-brand-secondary mb-2">Ingresos Totales del Día</div>
                <div className="text-4xl font-bold text-brand-primary mb-2">
                  {formatCurrency((formData.cashSales || 0) + (formData.cardSales || 0) + (formData.transferSales || 0))}
                </div>
                <div className="text-xs text-brand-secondary">
                  Efectivo: {formatCurrency(formData.cashSales)} + Tarjeta: {formatCurrency(formData.cardSales || 0)} + Transferencia: {formatCurrency(formData.transferSales || 0)}
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
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-3xl font-bold text-brand-primary">
                            {formatCurrency(entry.finalCashBalance)}
                          </div>
                          <p className="text-sm text-brand-secondary">Saldo final</p>
                        </div>
                        <button
                          onClick={(e) => openDeleteModal(entry.id, e)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                          title="Eliminar registro"
                        >
                          🗑️ Eliminar
                        </button>
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

                        {/* Ingresos Totales del Día */}
                        {((entry.cardSales || 0) > 0 || (entry.transferSales || 0) > 0) && (
                          <div className="bg-brand-background p-4 rounded-lg border-2 border-brand-primary">
                            <h4 className="font-bold text-brand-primary mb-3">Ingresos Totales del Día</h4>
                            <div className="text-3xl font-bold text-brand-primary mb-3">
                              {formatCurrency((entry.cashSales || 0) + (entry.cardSales || 0) + (entry.transferSales || 0))}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <div className="text-xs text-brand-secondary">Efectivo</div>
                                <div className="font-semibold">{formatCurrency(entry.cashSales)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-brand-secondary">Tarjeta</div>
                                <div className="font-semibold">{formatCurrency(entry.cardSales || 0)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-brand-secondary">Transferencia</div>
                                <div className="font-semibold">{formatCurrency(entry.transferSales || 0)}</div>
                              </div>
                            </div>
                          </div>
                        )}

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

                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-brand-primary mb-4">
              Eliminar Registro
            </h3>
            <p className="text-brand-text mb-4">
              Para eliminar este registro, ingresa la contraseña de administrador:
            </p>
            
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full border border-brand-border rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleDelete();
                }
              }}
            />

            {deleteError && (
              <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-brand-border text-brand-text rounded-lg hover:bg-brand-background transition"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
