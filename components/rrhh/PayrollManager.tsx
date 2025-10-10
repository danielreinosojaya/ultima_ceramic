
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface RolPago {
  empleadoId: string;
  salarioBase: number;
  descuentos: number;
  pagosExtras: number;
  aporteIessEmpleado: number;
  fondoReserva: number;
  decimoTercero: number;
  decimoCuarto: number;
  neto: number;
  mes: string;
  anio: number;
}

const PayrollManager: React.FC = () => {
  const [roles, setRoles] = useState<RolPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mes, setMes] = useState(new Date().toLocaleString('es-EC', { month: 'long' }));
  const [anio, setAnio] = useState(new Date().getFullYear());

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const mesNum = ("0" + (new Date(Date.parse(mes + " 1, " + anio)).getMonth() + 1)).slice(-2);
      const res = await axios.get(`/api/rrhh?action=reporterrhh&tipo=roles&mes=${mesNum}&anio=${anio}`);
      setRoles(res.data || []);
      setError('');
    } catch (e) {
      setError('Error al cargar roles de pago');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line
  }, [mes, anio]);

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span className="material-icons text-teal-600">receipt_long</span>
        Roles de pago
      </h2>
      <div className="mb-4 flex gap-2 items-center">
        <select value={mes} onChange={e => setMes(e.target.value)} className="border rounded px-3 py-2">
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))} className="border rounded px-3 py-2 w-24" min={2020} max={2100} />
        <button className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 transition" onClick={fetchRoles}>Actualizar</button>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">Empleado</th>
            <th className="px-4 py-2 text-left">Salario base</th>
            <th className="px-4 py-2 text-left">Descuentos</th>
            <th className="px-4 py-2 text-left">Pagos extras</th>
            <th className="px-4 py-2 text-left">Aporte IESS</th>
            <th className="px-4 py-2 text-left">Fondo reserva</th>
            <th className="px-4 py-2 text-left">Décimo 3ro</th>
            <th className="px-4 py-2 text-left">Décimo 4to</th>
            <th className="px-4 py-2 text-left">Neto a pagar</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={9} className="text-center py-4">Cargando...</td></tr>
          ) : roles.length === 0 ? (
            <tr><td colSpan={9} className="text-center py-4 text-gray-500">No hay roles registrados</td></tr>
          ) : (
            roles.map(r => (
              <tr className="border-b" key={r.empleadoId}>
                <td className="px-4 py-2">{r.empleadoId}</td>
                <td className="px-4 py-2">${r.salarioBase.toFixed(2)}</td>
                <td className="px-4 py-2">${r.descuentos.toFixed(2)}</td>
                <td className="px-4 py-2">${r.pagosExtras.toFixed(2)}</td>
                <td className="px-4 py-2">${r.aporteIessEmpleado.toFixed(2)}</td>
                <td className="px-4 py-2">${r.fondoReserva.toFixed(2)}</td>
                <td className="px-4 py-2">${r.decimoTercero.toFixed(2)}</td>
                <td className="px-4 py-2">${r.decimoCuarto.toFixed(2)}</td>
                <td className="px-4 py-2 font-bold">${r.neto.toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PayrollManager;
