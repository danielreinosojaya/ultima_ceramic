import React, { useState, useEffect } from 'react';
import axios from "../../node_modules/axios/index.js";

const VacationManager: React.FC = () => {
  const [vacaciones, setVacaciones] = useState<any[]>([]);
  const [form, setForm] = useState({ empleado: '', inicio: '', fin: '', dias: '', estado: 'Pendiente' });
  const [status, setStatus] = useState('');

  const fetchVacaciones = async () => {
    const res = await axios.get('/api/rrhh?action=vacaciones');
    setVacaciones(res.data);
  };
  useEffect(() => { fetchVacaciones(); }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/rrhh?action=vacacion', form);
      setStatus('Vacación registrada');
      setForm({ empleado: '', inicio: '', fin: '', dias: '', estado: 'Pendiente' });
      fetchVacaciones();
    } catch {
      setStatus('Error al registrar vacación');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span className="material-icons text-yellow-600">beach_access</span>
        Vacaciones
      </h2>
      <form className="mb-4 flex gap-2 flex-wrap" onSubmit={handleSubmit}>
        <input type="text" placeholder="Empleado" className="border rounded px-2 py-1" value={form.empleado} onChange={e => setForm(f => ({ ...f, empleado: e.target.value }))} />
        <input type="date" placeholder="Inicio" className="border rounded px-2 py-1" value={form.inicio} onChange={e => setForm(f => ({ ...f, inicio: e.target.value }))} />
        <input type="date" placeholder="Fin" className="border rounded px-2 py-1" value={form.fin} onChange={e => setForm(f => ({ ...f, fin: e.target.value }))} />
        <input type="number" placeholder="Días" className="border rounded px-2 py-1" value={form.dias} onChange={e => setForm(f => ({ ...f, dias: e.target.value }))} />
        <button type="submit" className="bg-yellow-600 text-white px-4 py-2 rounded">Solicitar</button>
      </form>
      {status && <div className="mb-2 text-yellow-700">{status}</div>}
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">Empleado</th>
            <th className="px-4 py-2 text-left">Fecha inicio</th>
            <th className="px-4 py-2 text-left">Fecha fin</th>
            <th className="px-4 py-2 text-left">Días</th>
            <th className="px-4 py-2 text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {vacaciones.map((v) => (
            <tr key={v.id} className="border-b">
              <td className="px-4 py-2">{v.empleado}</td>
              <td className="px-4 py-2">{v.inicio}</td>
              <td className="px-4 py-2">{v.fin}</td>
              <td className="px-4 py-2">{v.dias}</td>
              <td className="px-4 py-2">{v.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VacationManager;
