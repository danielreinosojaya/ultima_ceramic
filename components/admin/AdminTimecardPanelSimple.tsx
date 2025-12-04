/**
 * ============================================
 * PANEL ADMIN SIMPLIFICADO - MARCACIÓN
 * ============================================
 * 
 * FUNCIONALIDAD:
 * 1. Ver todos los empleados y su estado hoy
 * 2. Ver historial individual de cada empleado
 * 3. Gestionar empleados (crear, activar/desactivar)
 */

import React, { useState, useEffect } from 'react';

// ============================================
// TIPOS
// ============================================

interface Employee {
  id: number;
  code: string;
  name: string;
  position?: string;
  status: 'active' | 'inactive';
}

interface Timecard {
  id: number;
  employeeId: number;
  date: string;
  timeIn: string;
  timeOut?: string;
  hoursWorked?: number;
}

interface EmployeeStatus extends Employee {
  todayTimecard?: Timecard;
}

// ============================================
// UTILIDADES
// ============================================

function formatEcuadorTime(utcTimestamp: string | null): string {
  if (!utcTimestamp) return '-';
  
  try {
    const date = new Date(utcTimestamp);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleTimeString('es-EC', {
      timeZone: 'America/Guayaquil',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '-';
  }
}

function formatEcuadorDate(dateString: string): string {
  if (!dateString) return '-';
  
  try {
    let dateOnly = dateString;
    
    // Si viene como ISO timestamp, extraer solo la fecha
    if (dateString.includes('T')) {
      dateOnly = dateString.split('T')[0];
    }
    
    // Validar formato YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return dateOnly; // Retornar tal cual
    }
    
    const [year, month, day] = dateOnly.split('-').map(Number);
    
    // Validar números
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return dateOnly;
    }
    
    const date = new Date(year, month - 1, day);
    
    // Verificar fecha válida
    if (isNaN(date.getTime())) {
      return dateOnly;
    }
    
    return date.toLocaleDateString('es-EC', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}

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

interface AdminTimecardPanelSimpleProps {
  adminCode: string;
}

export const AdminTimecardPanelSimple: React.FC<AdminTimecardPanelSimpleProps> = ({ adminCode }) => {
  const [tab, setTab] = useState<'dashboard' | 'employees'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeStatus[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [history, setHistory] = useState<Timecard[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Estados para crear empleado
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ code: '', name: '', position: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' }>({ text: '', type: 'success' });

  // Reloj en tiempo real
  const [currentTime, setCurrentTime] = useState('');
  const [hoursInProgressMap, setHoursInProgressMap] = useState<Record<number, string>>({});

  // Actualizar reloj y horas en progreso cada segundo
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

      // Actualizar horas en progreso
      const newMap: Record<number, string> = {};
      employees.forEach(emp => {
        if (emp.todayTimecard?.timeIn && !emp.todayTimecard?.timeOut) {
          newMap[emp.id] = calculateHoursInProgress(emp.todayTimecard.timeIn);
        }
      });
      setHoursInProgressMap(newMap);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [employees]);

  // Cargar empleados con estado hoy
  const loadEmployees = async () => {
    setLoading(true);
    try {
      // Obtener todos los empleados
      const empRes = await fetch('/api/timecards-simple?action=get_all_employees');
      const empData = await empRes.json();

      if (!empData.success) {
        throw new Error(empData.error);
      }

      const allEmployees: Employee[] = empData.employees;

      // Obtener estado de hoy para cada empleado
      const employeesWithStatus: EmployeeStatus[] = await Promise.all(
        allEmployees.map(async (emp) => {
          try {
            const statusRes = await fetch(`/api/timecards-simple?action=get_status&code=${emp.code}`);
            const statusData = await statusRes.json();

            return {
              ...emp,
              todayTimecard: statusData.success ? statusData.todayTimecard : undefined
            };
          } catch {
            return { ...emp };
          }
        })
      );

      setEmployees(employeesWithStatus);
    } catch (error) {
      console.error('Error loading employees:', error);
      setMessage({ text: 'Error al cargar empleados', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Cargar historial de empleado
  const loadHistory = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setHistoryLoading(true);
    
    try {
      const res = await fetch(`/api/timecards-simple?action=get_history&code=${employee.code}&limit=60`);
      const data = await res.json();

      if (data.success) {
        setHistory(data.history);
      } else {
        setMessage({ text: data.error, type: 'error' });
      }
    } catch (error) {
      console.error('Error loading history:', error);
      setMessage({ text: 'Error al cargar historial', type: 'error' });
    } finally {
      setHistoryLoading(false);
    }
  };

  // Crear empleado
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.code.trim() || !createForm.name.trim()) {
      setMessage({ text: 'Código y nombre son requeridos', type: 'error' });
      return;
    }

    setCreateLoading(true);
    setMessage({ text: '', type: 'success' });

    try {
      const res = await fetch('/api/timecards-simple?action=create_employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: createForm.code.toUpperCase(),
          name: createForm.name,
          position: createForm.position
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: 'Empleado creado correctamente', type: 'success' });
        setCreateForm({ code: '', name: '', position: '' });
        setShowCreateModal(false);
        loadEmployees(); // Recargar lista
      } else {
        setMessage({ text: data.error, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error al crear empleado', type: 'error' });
      console.error(error);
    } finally {
      setCreateLoading(false);
    }
  };

  // Cambiar estado de empleado (activar/desactivar)
  const toggleEmployeeStatus = async (employee: Employee) => {
    const newStatus = employee.status === 'active' ? 'inactive' : 'active';
    
    try {
      const res = await fetch('/api/timecards-simple?action=update_employee_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          status: newStatus
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ 
          text: `Empleado ${newStatus === 'active' ? 'activado' : 'desactivado'}`, 
          type: 'success' 
        });
        loadEmployees();
      } else {
        setMessage({ text: data.error, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error al actualizar empleado', type: 'error' });
      console.error(error);
    }
  };

  // Cargar al iniciar
  useEffect(() => {
    loadEmployees();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadEmployees, 30000);
    return () => clearInterval(interval);
  }, []);

  // Limpiar mensaje después de 5 segundos
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: '', type: 'success' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderEmployeeStatusBadge = (emp: EmployeeStatus) => {
    const timecard = emp.todayTimecard;
    
    if (!timecard) {
      return <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">Sin marcar</span>;
    }
    
    if (timecard.timeIn && !timecard.timeOut) {
      return <span className="px-2 py-1 bg-green-500 text-white text-xs rounded animate-pulse">🟢 Trabajando</span>;
    }
    
    if (timecard.timeOut) {
      return <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">✓ Completado</span>;
    }
    
    return <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">-</span>;
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">📊 Admin Marcación</h1>
              <p className="text-sm text-gray-500 mt-1">{currentTime}</p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              ➕ Nuevo Empleado
            </button>
          </div>
        </div>
      </div>

      {/* Mensaje */}
      {message.text && (
        <div className={`max-w-7xl mx-auto px-4 mt-4`}>
          <div className={`p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex space-x-1 bg-gray-200 rounded-lg p-1">
          <button
            onClick={() => setTab('dashboard')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              tab === 'dashboard'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📍 Estado Hoy
          </button>
          
          <button
            onClick={() => setTab('employees')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              tab === 'employees'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            👥 Todos los Empleados
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* TAB: Dashboard - Estado Hoy */}
        {tab === 'dashboard' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <p className="text-sm text-gray-600">Trabajando ahora</p>
                <p className="text-3xl font-bold text-green-600">
                  {employees.filter(e => e.todayTimecard?.timeIn && !e.todayTimecard?.timeOut).length}
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <p className="text-sm text-gray-600">Completaron hoy</p>
                <p className="text-3xl font-bold text-blue-600">
                  {employees.filter(e => e.todayTimecard?.timeOut).length}
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <p className="text-sm text-gray-600">Sin marcar</p>
                <p className="text-3xl font-bold text-gray-400">
                  {employees.filter(e => !e.todayTimecard).length}
                </p>
              </div>
            </div>

            {/* Lista empleados trabajando */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Empleado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Entrada</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Salida</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Horas</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employees
                    .filter(e => e.status === 'active')
                    .sort((a, b) => {
                      // Prioridad: trabajando > completado > sin marcar
                      const aWorking = a.todayTimecard?.timeIn && !a.todayTimecard?.timeOut ? 2 : 0;
                      const bWorking = b.todayTimecard?.timeIn && !b.todayTimecard?.timeOut ? 2 : 0;
                      const aCompleted = a.todayTimecard?.timeOut ? 1 : 0;
                      const bCompleted = b.todayTimecard?.timeOut ? 1 : 0;
                      return (bWorking + bCompleted) - (aWorking + aCompleted);
                    })
                    .map(emp => {
                      const tc = emp.todayTimecard;
                      const isWorking = tc?.timeIn && !tc?.timeOut;

                      return (
                        <tr key={emp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-800">{emp.name}</p>
                              {emp.position && <p className="text-xs text-gray-500">{emp.position}</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{emp.code}</code>
                          </td>
                          <td className="px-4 py-3">
                            {renderEmployeeStatusBadge(emp)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {tc?.timeIn ? (
                              <span className="font-mono text-green-700">
                                {formatEcuadorTime(tc.timeIn)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {tc?.timeOut ? (
                              <span className="font-mono text-red-700">
                                {formatEcuadorTime(tc.timeOut)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {isWorking ? (
                              <span className="font-mono font-bold text-blue-600 animate-pulse">
                                ⏳ {hoursInProgressMap[emp.id] || '0.00'}h
                              </span>
                            ) : tc?.hoursWorked !== null && tc?.hoursWorked !== undefined ? (
                              <span className="font-mono font-bold text-blue-600">
                                {tc.hoursWorked.toFixed(2)}h
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => loadHistory(emp)}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Ver historial →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              
              {employees.filter(e => e.status === 'active').length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No hay empleados activos
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Todos los Empleados */}
        {tab === 'employees' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cargo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{emp.name}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{emp.code}</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{emp.position || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        emp.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {emp.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <button
                        onClick={() => loadHistory(emp)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Historial
                      </button>
                      <button
                        onClick={() => toggleEmployeeStatus(emp)}
                        className={`text-sm ${
                          emp.status === 'active'
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {emp.status === 'active' ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Crear Empleado */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Crear Nuevo Empleado</h3>
            
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Código *</label>
                <input
                  type="text"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                  placeholder="Ej: AAR2025"
                  className="w-full px-3 py-2 border rounded-lg uppercase"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Nombre *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Nombre completo"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Cargo (opcional)</label>
                <input
                  type="text"
                  value={createForm.position}
                  onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
                  placeholder="Ej: Instructor"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={createLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={createLoading}
                >
                  {createLoading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Historial de Empleado */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{selectedEmployee.name}</h3>
                  <p className="text-sm text-gray-500">
                    Código: <code className="bg-gray-100 px-2 py-1 rounded">{selectedEmployee.code}</code>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              {historyLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Cargando historial...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay registros
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Fecha</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Entrada</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Salida</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {history.map(record => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {formatEcuadorDate(record.date)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-green-700">
                          {formatEcuadorTime(record.timeIn)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-red-700">
                          {formatEcuadorTime(record.timeOut)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono font-bold text-blue-600">
                          {record.hoursWorked !== null && record.hoursWorked !== undefined
                            ? `${record.hoursWorked.toFixed(2)}h`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
