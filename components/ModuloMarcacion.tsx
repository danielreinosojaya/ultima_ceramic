import React, { useState, useEffect } from 'react';
import type { Employee, ClockInResponse, ClockOutResponse, Timecard } from '../types/timecard';
import { fetchWithAbort } from '../utils/fetchWithAbort';
import { useGeolocation } from '../hooks/useGeolocation';

// Helper para formatear timestamps ISO a hora local de Ecuador (America/Guayaquil)
// El backend ahora guarda timestamps UTC puros, convertir a hora local de Ecuador
const formatTimestamp = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    
    // ✅ SOLUCIÓN CORRECTA: Usar toLocaleTimeString con timezone de Ecuador
    // Esto convierte automáticamente UTC → America/Guayaquil
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Guayaquil',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    
    return date.toLocaleTimeString('es-EC', options);
  } catch (error) {
    console.error('[formatTimestamp] Error:', error);
    return 'Error en hora';
  }
};

// Helper para validar y formatear horas
const formatHours = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num < 0) return null; // Evitar mostrar horas negativas
  // Permitir valores >= 0 (incluyendo 0.00 si es lo que hay)
  // Si trabajó aunque sea 1 segundo, mostrar el valor
  return Number(num).toFixed(2);
};

export const ModuloMarcacion: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' }>({ text: '', type: 'success' });
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [todayStatus, setTodayStatus] = useState<Timecard | null>(null);
  
  // ✅ Hook para geolocalización
  const { coords, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  // ✅ Reloj en tiempo real con hora de Ecuador
  const [currentTime, setCurrentTime] = useState<string>('');

  // Actualizar reloj cada segundo
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const ecuadorTime = now.toLocaleString('es-EC', {
        timeZone: 'America/Guayaquil',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setCurrentTime(ecuadorTime);
    };

    updateClock(); // Ejecutar inmediatamente
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, []);

  // Al cambiar el código, verificar si empleado ya tiene marcación hoy
  useEffect(() => {
    if (!code.trim()) {
      setCurrentEmployee(null);
      setTodayStatus(null);
      setSearching(false);
      return;
    }

    // Validación local: formato típico de código (EMP + 3 dígitos, por ejemplo)
    // Esto evita hacer fetch de códigos claramente inválidos
    if (code.length < 3) {
      // Código muy corto, no hacer búsqueda
      setSearching(false);
      return;
    }

    // Buscar el estado actual del empleado
    const checkEmployeeStatus = async () => {
      setSearching(true);
      try {
        // Usar AbortController para cancelar si el usuario cambia el código
        const result = await fetchWithAbort(
          `employee-status-${code}`,
          `/api/timecards?action=get_employee_report&code=${code}`
        );
        
        if (result.success && result.employee) {
          setCurrentEmployee(result.employee);
          
          // ✅ VALIDAR QUE todayStatus SEA REALMENTE DE HOY
          if (result.todayStatus) {
            // Obtener fecha de hoy en Ecuador
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' }); // YYYY-MM-DD
            const statusDate = result.todayStatus.date; // YYYY-MM-DD
            
            console.log('[checkEmployeeStatus] Validando fecha:', {
              todayEcuador: today,
              statusDate: statusDate,
              isToday: today === statusDate
            });
            
            // Solo mostrar si es de hoy
            if (today === statusDate) {
              setTodayStatus(result.todayStatus);
            } else {
              console.warn('[checkEmployeeStatus] Status no es de hoy, descartando:', { statusDate, today });
              setTodayStatus(null);
            }
          } else {
            setTodayStatus(null);
          }
        } else {
          setCurrentEmployee(null);
          setTodayStatus(null);
        }
      } catch (error) {
        // No mostrar error si fue cancelado (normal)
        if (!(error instanceof Error && error.message === 'Request cancelled')) {
          console.error('Error checking employee status:', error);
        }
        setCurrentEmployee(null);
        setTodayStatus(null);
      } finally {
        setSearching(false);
      }
    };

    // Debounce aumentado a 1000ms para reducir requests de búsqueda agresivamente
    // (Reducir búsquedas de "EMP001" de 6 requests a 1-2)
    const debounceTimer = setTimeout(checkEmployeeStatus, 1000);
    return () => clearTimeout(debounceTimer);
  }, [code]);

  const handleClockIn = async () => {
    if (!code.trim()) {
      setMessage({ text: 'Ingresa tu código', type: 'error' });
      return;
    }

    // ✅ Solicitar geolocalización antes de marcar
    setMessage({ text: 'Obteniendo ubicación...', type: 'success' });
    setLoading(true);

    // Solicitar ubicación - ESPERAR explícitamente
    setMessage({ text: '📍 Obteniendo tu ubicación GPS...', type: 'success' });
    
    let locationObtained = false;
    await new Promise<void>(resolve => {
      requestLocation();
      
      // Crear listener para cambios en coords
      const checkInterval = setInterval(() => {
        if (coords && coords.latitude && coords.longitude) {
          locationObtained = true;
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve();
        }
      }, 200);
      
      // Timeout después de 15 segundos
      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 15000);
    });

    // Si no se obtuvo ubicación, mostrar error claro
    if (!coords?.latitude || !coords?.longitude) {
      setLoading(false);
      setMessage({ 
        text: '❌ No se pudo obtener tu ubicación GPS.\n\n✅ Soluciones:\n1. Abre Configuración → Privacidad → Ubicación\n2. Asegúrate de que el navegador tenga permiso\n3. Intenta en una zona abierta (sin techumbre)\n4. Recarga la página e intenta de nuevo',
        type: 'error' 
      });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: 'success' });

    try {
      // ✅ NO ENVIAR localTime - el backend usa NOW() directamente con timezone de Ecuador
      console.log('[handleClockIn] Enviando solicitud de clock in con ubicación:', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy
      });
      
      const response = await fetch(`/api/timecards?action=clock_in&code=${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code,
          geolocation: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy
          }
        })
      });

      const result = (await response.json()) as any;
      
      console.log('[handleClockIn] Respuesta del servidor:', result);

      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        setCurrentEmployee(result.employee || null);
        
        // Usar la respuesta directa sin refresh innecesario
        // La respuesta de clock_in ya incluye el estado actualizado
        if (result.timestamp) {
          // ✅ FIX: Convertir timestamp a ISO completo, no solo fecha
          // Backend retorna ISO string, usarlo directamente
          const isoTimestamp = typeof result.timestamp === 'string' && result.timestamp.includes('T')
            ? result.timestamp
            : new Date(result.timestamp).toISOString();
          
          const updatedTimecard: Timecard = {
            id: todayStatus?.id || 0,
            employee_id: result.employee?.id || 0,
            date: isoTimestamp.split('T')[0],  // ✅ Derivar fecha de ISO string, no de now()
            time_in: isoTimestamp,
            time_out: undefined,
            hours_worked: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setTodayStatus(updatedTimecard);
        }
      } else {
        // ✅ Mostrar advertencia de geofence si aplicable
        if (result.geofenceCheck) {
          setMessage({ 
            text: `${result.message || 'Error'} (Distancia: ${result.geofenceCheck.distance}m)`, 
            type: 'error' 
          });
        } else {
          setMessage({ text: result.message, type: 'error' });
        }
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

    // ✅ Solicitar geolocalización antes de marcar salida
    setMessage({ text: '📍 Obteniendo tu ubicación GPS...', type: 'success' });
    setLoading(true);

    // Solicitar ubicación - ESPERAR explícitamente
    await new Promise<void>(resolve => {
      requestLocation();
      
      // Crear listener para cambios en coords
      const checkInterval = setInterval(() => {
        if (coords && coords.latitude && coords.longitude) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve();
        }
      }, 200);
      
      // Timeout después de 15 segundos
      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 15000);
    });

    // Si no se obtuvo ubicación, mostrar error claro
    if (!coords?.latitude || !coords?.longitude) {
      setLoading(false);
      setMessage({ 
        text: '❌ No se pudo obtener tu ubicación GPS.\n\n✅ Soluciones:\n1. Abre Configuración → Privacidad → Ubicación\n2. Asegúrate de que el navegador tenga permiso\n3. Intenta en una zona abierta (sin techumbre)\n4. Recarga la página e intenta de nuevo',
        type: 'error' 
      });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: 'success' });

    try {
      // ✅ NO ENVIAR localTime - el backend usa NOW() directamente con timezone de Ecuador
      console.log('[handleClockOut] Enviando solicitud de clock out con ubicación:', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy
      });
      
      const response = await fetch(`/api/timecards?action=clock_out&code=${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code,
          geolocation: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy
          }
        })
      });

      const result = (await response.json()) as any;

      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        
        // Usar la respuesta directa sin refresh innecesario
        // La respuesta de clock_out ya incluye horas_worked calculadas
        if (todayStatus && result.timestamp) {
          // Convertir timestamp "YYYY-MM-DD HH:MM:SS" a ISO "YYYY-MM-DDTHH:MM:SS.000Z"
          const isoTimestamp = result.timestamp.replace(' ', 'T') + '.000Z';
          
          const updatedTimecard: Timecard = {
            ...todayStatus,
            time_out: isoTimestamp,
            hours_worked: result.hours_worked,
            updated_at: isoTimestamp
          };
          setTodayStatus(updatedTimecard);
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

  const timeIn = todayStatus?.timeIn || todayStatus?.time_in;
  const timeOut = todayStatus?.timeOut || todayStatus?.time_out;
  const isCheckedIn = timeIn && !timeOut;
  const isCheckedOut = timeIn && timeOut;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-background to-brand-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-brand-primary mb-2">🕐 Control de Asistencia</h1>
          <p className="text-brand-secondary text-sm">Marca tu entrada y salida</p>
          
          {/* ✅ RELOJ EN TIEMPO REAL - HORA DE ECUADOR */}
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Hora Local Ecuador</p>
            <p className="text-base font-bold text-gray-800 font-mono">{currentTime || 'Cargando...'}</p>
          </div>
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
                    {timeIn && formatTimestamp(timeIn)}
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
              {(todayStatus.timeIn || todayStatus.time_in) && (
                <div className="flex justify-between">
                  <span className="text-brand-secondary">Entrada:</span>
                  <span className="font-mono font-semibold text-green-600">
                    {formatTimestamp(todayStatus.timeIn || todayStatus.time_in!)}
                  </span>
                </div>
              )}
              {(todayStatus.timeOut || todayStatus.time_out) && (
                <div className="flex justify-between">
                  <span className="text-brand-secondary">Salida:</span>
                  <span className="font-mono font-semibold text-red-600">
                    {formatTimestamp(todayStatus.timeOut || todayStatus.time_out!)}
                  </span>
                </div>
              )}
              {(todayStatus.hoursWorked || todayStatus.hours_worked) && (
                <div className="flex justify-between pt-2 border-t border-brand-border/50">
                  <span className="text-brand-secondary">Horas trabajadas:</span>
                  <span className="font-mono font-bold text-brand-primary">
                    {formatHours(todayStatus.hoursWorked || todayStatus.hours_worked) || '0.00'}h
                  </span>
                </div>
              )}
              {!(todayStatus.timeIn || todayStatus.time_in) && (
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
