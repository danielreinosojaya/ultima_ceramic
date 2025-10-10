import React, { useState, useEffect } from 'react';
import axios from "../../node_modules/axios/index.js";

const ExtraPaymentManager: React.FC = () => {
  const [pagos, setPagos] = useState<any[]>([]);
  const [form, setForm] = useState({ empleado: '', tipo: '', monto: '', fecha: '', estado: 'Registrado' });
  const [status, setStatus] = useState('');

  const fetchPagos = async () => {
    const res = await axios.get('/api/rrhh?action=pagosextras');
    setPagos(res.data);
  };
  useEffect(() => { fetchPagos(); }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/rrhh?action=pagoextra', form);
      setStatus('Pago extra registrado');
      setForm({ empleado: '', tipo: '', monto: '', fecha: '', estado: 'Registrado' });
      fetchPagos();
    } catch {
      setStatus('Error al registrar pago extra');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span className="material-icons text-green-600">attach_money</span>
        Pagos extras
      </h2>
      <form className="mb-4 flex gap-2 flex-wrap" onSubmit={handleSubmit}>
        <input type="text" placeholder="Empleado" className="border rounded px-2 py-1" value={form.empleado} onChange={e => setForm(f => ({ ...f, empleado: e.target.value }))} />
        <input type="text" placeholder="Tipo" className="border rounded px-2 py-1" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} />
        <input type="number" placeholder="Monto" className="border rounded px-2 py-1" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
        <input type="date" placeholder="Fecha" className="border rounded px-2 py-1" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Registrar pago extra</button>
      </form>
      {status && <div className="mb-2 text-green-700">{status}</div>}
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">Empleado</th>
            <th className="px-4 py-2 text-left">Tipo</th>
            <th className="px-4 py-2 text-left">Monto</th>
            <th className="px-4 py-2 text-left">Fecha</th>
            <th className="px-4 py-2 text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {pagos.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="px-4 py-2">{p.empleado}</td>
              <td className="px-4 py-2">{p.tipo}</td>
              <td className="px-4 py-2">{p.monto}</td>
              <td className="px-4 py-2">{p.fecha}</td>
              <td className="px-4 py-2">{p.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ExtraPaymentManager;
