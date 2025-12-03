import React, { useState } from 'react';
import { formatLocalTimeFromUTC } from '../../utils/formatters';

// Componente para mostrar indicador de productividad
const ProductivityIndicator: React.FC<{ hours: number; daysWorked: number }> = ({ hours, daysWorked }) => {
  const avgHoursPerDay = daysWorked > 0 ? hours / daysWorked : 0;
  const expectedHoursPerDay = 8;
  const percentage = Math.min(100, (avgHoursPerDay / expectedHoursPerDay) * 100);
  
  let color = 'bg-red-500';
  let label = 'Bajo';
  
  if (percentage >= 90) {
    color = 'bg-green-500';
    label = 'Excelente';
  } else if (percentage >= 75) {
    color = 'bg-blue-500';
    label = 'Bueno';
  } else if (percentage >= 60) {
    color = 'bg-yellow-500';
    label = 'Regular';
  }
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }}></div>
      </div>
      <span className="text-xs font-semibold text-gray-700">{label}</span>
    </div>
  );
};

interface ReportEmployee {
  employee_code: string;
  employee_name: string;
  employee_position: string;
  records: Array<{
    date: string;
    time_in: string;
    time_out: string;
    hours_worked: number;
    tardanzas: number;
    max_retraso: number;
    notes: string;
  }>;
  stats: {
    total_hours: number;
    days_worked: number;
    days_absent: number;
    tardanzas_count: number;
  };
}

interface ReportSummary {
  year: number;
  month: number;
  month_name: string;
  total_employees: number;
  total_hours: number;
  total_days_worked: number;
  total_tardanzas: number;
}

interface MonthlyReportViewerProps {
  adminCode: string;
}

