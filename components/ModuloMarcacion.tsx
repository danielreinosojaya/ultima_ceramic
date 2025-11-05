import React, { useState, useEffect } from 'react';
import type { Employee, ClockInResponse, ClockOutResponse, Timecard } from '../types/timecard';

export const ModuloMarcacion: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' }>({ text: '', type: 'success' });
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [todayStatus, setTodayStatus] = useState<Timecard | null>(null);

  // Al cambiar el código, verificar si empleado ya tiene marcación hoy
  useEffect(() => {
    if (!code.trim()) {
      setCurrentEmployee(null);
      setTodayStatus(null);
      setSearching(false);
      return;
    }

    // Buscar el estado actual del empleado
    const checkEmployeeStatus = async () => {
      setSearching(true);
      try {
        // Usar endpoint que busca por código y retorna estado del día
        const response = await fetch(`/api/timecards?action=get_employee_report&code=${code}`);
        const result = await response.json();
        
        if (result.success && result.employee) {
          setCurrentEmployee(result.employee);
          // Si el endpoint retorna el estado de hoy, usarlo
          if (result.todayStatus) {
            setTodayStatus(result.todayStatus);
          } else {
            setTodayStatus(null);
          }
        } else {
          setCurrentEmployee(null);
          setTodayStatus(null);
        }
      } catch (error) {
        console.error('Error checking employee status:', error);
        setCurrentEmployee(null);
        setTodayStatus(null);
      } finally {
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(checkEmployeeStatus, 500);
    return () => clearTimeout(debounceTimer);
  }, [code]);

  const handleClockIn = async () => {
    if (!code.trim()) {
      setMessage({ text: 'Ingresa tu código', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: 'success' });

    try {
      const response = await fetch(`/api/timecards?action=clock_in&code=${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const result = (await response.json()) as ClockInResponse;

      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        setCurrentEmployee(result.employee || null);
        
        // Refrescar el estado desde el servidor para garantizar consistencia
        if (result.employee?.code) {
          try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar a que se propague en BD
            const refreshResponse = await fetch(`/api/timecards?action=get_employee_report&code=${result.employee.code}`);
            const refreshResult = await refreshResponse.json();
            if (refreshResult.success && refreshResult.todayStatus) {
              setTodayStatus(refreshResult.todayStatus);
            }
          } catch (refreshError) {
            console.error('Error refreshing employee status:', refreshError);
            // Fallback al timecard local si el refresh falla
            const todayStr = new Date().toISOString().split('T')[0];
            const newTimecard: Timecard = {
              id: 0,
              employee_id: result.employee?.id || 0,
              date: todayStr,
              time_in: result.timestamp,
              time_out: undefined,
              hours_worked: 0,
              notes: undefined,
              edited_by: undefined,
              edited_at: undefined,
              created_at: result.timestamp,
              updated_at: result.timestamp
            };
            setTodayStatus(newTimecard);
          }
        }
        // NO limpiar código - el empleado necesita ver su estado actual
      } else {
        setMessage({ text: result.message, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error al marcar entrada', type: 'error' });
      console.error('Clock in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!code.trim()) {
      setMessage({ text: 'Ingresa tu código', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: 'success' });

    try {
      const response = await fetch(`/api/timecards?action=clock_out&code=${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const result = (await response.json()) as ClockOutResponse;

      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        
        // Refrescar el estado desde el servidor para garantizar consistencia
        if (currentEmployee?.code) {
          try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar a que se propague en BD
            const refreshResponse = await fetch(`/api/timecards?action=get_employee_report&code=${currentEmployee.code}`);
            const refreshResult = await refreshResponse.json();
            if (refreshResult.success && refreshResult.todayStatus) {
              setTodayStatus(refreshResult.todayStatus);
            }
          } catch (refreshError) {
            console.error('Error refreshing employee status:', refreshError);
            // Fallback al timecard local si el refresh falla
            if (todayStatus) {
              const updatedTimecard: Timecard = {
                ...todayStatus,
                time_out: result.timestamp,
                hours_worked: result.hours_worked,
                updated_at: result.timestamp
              };
              setTodayStatus(updatedTimecard);
            }
          }
        }
        // NO limpiar código - el empleado necesita ver su estado actual
      } else {
        setMessage({ text: result.message, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error al marcar salida', type: 'error' });
      console.error('Clock out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isCheckedIn = todayStatus?.time_in && !todayStatus?.time_out;
  const isCheckedOut = todayStatus?.time_in && todayStatus?.time_out;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-background to-brand-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-brand-primary mb-2">🕐 Control de Asistencia</h1>
          <p className="text-brand-secondary text-sm">Marca tu entrada y salida</p>
        </div>

        {/* Input de código */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-brand-text mb-3">Tu Código Personal</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === 'Enter' && !isCheckedIn && handleClockIn()}
            placeholder="Ej: EMP001"
            className="w-full px-4 py-3 rounded-lg border-2 border-brand-border focus:border-brand-primary focus:outline-none text-center font-mono text-lg transition-colors"
            disabled={loading}
          />
          
          {/* Indicador de búsqueda */}
          {code.trim() && searching && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-brand-secondary">
              <div className="animate-spin">⏳</div>
              <span>Buscando tu registro...</span>
            </div>
          )}
          
          {/* Indicador de empleado encontrado */}
          {code.trim() && !searching && currentEmployee && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-green-600 font-semibold">
              <span>✅</span>
              <span>{currentEmployee.name}</span>
            </div>
          )}
          
          {/* Indicador de empleado no encontrado */}
          {code.trim() && !searching && !currentEmployee && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-red-600 font-semibold">
              <span>❌</span>
              <span>Empleado no encontrado</span>
            </div>
          )}
        </div>

        {/* Mensaje */}
        {message.text && (
          <div
            className={`p-3 rounded-lg mb-6 text-sm font-semibold text-center ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Indicador de estado de entrada */}
        {code.trim() && currentEmployee && !searching && (
          <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            {isCheckedIn ? (
              <div className="flex items-center justify-center gap-2 text-sm text-blue-700">
                <span className="text-xl">✅</span>
                <div className="text-left">
                  <p className="font-bold">Entrada registrada</p>
                  <p className="text-xs text-blue-600">
                    {todayStatus?.time_in && new Date(todayStatus.time_in).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-blue-700">
                <span className="text-xl">📋</span>
                <span className="font-semibold">Aún no has marcado entrada hoy</span>
              </div>
            )}
          </div>
        )}

        {/* Botones de marcación */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={handleClockIn}
            disabled={loading || isCheckedIn}
            className={`py-4 rounded-lg font-bold text-white text-center transition-all ${
              isCheckedIn
                ? 'bg-gray-400 cursor-not-allowed opacity-50'
                : 'bg-green-500 hover:bg-green-600 active:scale-95'
            }`}
          >
            ✅ Entrada
          </button>
          <button
            onClick={handleClockOut}
            disabled={loading || !isCheckedIn}
            className={`py-4 rounded-lg font-bold text-white text-center transition-all ${
              !isCheckedIn
                ? 'bg-gray-400 cursor-not-allowed opacity-50'
                : 'bg-red-500 hover:bg-red-600 active:scale-95'
            }`}
          >
            🚪 Salida
          </button>
        </div>

        {/* Estado hoy */}
        {todayStatus && (
          <div className="bg-brand-surface rounded-lg p-6 border border-brand-border/50">
            <h3 className="font-bold text-brand-text mb-4">📍 Hoy</h3>
            <div className="space-y-3 text-sm">
              {todayStatus.time_in && (
                <div className="flex justify-between">
                  <span className="text-brand-secondary">Entrada:</span>
                  <span className="font-mono font-semibold text-green-600">
                    {new Date(todayStatus.time_in).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'America/Bogota' })}
                  </span>
                </div>
              )}
              {todayStatus.time_out && (
                <div className="flex justify-between">
                  <span className="text-brand-secondary">Salida:</span>
                  <span className="font-mono font-semibold text-red-600">
                    {new Date(todayStatus.time_out).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'America/Bogota' })}
                  </span>
                </div>
              )}
              {todayStatus.hours_worked && (
                <div className="flex justify-between pt-2 border-t border-brand-border/50">
                  <span className="text-brand-secondary">Horas trabajadas:</span>
                  <span className="font-mono font-bold text-brand-primary">{todayStatus.hours_worked}h</span>
                </div>
              )}
              {!todayStatus.time_in && (
                <p className="text-center text-brand-secondary italic">Aún no has marcado entrada</p>
              )}
            </div>
          </div>
        )}

        {/* Información útil */}
        <div className="mt-8 pt-6 border-t border-brand-border/30">
          <p className="text-xs text-brand-secondary text-center">
            📞 Si tienes problemas con tu código, contacta al administrador
          </p>
        </div>
      </div>
    </div>
  );
};
