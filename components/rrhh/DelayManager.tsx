
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Delay {
  id: string;
  empleado: string;
  fecha: string;
  minutos: number;
  motivo: string;
  estado: string;
}

const DelayManager: React.FC = () => {
  const [delays, setDelays] = useState<Delay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ empleado: '', fecha: '', minutos: 0, motivo: '', estado: 'Registrado' });
  const [editId, setEditId] = useState<string | null>(null);

  const fetchDelays = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/rrhh?type=retrasos');
      setDelays(res.data || []);
      setError('');
    } catch (e) {
      setError('Error al cargar retrasos');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDelays();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === 'minutos' ? Number(value) : value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) {
        await axios.put('/api/rrhh?type=retrasos', { id: editId, ...form });
      } else {
        await axios.post('/api/rrhh?type=retrasos', form);
      }
      setShowForm(false);
      setForm({ empleado: '', fecha: '', minutos: 0, motivo: '', estado: 'Registrado' });
      setEditId(null);
      fetchDelays();
    } catch (e) {
      setError('Error al guardar');
    }
    setLoading(false);
  };

  const handleEdit = (delay: Delay) => {
    setForm({ empleado: delay.empleado, fecha: delay.fecha, minutos: delay.minutos, motivo: delay.motivo, estado: delay.estado });
    setEditId(delay.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este retraso?')) return;
    setLoading(true);
    try {
      await axios.delete(`/api/rrhh?type=retrasos&id=${id}`);
      fetchDelays();
    } catch (e) {
      setError('Error al eliminar');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span className="material-icons text-orange-600">timer</span>
        Retrasos
      </h2>
      <div className="mb-4 flex gap-2">
        <button
          className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition flex items-center gap-1"
          onClick={() => { setShowForm(true); setEditId(null); setForm({ empleado: '', fecha: '', minutos: 0, motivo: '', estado: 'Registrado' }); }}
        >
          <span className="material-icons">add</span>
          Registrar retraso
        </button>
      </div>
      {showForm && (
        <form className="mb-4 bg-orange-50 p-4 rounded" onSubmit={handleSubmit}>
          <div className="flex gap-4 mb-2">
            <input name="empleado" value={form.empleado} onChange={handleChange} required placeholder="Empleado" className="border rounded px-3 py-2 w-1/5" />
            <input name="fecha" type="date" value={form.fecha} onChange={handleChange} required className="border rounded px-3 py-2 w-1/5" />
            <input name="minutos" type="number" min={0} value={form.minutos} onChange={handleChange} required placeholder="Minutos" className="border rounded px-3 py-2 w-1/5" />
            <input name="motivo" value={form.motivo} onChange={handleChange} required placeholder="Motivo" className="border rounded px-3 py-2 w-1/5" />
            <select name="estado" value={form.estado} onChange={handleChange} className="border rounded px-3 py-2 w-1/5">
              <option value="Registrado">Registrado</option>
              <option value="Justificado">Justificado</option>
              <option value="No justificado">No justificado</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition">
              {editId ? 'Actualizar' : 'Registrar'}
            </button>
            <button type="button" className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition" onClick={() => { setShowForm(false); setEditId(null); }}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">Empleado</th>
            <th className="px-4 py-2 text-left">Fecha</th>
            <th className="px-4 py-2 text-left">Minutos</th>
            <th className="px-4 py-2 text-left">Motivo</th>
            <th className="px-4 py-2 text-left">Estado</th>
            <th className="px-4 py-2 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} className="text-center py-4">Cargando...</td></tr>
          ) : delays.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-4 text-gray-500">No hay retrasos registrados</td></tr>
          ) : (
            delays.map(delay => (
              <tr className="border-b" key={delay.id}>
                <td className="px-4 py-2">{delay.empleado}</td>
                <td className="px-4 py-2">{delay.fecha}</td>
                <td className="px-4 py-2">{delay.minutos}</td>
                <td className="px-4 py-2">{delay.motivo}</td>
                <td className="px-4 py-2">
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">{delay.estado}</span>
                </td>
                <td className="px-4 py-2 flex gap-2">
                  <button className="text-yellow-600 hover:underline flex items-center gap-1" onClick={() => handleEdit(delay)}>
                    <span className="material-icons text-base">edit</span>
                    Editar
                  </button>
                  <button className="text-red-600 hover:underline flex items-center gap-1" onClick={() => handleDelete(delay.id)}>
                    <span className="material-icons text-base">delete</span>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DelayManager;
