import React, { useState, useEffect } from 'react';
import type { AdminDashboardStats, Employee, Timecard } from '../../types/timecard';
import { TardanzasView } from './TardanzasView';
import { EmployeeScheduleManager } from './EmployeeScheduleManager';
import { MonthlyReportViewer } from './MonthlyReportViewer';
import { GeofenceManager } from './GeofenceManager';
import { fetchWithAbort } from '../../utils/fetchWithAbort';
import { formatLocalTimeFromUTC, calculateHoursInProgress, calculateHoursInProgressReadable, calculateHoursInProgressWithStatus } from '../../utils/formatters';

interface AdminTimecardPanelProps {
  adminCode: string;
}

export const AdminTimecardPanel: React.FC<AdminTimecardPanelProps> = ({ adminCode }) => {
  const [dashboard, setDashboard] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'history' | 'tardanzas' | 'reportes' | 'geofences'>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeHistory, setEmployeeHistory] = useState<Timecard[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEmployeeForm, setNewEmployeeForm] = useState({ code: '', name: '', email: '', position: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Estados para edición y eliminación
  const [editingTimecard, setEditingTimecard] = useState<Timecard | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ time_in: '', time_out: '', notes: '' });
  const [confirmDeleteTimecard, setConfirmDeleteTimecard] = useState<Timecard | null>(null);
  const [confirmDeleteEmployee, setConfirmDeleteEmployee] = useState<Employee | null>(null);

  // Estados para schedule manager
  const [showScheduleManager, setShowScheduleManager] = useState(false);
  const [selectedEmployeeForSchedule, setSelectedEmployeeForSchedule] = useState<Employee | null>(null);

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

  // Cargar dashboard
  useEffect(() => {
    if (!adminCode) return;
    
    loadDashboard();
    
    // Smart polling con AbortController para cancelar fetches pendientes
    const abortController = new AbortController();
    let isActive = true;
    let pollTimer: NodeJS.Timeout | null = null;
    
    const schedulePoll = () => {
      if (!isActive) return;
      
      // Determinar intervalo basado en estado actual
      let nextInterval = 300000; // Default 5 minutos
      
      if (dashboard?.employees_status) {
        const inProgressCount = dashboard.employees_status.filter((e: any) => e.status === 'in_progress').length;
        const presentCount = dashboard.employees_status.filter((e: any) => e.status === 'present').length;
        
        if (inProgressCount > 0) {
          // Hay empleados trabajando: poll cada 30 segundos
          nextInterval = 30000;
        } else if (presentCount > 0) {
          // Hay empleados presentes: poll cada 2 minutos
          nextInterval = 120000;
        } else {
          // Nadie activo: poll cada 5 minutos
          nextInterval = 300000;
        }
      }
      
      // Cancelar timer anterior si existe
      if (pollTimer) clearTimeout(pollTimer);
      
      // Programar siguiente poll
      pollTimer = setTimeout(() => {
        if (isActive) {
          loadDashboard();
          schedulePoll(); // Programar siguiente
        }
      }, nextInterval);
    };
    
    // Programar primer poll después de carga inicial
    schedulePoll();
    
    return () => {
      isActive = false;
      if (pollTimer) clearTimeout(pollTimer);
      abortController.abort(); // Cancelar todas las fetches pendientes
    };
  }, [adminCode]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // ✅ Agregar timestamp para evitar caché
      const timestamp = Date.now();
      const result = await fetchWithAbort(
        'admin-dashboard-stats',
        `/api/timecards?action=get_admin_dashboard&adminCode=${adminCode}&_t=${timestamp}`
      );
      if (result.success) {
        console.log('[AdminTimecardPanel] Dashboard data received:', {
          total: result.data.total_employees,
          activeToday: result.data.active_today,
          employeesWithData: result.data.employees_status.filter((e: any) => e.time_in).length
        });
        setDashboard(result.data);
      }
    } catch (error) {
      if (!(error instanceof Error && error.message === 'Request cancelled')) {
        console.error('Error loading dashboard:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const result = await fetchWithAbort(
        'admin-employees-list',
        `/api/timecards?action=list_employees&adminCode=${adminCode}`
      );
      if (result.success) {
        setEmployees(result.data);
      }
    } catch (error) {
      if (!(error instanceof Error && error.message === 'Request cancelled')) {
        console.error('Error loading employees:', error);
      }
    }
  };

  const loadEmployeeHistory = async (employeeId: number) => {
    setHistoryLoading(true);
    try {
      // ✅ Obtener fecha de Ecuador usando timezone específico
      const ecuadorDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' }); // YYYY-MM-DD
      
      // Extraer año y mes de ecuadorDate
      const [year, month] = ecuadorDate.split('-');
      
      // Primer día del mes en formato YYYY-MM-DD
      const startDate = `${year}-${month}-01`;
      const today = ecuadorDate;

      const response = await fetch(
        `/api/timecards?action=get_timecard_history&adminCode=${adminCode}&employeeId=${employeeId}&startDate=${startDate}&endDate=${today}`
      );
      const result = await response.json();
      if (result.success) {
        setEmployeeHistory(result.data);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const downloadReport = async (format: 'csv' | 'pdf') => {
    // ✅ Obtener fecha de Ecuador usando timezone específico
    const ecuadorDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' }); // YYYY-MM-DD
    
    // Extraer año y mes de ecuadorDate
    const [year, month] = ecuadorDate.split('-');
    
    // Primer día del mes en formato YYYY-MM-DD
    const startDate = `${year}-${month}-01`;
    const endDate = ecuadorDate;

    try {
      const response = await fetch(
        `/api/timecards?action=download_report&adminCode=${adminCode}&format=${format}&startDate=${startDate}&endDate=${endDate}`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `asistencia_${ecuadorDate}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const handleCreateEmployee = async () => {
    if (!newEmployeeForm.code.trim() || !newEmployeeForm.name.trim()) {
      setCreateMessage({ text: 'Código y nombre son requeridos', type: 'error' });
      return;
    }

    setCreateLoading(true);
    setCreateMessage(null);

    try {
      const response = await fetch(`/api/timecards?action=create_employee&adminCode=${adminCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newEmployeeForm.code.toUpperCase(),
          name: newEmployeeForm.name,
          email: newEmployeeForm.email || null,
          position: newEmployeeForm.position || null
        })
      });

      const result = await response.json();

      if (result.success) {
        // Agregar el nuevo empleado a la lista inmediatamente (optimistic update)
        const newEmployee = result.data as Employee;
        setEmployees(prev => [...prev, newEmployee]);
        
        setCreateMessage({ text: `✅ Empleado ${newEmployeeForm.name} creado exitosamente`, type: 'success' });
        setNewEmployeeForm({ code: '', name: '', email: '', position: '' });
        
        // Cerrar modal después de mostrar el mensaje
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setCreateMessage(null);
          // Recargar empleados para asegurar sincronización
          loadEmployees();
        }, 1500);
      } else {
        setCreateMessage({ text: result.error || 'Error al crear empleado', type: 'error' });
      }
    } catch (error) {
      setCreateMessage({ text: 'Error al crear empleado', type: 'error' });
      console.error('Error:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteTimecard = async (timecard: Timecard) => {
    try {
      const response = await fetch(
        `/api/timecards?action=delete_timecard&adminCode=${adminCode}&timecardId=${timecard.id}`,
        { method: 'POST' }
      );

      const result = await response.json();

      if (result.success) {
        // Eliminar de la lista local
        setEmployeeHistory(prev => prev.filter(t => t.id !== timecard.id));
        setConfirmDeleteTimecard(null);
        alert('✅ Marcación eliminada correctamente');
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert('❌ Error al eliminar marcación');
      console.error('Error:', error);
    }
  };

  const handleUpdateTimecard = async () => {
    if (!editingTimecard) return;

    try {
      const response = await fetch(
        `/api/timecards?action=update_timecard&adminCode=${adminCode}&timecardId=${editingTimecard.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            time_in: editForm.time_in || undefined,
            time_out: editForm.time_out || undefined,
            notes: editForm.notes || undefined
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        // Actualizar en la lista local
        setEmployeeHistory(prev =>
          prev.map(t => (t.id === editingTimecard.id ? (result.data as Timecard) : t))
        );
        setIsEditModalOpen(false);
        setEditingTimecard(null);
        alert('✅ Marcación actualizada correctamente');
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert('❌ Error al actualizar marcación');
      console.error('Error:', error);
    }
  };

  const handleDeleteEmployee = async (employee: Employee, hardDelete: boolean = false) => {
    try {
      const action = hardDelete ? 'hard_delete_employee' : 'delete_employee';
      const response = await fetch(
        `/api/timecards?action=${action}&adminCode=${adminCode}&employeeId=${employee.id}`,
        { method: 'POST' }
      );

      const result = await response.json();

      if (result.success) {
        // Eliminar de la lista local
        setEmployees(prev => prev.filter(e => e.id !== employee.id));
        setConfirmDeleteEmployee(null);
        setSelectedEmployee(null);
        setEmployeeHistory([]);
        alert(`✅ ${hardDelete ? 'Empleado eliminado permanentemente' : 'Empleado desactivado'}`);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert('❌ Error al eliminar empleado');
      console.error('Error:', error);
    }
  };

  const openEditTimecard = (timecard: Timecard) => {
    setEditingTimecard(timecard);
    setEditForm({
      time_in: timecard.time_in ? new Date(timecard.time_in).toISOString().slice(0, 16) : '',
      time_out: timecard.time_out ? new Date(timecard.time_out).toISOString().slice(0, 16) : '',
      notes: timecard.notes || ''
    });
    setIsEditModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-brand-secondary">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-brand-primary mb-2">📊 Control de Asistencia</h1>
          <p className="text-brand-secondary">Panel de administración de marcaciones</p>
          
          {/* ✅ RELOJ EN TIEMPO REAL - HORA DE ECUADOR */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🕐</div>
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Hora Local Ecuador (GMT-5)</p>
                <p className="text-lg font-bold text-gray-800 font-mono">{currentTime || 'Cargando...'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-brand-border">
          {(['dashboard', 'employees', 'history', 'tardanzas', 'reportes', 'geofences'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                // Cargar datos cuando se cambia a tab
                if (tab === 'employees') {
                  loadEmployees();
                }
              }}
              className={`px-6 py-3 font-semibold rounded-t-lg transition-all ${
                activeTab === tab
                  ? 'bg-brand-primary text-white border-b-2 border-brand-primary'
                  : 'text-brand-secondary hover:text-brand-primary'
              }`}
            >
              {tab === 'dashboard' && '📈 Dashboard'}
              {tab === 'employees' && '👥 Empleados'}
              {tab === 'history' && '📋 Historial'}
              {tab === 'tardanzas' && '⏰ Tardanzas'}
              {tab === 'reportes' && '📊 Reportes'}
              {tab === 'geofences' && '📍 Ubicaciones'}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard label="Total Empleados" value={dashboard.total_employees} icon="👥" color="blue" />
              <StatsCard label="Presentes Hoy" value={dashboard.active_today} icon="✅" color="green" />
              <StatsCard label="Ausentes" value={dashboard.absent_today} icon="❌" color="red" />
              <StatsCard label="Tardanzas" value={dashboard.late_today} icon="⏰" color="yellow" />
            </div>

            {/* Promedio de horas */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-brand-border/50">
              <p className="text-sm text-brand-secondary mb-2">Promedio de horas hoy</p>
              <p className="text-4xl font-bold text-brand-primary">{dashboard.average_hours_today}h</p>
            </div>

            {/* Tabla de empleados */}
            <div className="bg-white rounded-lg shadow-sm border border-brand-border/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-brand-border/50 bg-brand-surface">
                <h3 className="font-bold text-brand-text">Estado Actual de Empleados</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-brand-surface border-b border-brand-border/50">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-brand-text">Empleado</th>
                      <th className="px-6 py-3 text-left font-semibold text-brand-text">Código</th>
                      <th className="px-6 py-3 text-left font-semibold text-brand-text">Entrada</th>
                      <th className="px-6 py-3 text-left font-semibold text-brand-text">Salida</th>
                      <th className="px-6 py-3 text-left font-semibold text-brand-text">Horas</th>
                      <th className="px-6 py-3 text-center font-semibold text-brand-text">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.employees_status.map((emp, idx) => (
                      <tr key={idx} className="border-b border-brand-border/30 hover:bg-brand-surface/50">
                        <td className="px-6 py-4">{emp.employee.name}</td>
                        <td className="px-6 py-4 font-mono text-sm">{emp.employee.code}</td>
                        <td className="px-6 py-4">{formatLocalTimeFromUTC(emp.time_in)}</td>
                        <td className="px-6 py-4">{formatLocalTimeFromUTC(emp.time_out)}</td>
                        <td className="px-6 py-4 font-mono">
                          {emp.hours_worked !== null && emp.hours_worked !== undefined && typeof emp.hours_worked === 'number'
                            ? `${emp.hours_worked.toFixed(2)}h`
                            : emp.hours_worked !== null && emp.hours_worked !== undefined
                            ? `${Number(emp.hours_worked).toFixed(2)}h`
                            : emp.time_in && !emp.time_out && emp.status === 'in_progress'
                            ? `⏳ ${calculateHoursInProgress(emp.time_in)}h (${calculateHoursInProgressReadable(emp.time_in)})`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              emp.status === 'present'
                                ? 'bg-green-100 text-green-800'
                                : emp.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : emp.status === 'late'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {emp.status === 'present' && '✅ Presente'}
                            {emp.status === 'in_progress' && '⏳ En progreso'}
                            {emp.status === 'late' && '⏰ Tardanza'}
                            {emp.status === 'absent' && '❌ Ausente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Botones de descarga */}
            <div className="flex gap-4">
              <button
                onClick={() => downloadReport('csv')}
                className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors"
              >
                📥 Descargar CSV
              </button>
              <button
                onClick={loadDashboard}
                className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors"
              >
                🔄 Actualizar
              </button>
            </div>
          </div>
        )}

        {/* EMPLOYEES TAB */}
        {activeTab === 'employees' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-brand-text">Gestión de Empleados ({employees.length})</h2>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors"
              >
                ➕ Nuevo Empleado
              </button>
            </div>
            
            {employees.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-brand-border/50 p-8 text-center">
                <p className="text-brand-secondary mb-4">No hay empleados registrados</p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:opacity-90"
                >
                  Crear el primer empleado
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-brand-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-brand-surface border-b border-brand-border/50">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-brand-text">Código</th>
                        <th className="px-6 py-3 text-left font-semibold text-brand-text">Nombre</th>
                        <th className="px-6 py-3 text-left font-semibold text-brand-text">Puesto</th>
                        <th className="px-6 py-3 text-left font-semibold text-brand-text">Estado</th>
                        <th className="px-6 py-3 text-left font-semibold text-brand-text">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map(emp => (
                        <tr key={emp.id} className="border-b border-brand-border/30 hover:bg-brand-surface/50">
                          <td className="px-6 py-4 font-mono font-bold text-brand-primary">{emp.code}</td>
                          <td className="px-6 py-4">{emp.name}</td>
                          <td className="px-6 py-4 text-brand-secondary">{emp.position || '-'}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                emp.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {emp.status === 'active' ? '✅ Activo' : '❌ Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedEmployeeForSchedule(emp);
                                  setShowScheduleManager(true);
                                }}
                                className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-xs font-semibold"
                              >
                                ⏱️ Horarios
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  loadEmployeeHistory(emp.id);
                                  setActiveTab('history');
                                }}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-semibold"
                              >
                                📋 Historial
                              </button>
                              <button
                                onClick={() => setConfirmDeleteEmployee(emp)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-semibold"
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL: Crear Empleado */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-brand-text mb-6">➕ Nuevo Empleado</h2>

              {createMessage && (
                <div
                  className={`p-3 rounded-lg mb-4 text-sm font-semibold ${
                    createMessage.type === 'success'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {createMessage.text}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-brand-secondary mb-2">Código (EMP001, EMP002, etc)</label>
                  <input
                    type="text"
                    value={newEmployeeForm.code}
                    onChange={e => setNewEmployeeForm({ ...newEmployeeForm, code: e.target.value.toUpperCase() })}
                    placeholder="EMP001"
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none"
                    disabled={createLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-secondary mb-2">Nombre Completo*</label>
                  <input
                    type="text"
                    value={newEmployeeForm.name}
                    onChange={e => setNewEmployeeForm({ ...newEmployeeForm, name: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none"
                    disabled={createLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-secondary mb-2">Email</label>
                  <input
                    type="email"
                    value={newEmployeeForm.email}
                    onChange={e => setNewEmployeeForm({ ...newEmployeeForm, email: e.target.value })}
                    placeholder="juan@example.com"
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none"
                    disabled={createLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-secondary mb-2">Puesto/Cargo</label>
                  <input
                    type="text"
                    value={newEmployeeForm.position}
                    onChange={e => setNewEmployeeForm({ ...newEmployeeForm, position: e.target.value })}
                    placeholder="Ej: Instructor, Asistente"
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none"
                    disabled={createLoading}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setNewEmployeeForm({ code: '', name: '', email: '', position: '' });
                    setCreateMessage(null);
                  }}
                  disabled={createLoading}
                  className="flex-1 px-4 py-2 border border-brand-border text-brand-text font-semibold rounded-lg hover:bg-brand-surface transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateEmployee}
                  disabled={createLoading}
                  className="flex-1 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {createLoading ? '⏳ Creando...' : '✅ Crear'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {selectedEmployee && (
              <>
                <div className="bg-brand-primary text-white rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-2">{selectedEmployee.name}</h2>
                  <p className="text-brand-secondary">Código: {selectedEmployee.code}</p>
                </div>

                {historyLoading ? (
                  <div className="text-center py-8">
                    <p className="text-brand-secondary">Cargando historial...</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-brand-border/50 overflow-hidden">
                    {employeeHistory.length === 0 ? (
                      <div className="text-center py-8 text-brand-secondary">Sin registros este mes</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-brand-surface border-b border-brand-border/50">
                            <tr>
                              <th className="px-6 py-3 text-left font-semibold text-brand-text">Fecha</th>
                              <th className="px-6 py-3 text-left font-semibold text-brand-text">Entrada</th>
                              <th className="px-6 py-3 text-left font-semibold text-brand-text">Salida</th>
                              <th className="px-6 py-3 text-left font-semibold text-brand-text">Horas</th>
                              <th className="px-6 py-3 text-center font-semibold text-brand-text">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employeeHistory.map(record => (
                              <tr key={record.id} className="border-b border-brand-border/30 hover:bg-brand-surface/50">
                                <td className="px-6 py-4">{new Date(record.date).toLocaleDateString('es-ES')}</td>
                                <td className="px-6 py-4">
                                  {record.time_in
                                    ? new Date(record.time_in).toLocaleTimeString('es-EC', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone: 'America/Guayaquil'
                                      })
                                    : '-'}
                                </td>
                                <td className="px-6 py-4">
                                  {record.time_out
                                    ? new Date(record.time_out).toLocaleTimeString('es-EC', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone: 'America/Guayaquil'
                                      })
                                    : '-'}
                                </td>
                                <td className="px-6 py-4 font-mono font-bold">
                                  {record.hours_worked !== null && record.hours_worked !== undefined && typeof record.hours_worked === 'number' 
                                    ? `${record.hours_worked.toFixed(2)}h`
                                    : record.hours_worked !== null && record.hours_worked !== undefined ? `${Number(record.hours_worked).toFixed(2)}h` : '-'}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex gap-2 justify-center">
                                    <button
                                      onClick={() => openEditTimecard(record)}
                                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-semibold"
                                    >
                                      ✏️ Editar
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteTimecard(record)}
                                      className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-semibold"
                                    >
                                      🗑️ Eliminar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TARDANZAS TAB */}
        {activeTab === 'tardanzas' && (
          <TardanzasView adminCode={adminCode} />
        )}

        {/* REPORTES TAB */}
        {activeTab === 'reportes' && (
          <MonthlyReportViewer adminCode={adminCode} />
        )}

        {/* GEOFENCES TAB */}
        {activeTab === 'geofences' && (
          <GeofenceManager adminCode={adminCode} />
        )}

        {/* MODAL: Editar Marcación */}
        {isEditModalOpen && editingTimecard && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-brand-primary mb-6">✏️ Editar Marcación</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-brand-secondary mb-2">Entrada</label>
                  <input
                    type="datetime-local"
                    value={editForm.time_in}
                    onChange={e => setEditForm({ ...editForm, time_in: e.target.value })}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-secondary mb-2">Salida</label>
                  <input
                    type="datetime-local"
                    value={editForm.time_out}
                    onChange={e => setEditForm({ ...editForm, time_out: e.target.value })}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-secondary mb-2">Notas</label>
                  <textarea
                    value={editForm.notes}
                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Ej: Llegó tarde, etc."
                    className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTimecard(null);
                  }}
                  className="flex-1 px-4 py-2 border border-brand-border text-brand-text font-semibold rounded-lg hover:bg-brand-surface"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateTimecard}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600"
                >
                  💾 Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Confirmar Eliminar Marcación */}
        {confirmDeleteTimecard && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-red-600 mb-4">🗑️ Eliminar Marcación</h2>
              <p className="text-brand-secondary mb-6">
                ¿Seguro que deseas eliminar la marcación del {new Date(confirmDeleteTimecard.date).toLocaleDateString('es-ES')}?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteTimecard(null)}
                  className="flex-1 px-4 py-2 border border-brand-border text-brand-text font-semibold rounded-lg hover:bg-brand-surface"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteTimecard(confirmDeleteTimecard)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Confirmar Eliminar Empleado */}
        {confirmDeleteEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-red-600 mb-4">🗑️ Eliminar Empleado</h2>
              <p className="text-brand-secondary mb-4">
                ¿Qué deseas hacer con <strong>{confirmDeleteEmployee.name}</strong>?
              </p>

              <div className="bg-blue-50 p-4 rounded mb-6 text-sm text-blue-800">
                <p className="font-semibold mb-2">Opciones:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Desactivar:</strong> El empleado no podrá marcar entrada, pero sus datos se preservan</li>
                  <li><strong>Eliminar permanentemente:</strong> Se eliminará el empleado y TODOS sus registros</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteEmployee(null)}
                  className="flex-1 px-4 py-2 border border-brand-border text-brand-text font-semibold rounded-lg hover:bg-brand-surface"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteEmployee(confirmDeleteEmployee, false)}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600"
                >
                  ⚠️ Desactivar
                </button>
                <button
                  onClick={() => handleDeleteEmployee(confirmDeleteEmployee, true)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
                >
                  🔴 Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {showScheduleManager && selectedEmployeeForSchedule && (
          <EmployeeScheduleManager
            employee={selectedEmployeeForSchedule}
            adminCode={adminCode}
            onClose={() => {
              setShowScheduleManager(false);
              setSelectedEmployeeForSchedule(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

// Componente auxiliar
const StatsCard: React.FC<{ label: string; value: number; icon: string; color: string }> = ({
  label,
  value,
  icon,
  color
}) => (
  <div className="bg-white rounded-lg p-6 shadow-sm border border-brand-border/50">
    <p className="text-sm text-brand-secondary mb-2">{label}</p>
    <div className="flex items-end justify-between">
      <p className="text-4xl font-bold text-brand-primary">{value}</p>
      <span className="text-4xl">{icon}</span>
    </div>
  </div>
);
