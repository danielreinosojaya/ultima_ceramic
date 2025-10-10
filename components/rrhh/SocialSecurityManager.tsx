
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface AporteIESS {
  empleadoId: string;
  nombre: string;
  aporteIessEmpleado: number;
  aporteIessEmpleador: number;
}

const SocialSecurityManager: React.FC = () => {
  const [aportes, setAportes] = useState<AporteIESS[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mes, setMes] = useState(new Date().toLocaleString('es-EC', { month: 'long' }));
  const [anio, setAnio] = useState(new Date().getFullYear());

  const fetchAportes = async () => {
    setLoading(true);
    try {
      // Backend espera mes en formato MM
      const mesNum = ("0" + (new Date(Date.parse(mes + " 1, " + anio)).getMonth() + 1)).slice(-2);
      const res = await axios.get(`/api/rrhh?action=reporterrhh&tipo=aportes&mes=${mesNum}&anio=${anio}`);
      setAportes(res.data || []);
      setError('');
    } catch (e) {
      setError('Error al cargar aportes');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAportes();
    // eslint-disable-next-line
  }, [mes, anio]);

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span className="material-icons text-cyan-600">account_balance</span>
        Aportaciones IESS
      </h2>
      <div className="mb-4 flex gap-2 items-center">
        <select value={mes} onChange={e => setMes(e.target.value)} className="border rounded px-3 py-2">
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))} className="border rounded px-3 py-2 w-24" min={2020} max={2100} />
        <button className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700 transition" onClick={fetchAportes}>Actualizar</button>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">Empleado</th>
            <th className="px-4 py-2 text-left">Aporte empleado</th>
            <th className="px-4 py-2 text-left">Aporte empleador</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={3} className="text-center py-4">Cargando...</td></tr>
          ) : aportes.length === 0 ? (
            <tr><td colSpan={3} className="text-center py-4 text-gray-500">No hay aportes registrados</td></tr>
          ) : (
            aportes.map(a => (
              <tr className="border-b" key={a.empleadoId}>
                <td className="px-4 py-2">{a.nombre}</td>
                <td className="px-4 py-2">${a.aporteIessEmpleado.toFixed(2)}</td>
                <td className="px-4 py-2">${a.aporteIessEmpleador.toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SocialSecurityManager;
