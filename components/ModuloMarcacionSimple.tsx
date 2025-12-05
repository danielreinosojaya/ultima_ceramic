/**
 * ============================================
 * MÓDULO DE MARCACIÓN SIMPLIFICADO - FRONTEND
 * ============================================
 * 
 * FUNCIONALIDAD:
 * 1. Ingresar código de empleado
 * 2. Ver si ya marcó entrada/salida hoy
 * 3. Botones: Entrada / Salida
 * 4. Display de horas trabajadas en tiempo real
 */

import React, { useState, useEffect } from 'react';

// ============================================
// UTILIDADES
// ============================================

/**
 * Formatea timestamp UTC a hora local Ecuador
 */
function formatEcuadorTime(utcTimestamp: string): string {
  if (!utcTimestamp) return '-';
  
  try {
    const date = new Date(utcTimestamp);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleTimeString('es-EC', {
      timeZone: 'America/Guayaquil',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return '-';
  }
}

/**
 * Calcula horas desde entrada hasta ahora
 */
function calculateHoursInProgress(timeInUtc: string): string {
  if (!timeInUtc) return '0.00';
  
  try {
    const timeIn = new Date(timeInUtc);
    const now = new Date();
    
    if (isNaN(timeIn.getTime())) return '0.00';
    
    const diffMs = now.getTime() - timeIn.getTime();
    if (diffMs < 0) return '0.00';
    
    const hours = diffMs / (1000 * 60 * 60);
    return hours.toFixed(2);
  } catch {
    return '0.00';
  }
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const ModuloMarcacionSimple: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' }>({ text: '', type: 'success' });
  
  const [employee, setEmployee] = useState<any>(null);
  const [todayTimecard, setTodayTimecard] = useState<any>(null);
  
  // Reloj en tiempo real
  const [currentTime, setCurrentTime] = useState('');
  const [hoursInProgress, setHoursInProgress] = useState('0.00');

  // Actualizar reloj cada segundo
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('es-EC', {
        timeZone: 'America/Guayaquil',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }));

      // Actualizar horas en progreso si está trabajando
      if (todayTimecard?.timeIn && !todayTimecard?.timeOut) {
        setHoursInProgress(calculateHoursInProgress(todayTimecard.timeIn));
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [todayTimecard]);

  // Buscar estado del empleado cuando cambia el código
  useEffect(() => {
    if (code.length < 3) {
      setEmployee(null);
      setTodayTimecard(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/timecards-simple?action=get_status&code=${code}`);
        const data = await res.json();

        if (data.success) {
          setEmployee(data.employee);
          setTodayTimecard(data.todayTimecard);
        } else {
          setEmployee(null);
          setTodayTimecard(null);
        }
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [code]);

  // Marcar ENTRADA
  const handleClockIn = async () => {
    if (!code.trim()) {
      setMessage({ text: 'Ingresa tu código', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: 'success' });

    try {
      const res = await fetch('/api/timecards-simple?action=clock_in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        setEmployee(data.employee);
        setTodayTimecard(data.timecard);
      } else {
        setMessage({ text: data.error, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error al marcar entrada', type: 'error' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Marcar SALIDA
  const handleClockOut = async () => {
    if (!code.trim()) {
      setMessage({ text: 'Ingresa tu código', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: 'success' });

    try {
      const res = await fetch('/api/timecards-simple?action=clock_out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        setTodayTimecard(data.timecard);
      } else {
        setMessage({ text: data.error, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error al marcar salida', type: 'error' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const hasEntry = todayTimecard?.timeIn;
  const hasExit = todayTimecard?.timeOut;
  const isWorking = hasEntry && !hasExit;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🕐 Control de Asistencia</h1>
          <p className="text-gray-600 text-sm">Marca tu entrada y salida</p>
          
          {/* Reloj en tiempo real */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
              Hora Local Ecuador
            </p>
            <p className="text-sm font-bold text-gray-800">{currentTime || 'Cargando...'}</p>
          </div>
        </div>

        {/* Input código */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tu Código Personal
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ej: AAR2025"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-xl font-bold uppercase focus:border-blue-500 focus:outline-none"
          />
          
          {employee && (
            <div className="mt-2 p-2 bg-green-50 rounded border border-green-200 text-center">
              <p className="text-sm font-semibold text-green-700">✓ {employee.name}</p>
              {employee.position && (
                <p className="text-xs text-green-600">{employee.position}</p>
              )}
            </div>
          )}
        </div>

        {/* Mensaje */}
        {message.text && (
          <div className={`mb-4 p-3 rounded-lg text-center ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Botones */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={handleClockIn}
            disabled={loading || hasEntry}
            className={`py-4 rounded-lg font-bold text-white transition-all ${
              hasEntry
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 active:scale-95'
            }`}
          >
            ✅ Entrada
          </button>
          
          <button
            onClick={handleClockOut}
            disabled={loading || !hasEntry || hasExit}
            className={`py-4 rounded-lg font-bold text-white transition-all ${
              !hasEntry || hasExit
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 active:scale-95'
            }`}
          >
            🚪 Salida
          </button>
        </div>

        {/* Estado hoy */}
        {todayTimecard && (
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4">📍 Hoy</h3>
            
            <div className="space-y-3 text-sm">
              {hasEntry && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Entrada:</span>
                  <span className="font-semibold text-green-600">
                    {formatEcuadorTime(todayTimecard.timeIn)}
                  </span>
                </div>
              )}
              
              {hasExit && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Salida:</span>
                  <span className="font-semibold text-red-600">
                    {formatEcuadorTime(todayTimecard.timeOut)}
                  </span>
                </div>
              )}
              
              {todayTimecard.hoursWorked !== null && todayTimecard.hoursWorked !== undefined && (
                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="text-gray-600">Horas trabajadas:</span>
                  <span className="font-mono font-bold text-blue-600">
                    {(typeof todayTimecard.hoursWorked === 'number' ? todayTimecard.hoursWorked : parseFloat(todayTimecard.hoursWorked) || 0).toFixed(2)}h
                  </span>
                </div>
              )}
              
              {isWorking && (
                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="text-gray-600">En progreso:</span>
                  <span className="font-mono font-bold text-blue-600 animate-pulse">
                    ⏳ {hoursInProgress}h
                  </span>
                </div>
              )}
            </div>
            
            {!hasEntry && (
              <p className="text-center text-gray-500 italic mt-2">
                Aún no has marcado entrada
              </p>
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            📞 ¿Problemas? Contacta al administrador
          </p>
        </div>
      </div>
    </div>
  );
};
