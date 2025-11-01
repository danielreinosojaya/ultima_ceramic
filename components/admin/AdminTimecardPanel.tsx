import React, { useState, useEffect } from 'react';
import type { AdminDashboardStats, Employee, Timecard } from '../../types/timecard';

interface AdminTimecardPanelProps {
  adminCode: string;
}

export const AdminTimecardPanel: React.FC<AdminTimecardPanelProps> = ({ adminCode }) => {
  const [dashboard, setDashboard] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'history'>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeHistory, setEmployeeHistory] = useState<Timecard[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Cargar dashboard
  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/timecards?action=get_admin_dashboard&adminCode=${adminCode}`);
      const result = await response.json();
      if (result.success) {
        setDashboard(result.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await fetch(`/api/timecards?action=list_employees&adminCode=${adminCode}`);
      const result = await response.json();
      if (result.success) {
        setEmployees(result.data);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadEmployeeHistory = async (employeeId: number) => {
    setHistoryLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startDate = startOfMonth.toISOString().split('T')[0];

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
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(
        `/api/timecards?action=download_report&adminCode=${adminCode}&format=${format}&startDate=${startDate}&endDate=${endDate}`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `asistencia_${new Date().toISOString().split('T')[0]}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    }
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
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-brand-border">
          {(['dashboard', 'employees', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'employees' && employees.length === 0) {
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
                        <td className="px-6 py-4">
                          {emp.time_in
                            ? new Date(emp.time_in).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                        <td className="px-6 py-4">
                          {emp.time_out
                            ? new Date(emp.time_out).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                        <td className="px-6 py-4 font-mono">{emp.hours_worked?.toFixed(2) || '-'}h</td>
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
                          <button
                            onClick={() => {
                              setSelectedEmployee(emp);
                              loadEmployeeHistory(emp.id);
                              setActiveTab('history');
                            }}
                            className="text-blue-500 hover:text-blue-700 font-semibold"
                          >
                            Ver Historial
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                            </tr>
                          </thead>
                          <tbody>
                            {employeeHistory.map(record => (
                              <tr key={record.id} className="border-b border-brand-border/30 hover:bg-brand-surface/50">
                                <td className="px-6 py-4">{new Date(record.date).toLocaleDateString('es-ES')}</td>
                                <td className="px-6 py-4">
                                  {record.time_in
                                    ? new Date(record.time_in).toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                    : '-'}
                                </td>
                                <td className="px-6 py-4">
                                  {record.time_out
                                    ? new Date(record.time_out).toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                    : '-'}
                                </td>
                                <td className="px-6 py-4 font-mono font-bold">{record.hours_worked?.toFixed(2) || '-'}h</td>
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
