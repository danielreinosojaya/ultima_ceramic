
import React, { useEffect, useState } from 'react';
import axios from 'axios';

type ReportType = 'roles' | 'aportes' | 'fondos' | 'decimos';

const reportLabels: Record<ReportType, string> = {
  roles: 'Roles de pago',
  aportes: 'Aportaciones IESS',
  fondos: 'Fondos de reserva',
  decimos: 'Décimos',
};

const ReportGenerator: React.FC = () => {
  const [tipo, setTipo] = useState<ReportType>('roles');
  const [mes, setMes] = useState(new Date().toLocaleString('es-EC', { month: 'long' }));
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [reporte, setReporte] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReporte = async () => {
    setLoading(true);
    try {
      const mesNum = ("0" + (new Date(Date.parse(mes + " 1, " + anio)).getMonth() + 1)).slice(-2);
      const res = await axios.get(`/api/rrhh?action=reporterrhh&tipo=${tipo}&mes=${mesNum}&anio=${anio}`);
      setReporte(res.data || []);
      setError('');
    } catch (e) {
      setError('Error al cargar reporte');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReporte();
    // eslint-disable-next-line
  }, [tipo, mes, anio]);

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span className="material-icons text-gray-600">bar_chart</span>
        Reportes RRHH
      </h2>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <select value={tipo} onChange={e => setTipo(e.target.value as ReportType)} className="border rounded px-3 py-2 w-full">
          {Object.entries(reportLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(e.target.value)} className="border rounded px-3 py-2 w-full">
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))} className="border rounded px-3 py-2 w-24" min={2020} max={2100} />
        <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition flex items-center gap-1" onClick={fetchReporte}>
          <span className="material-icons">download</span>
          Exportar PDF/Excel
        </button>
      </div>
      <div className="bg-gray-50 p-4 rounded">
        {error && <div className="text-red-600 mb-2">{error}</div>}
        {loading ? (
          <div className="text-center py-4">Cargando...</div>
        ) : reporte.length === 0 ? (
          <span className="text-gray-500">No hay datos para el reporte seleccionado.</span>
        ) : (
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {Object.keys(reporte[0] || {}).map(k => (
                  <th key={k} className="px-4 py-2 text-left">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reporte.map((row, i) => (
                <tr className="border-b" key={i}>
                  {Object.values(row).map((v, j) => (
                    <td key={j} className="px-4 py-2">{typeof v === 'number' ? `$${v.toFixed(2)}` : v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReportGenerator;
