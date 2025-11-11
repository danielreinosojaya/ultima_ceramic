import React, { useState, useEffect } from 'react';

interface Tardanza {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  fecha: string;
  retrasoMinutos: number;
  tipoRetraso: 'leve' | 'normal' | 'grave';
  horarioEsperado: string;
  horarioReal: string;
  adminNotes?: string;
}

interface TardanzasStats {
  total: number;
  leves: number;
  normales: number;
  graves: number;
  promedioMinutos: number;
}

interface TardanzasViewProps {
  adminCode: string;
}

export const TardanzasView: React.FC<TardanzasViewProps> = ({ adminCode }) => {
  const [tardanzas, setTardanzas] = useState<Tardanza[]>([]);
  const [stats, setStats] = useState<TardanzasStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>(''); // Filtro empleado
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const loadTardanzas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'get_tardanzas',
        adminCode: adminCode,
        ...(selectedEmployee && { code: selectedEmployee }),
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });

      const response = await fetch(`/api/timecards?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setTardanzas(result.data.tardanzas || []);
        setStats(result.data.estadisticas || null);
      } else {
        console.error('Error al cargar tardanzas:', result.error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTardanzas();
  }, [selectedEmployee, selectedMonth, selectedYear, adminCode]);

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'leve':
        return 'bg-yellow-100 text-yellow-800';
      case 'normal':
        return 'bg-orange-100 text-orange-800';
      case 'grave':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'leve':
        return '📌 Leve (≤15 min)';
      case 'normal':
        return '⚠️ Normal (≤30 min)';
      case 'grave':
        return '🚨 Grave (>30 min)';
      default:
        return tipo;
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-bold text-brand-primary mb-2">⏰ Registro de Tardanzas</h1>
        <p className="text-brand-secondary">Seguimiento automático de retrasos en marcaciones</p>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            label="Total Tardanzas"
            value={stats.total}
            icon="📊"
            color="blue"
          />
          <StatsCard
            label="Leves"
            value={stats.leves}
            icon="📌"
            color="yellow"
          />
          <StatsCard
            label="Normales"
            value={stats.normales}
            icon="⚠️"
            color="orange"
          />
          <StatsCard
            label="Graves"
            value={stats.graves}
            icon="🚨"
            color="red"
          />
          <StatsCard
            label="Promedio (min)"
            value={Math.round(stats.promedioMinutos * 10) / 10}
            icon="⏱️"
            color="purple"
          />
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-brand-border/50 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-brand-secondary mb-2">Empleado (Código)</label>
            <input
              type="text"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value.toUpperCase())}
              placeholder="Ej: EMP001 (vacío = todos)"
              className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-secondary mb-2">Mes</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2025, m - 1).toLocaleString('es-ES', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-secondary mb-2">Año</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={loadTardanzas}
          disabled={loading}
          className="mt-4 px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? '⏳ Cargando...' : '🔄 Refrescar'}
        </button>
      </div>

      {/* Tabla de Tardanzas */}
      <div className="bg-white rounded-lg shadow-sm border border-brand-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-border/50 bg-brand-surface">
          <h3 className="font-bold text-brand-text">Detalle de Tardanzas</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <p className="text-brand-secondary">Cargando datos...</p>
          </div>
        ) : tardanzas.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-brand-secondary">✅ No hay tardanzas registradas en este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-surface border-b border-brand-border/50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-brand-text">Empleado</th>
                  <th className="px-6 py-3 text-left font-semibold text-brand-text">Fecha</th>
                  <th className="px-6 py-3 text-center font-semibold text-brand-text">Retraso</th>
                  <th className="px-6 py-3 text-center font-semibold text-brand-text">Tipo</th>
                  <th className="px-6 py-3 text-center font-semibold text-brand-text">Hora Esperada</th>
                  <th className="px-6 py-3 text-center font-semibold text-brand-text">Hora Real</th>
                  <th className="px-6 py-3 text-left font-semibold text-brand-text">Notas</th>
                </tr>
              </thead>
              <tbody>
                {tardanzas.map((tardanza) => (
                  <tr key={tardanza.id} className="border-b border-brand-border/30 hover:bg-brand-surface/50">
                    <td className="px-6 py-4 font-semibold text-brand-primary">
                      {tardanza.employeeName}
                      <br />
                      <span className="text-xs text-brand-secondary font-mono">{tardanza.employeeCode}</span>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(tardanza.fecha).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold">
                      {tardanza.retrasoMinutos}
                      <span className="text-xs text-brand-secondary ml-1">min</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTipoColor(tardanza.tipoRetraso)}`}>
                        {getTipoLabel(tardanza.tipoRetraso)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono">{tardanza.horarioEsperado}</td>
                    <td className="px-6 py-4 text-center font-mono text-red-600 font-semibold">
                      {tardanza.horarioReal}
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-secondary">
                      {tardanza.adminNotes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente auxiliar para las tarjetas de estadísticas
const StatsCard: React.FC<{ label: string; value: number | string; icon: string; color: string }> = ({
  label,
  value,
  icon,
  color,
}) => (
  <div className="bg-white rounded-lg p-6 shadow-sm border border-brand-border/50">
    <p className="text-sm text-brand-secondary mb-2">{label}</p>
    <div className="flex items-end justify-between">
      <p className="text-4xl font-bold text-brand-primary">{value}</p>
      <span className="text-4xl">{icon}</span>
    </div>
  </div>
);