export const MonthlyReportViewer: React.FC<MonthlyReportViewerProps> = ({ adminCode }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [report, setReport] = useState<{ summary: ReportSummary; data: ReportEmployee[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/timecards?action=get_monthly_report&adminCode=${adminCode}&year=${year}&month=${month}`
      );
      const result = await response.json();

      if (result.success) {
        setReport(result);
      } else {
        setError(result.error || 'Error al cargar el reporte');
      }
    } catch (err) {
      setError('Error al cargar el reporte');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    try {
      const response = await fetch(
        `/api/timecards?action=get_monthly_report&adminCode=${adminCode}&year=${year}&month=${month}&format=csv`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_asistencia_${year}-${String(month).padStart(2, '0')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        setError('Error al descargar el reporte');
      }
    } catch (err) {
      setError('Error al descargar el reporte');
      console.error('Error:', err);
    }
  };

  const formatTime = (dateString: string) => formatLocalTimeFromUTC(dateString);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    // ✅ Usar formatLocalTimeFromUTC que ya maneja correctamente el timezone
    // y extraer solo la fecha (primeros 10 caracteres)
    const timeStr = formatLocalTimeFromUTC(dateString);
    // Si viene en formato "HH:MM a.m/p.m", necesitamos la fecha
    // Mejor: usar el timestamp directamente y convertir a fecha local
    const date = new Date(dateString);
    // Convertir a string en timezone Ecuador y extraer fecha
    const ecuadorDateStr = date.toLocaleString('es-CO', { 
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    // ecuadorDateStr es "DD/MM/YYYY", convertir a Date para formato
    const [day, month, year] = ecuadorDateStr.split('/');
    const localDate = new Date(`${year}-${month}-${day}T12:00:00`);
    return localDate.toLocaleDateString('es-CO', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Generar Reporte Mensual</h3>
        
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Año</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          <button
            onClick={loadReport}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Cargando...' : 'Generar Reporte'}
          </button>

          {report && (
            <button
              onClick={downloadCSV}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              📥 Descargar CSV
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Resumen */}
      {report && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📊 Resumen - {report.summary.month_name} {report.summary.year}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{report.summary.total_employees}</div>
              <div className="text-sm text-gray-600">Empleados</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{report.summary.total_hours.toFixed(1)}h</div>
              <div className="text-sm text-gray-600">Horas totales</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{report.summary.total_days_worked}</div>
              <div className="text-sm text-gray-600">Días trabajados</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{report.summary.total_tardanzas}</div>
              <div className="text-sm text-gray-600">Tardanzas</div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de empleados */}
      {report && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Detalle por Empleado</h3>
          </div>

          <div className="divide-y divide-gray-200">
            {report.data.map((employee) => (
              <div key={employee.employee_code} className="p-6">
                {/* Header del empleado */}
                <button
                  onClick={() => setExpandedEmployee(expandedEmployee === employee.employee_code ? null : employee.employee_code)}
                  className="w-full text-left hover:bg-gray-50 p-4 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">
                        {employee.employee_code} - {employee.employee_name}
                      </div>
                      <div className="text-sm text-gray-600">{employee.employee_position || 'Sin puesto'}</div>
                    </div>

                    <div className="hidden md:flex gap-8 mr-4">
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">{employee.stats.total_hours.toFixed(1)}h</div>
                        <div className="text-xs text-gray-600">Horas</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{employee.stats.days_worked}</div>
                        <div className="text-xs text-gray-600">Días</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-red-600">{employee.stats.tardanzas_count}</div>
                        <div className="text-xs text-gray-600">Tardanzas</div>
                      </div>
                    </div>

                    <div className="text-gray-400">
                      {expandedEmployee === employee.employee_code ? '▼' : '▶'}
                    </div>
                  </div>
                </button>

                {/* Detalles expandidos */}
                {expandedEmployee === employee.employee_code && (
                  <div className="mt-4 space-y-2 bg-gray-50 rounded-lg p-4">
                    {employee.records.length === 0 ? (
                      <div className="text-gray-500 text-center py-4">Sin registros este mes</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-200">
                            <tr>
                              <th className="px-3 py-2 text-left text-gray-700 font-semibold">Fecha</th>
                              <th className="px-3 py-2 text-left text-gray-700 font-semibold">Entrada</th>
                              <th className="px-3 py-2 text-left text-gray-700 font-semibold">Salida</th>
                              <th className="px-3 py-2 text-center text-gray-700 font-semibold">Horas</th>
                              <th className="px-3 py-2 text-center text-gray-700 font-semibold">Tardanzas</th>
                              <th className="px-3 py-2 text-center text-gray-700 font-semibold">Retraso</th>
                              <th className="px-3 py-2 text-left text-gray-700 font-semibold">Notas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employee.records.map((record, idx) => (
                              <tr key={idx} className="border-t border-gray-300 hover:bg-gray-100">
                                <td className="px-3 py-2">{formatDate(record.date)}</td>
                                <td className="px-3 py-2">{formatTime(record.time_in)}</td>
                                <td className="px-3 py-2">{formatTime(record.time_out)}</td>
                                <td className="px-3 py-2 text-center font-semibold text-blue-600">
                                  {record.hours_worked !== null && record.hours_worked !== undefined ? Number(record.hours_worked).toFixed(2) : '-'}h
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {record.tardanzas > 0 ? (
                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">
                                      {record.tardanzas}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {record.max_retraso > 0 ? `${record.max_retraso}m` : '-'}
                                </td>
                                <td className="px-3 py-2 text-gray-600 text-xs">{record.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Estadísticas resumen */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-gray-300">
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">{employee.stats.total_hours.toFixed(1)}h</div>
                        <div className="text-xs text-gray-600">Horas totales</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{employee.stats.days_worked}</div>
                        <div className="text-xs text-gray-600">Días trabajados</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-orange-600">{employee.stats.days_absent}</div>
                        <div className="text-xs text-gray-600">Días ausentes</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-red-600">{employee.stats.tardanzas_count}</div>
                        <div className="text-xs text-gray-600">Tardanzas</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-purple-600">
                          {employee.stats.days_worked > 0 ? (employee.stats.total_hours / employee.stats.days_worked).toFixed(1) : '0'}h
                        </div>
                        <div className="text-xs text-gray-600">Promedio/día</div>
                      </div>
                    </div>

                    {/* Indicador de productividad */}
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <div className="text-xs font-semibold text-gray-700 mb-2">Productividad</div>
                      <ProductivityIndicator hours={employee.stats.total_hours} daysWorked={employee.stats.days_worked} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado sin datos */}
      {!report && !loading && !error && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-gray-600">Selecciona un mes y año para generar el reporte</p>
        </div>
      )}
    </div>
  );
};
