import React, { useState, useEffect } from 'react';
import axios from "../../node_modules/axios/index.js";

const DiscountManager: React.FC = () => {
  const [descuentos, setDescuentos] = useState<any[]>([]);
  const [form, setForm] = useState({ empleado: '', motivo: '', monto: '', fecha: '', estado: 'Registrado' });
  const [status, setStatus] = useState('');

  const fetchDescuentos = async () => {
    const res = await axios.get('/api/rrhh?action=descuentos');
    setDescuentos(res.data);
  };
  useEffect(() => { fetchDescuentos(); }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/rrhh?action=descuento', form);
      setStatus('Descuento registrado');
      setForm({ empleado: '', motivo: '', monto: '', fecha: '', estado: 'Registrado' });
      fetchDescuentos();
    } catch {
      setStatus('Error al registrar descuento');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span className="material-icons text-red-600">remove_circle</span>
        Descuentos
      </h2>
      <form className="mb-4 flex gap-2 flex-wrap" onSubmit={handleSubmit}>
        <input type="text" placeholder="Empleado" className="border rounded px-2 py-1" value={form.empleado} onChange={e => setForm(f => ({ ...f, empleado: e.target.value }))} />
        <input type="text" placeholder="Motivo" className="border rounded px-2 py-1" value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} />
        <input type="number" placeholder="Monto" className="border rounded px-2 py-1" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
        <input type="date" placeholder="Fecha" className="border rounded px-2 py-1" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
        <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded">Registrar descuento</button>
      </form>
      {status && <div className="mb-2 text-red-700">{status}</div>}
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">Empleado</th>
            <th className="px-4 py-2 text-left">Motivo</th>
            <th className="px-4 py-2 text-left">Monto</th>
            <th className="px-4 py-2 text-left">Fecha</th>
            <th className="px-4 py-2 text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {descuentos.map((d) => (
            <tr key={d.id} className="border-b">
              <td className="px-4 py-2">{d.empleado}</td>
              <td className="px-4 py-2">{d.motivo}</td>
              <td className="px-4 py-2">{d.monto}</td>
              <td className="px-4 py-2">{d.fecha}</td>
              <td className="px-4 py-2">{d.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DiscountManager;
