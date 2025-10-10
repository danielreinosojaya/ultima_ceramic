
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Absence {
  id: string;
  empleado: string;
  fecha: string;
  motivo: string;
  justificacion: string;
  estado: string;
}

const AbsenceManager: React.FC = () => {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ empleado: '', fecha: '', motivo: '', justificacion: '', estado: 'Registrado' });
  const [editId, setEditId] = useState<string | null>(null);

  const fetchAbsences = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/rrhh?type=faltas');
      setAbsences(res.data || []);
      setError('');
    } catch (e) {
      setError('Error al cargar faltas');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAbsences();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) {
        await axios.put('/api/rrhh?type=faltas', { id: editId, ...form });
      } else {
        await axios.post('/api/rrhh?type=faltas', form);
      }
      setShowForm(false);
      setForm({ empleado: '', fecha: '', motivo: '', justificacion: '', estado: 'Registrado' });
      setEditId(null);
      fetchAbsences();
    } catch (e) {
      setError('Error al guardar');
    }
    setLoading(false);
  };

  const handleEdit = (absence: Absence) => {
    setForm({ empleado: absence.empleado, fecha: absence.fecha, motivo: absence.motivo, justificacion: absence.justificacion, estado: absence.estado });
    setEditId(absence.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta falta?')) return;
    setLoading(true);
    try {
      await axios.delete(`/api/rrhh?type=faltas&id=${id}`);
      fetchAbsences();
    } catch (e) {
      setError('Error al eliminar');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span className="material-icons text-pink-600">block</span>
        Faltas
      </h2>
      <div className="mb-4 flex gap-2">
        <button
          className="bg-pink-600 text-white px-4 py-2 rounded hover:bg-pink-700 transition flex items-center gap-1"
          onClick={() => { setShowForm(true); setEditId(null); setForm({ empleado: '', fecha: '', motivo: '', justificacion: '', estado: 'Registrado' }); }}
        >
          <span className="material-icons">add</span>
          Registrar falta
        </button>
      </div>
      {showForm && (
        <form className="mb-4 bg-pink-50 p-4 rounded" onSubmit={handleSubmit}>
          <div className="flex gap-4 mb-2">
            <input name="empleado" value={form.empleado} onChange={handleChange} required placeholder="Empleado" className="border rounded px-3 py-2 w-1/4" />
            <input name="fecha" type="date" value={form.fecha} onChange={handleChange} required className="border rounded px-3 py-2 w-1/4" />
            <input name="motivo" value={form.motivo} onChange={handleChange} required placeholder="Motivo" className="border rounded px-3 py-2 w-1/4" />
            <input name="justificacion" value={form.justificacion} onChange={handleChange} placeholder="Justificación" className="border rounded px-3 py-2 w-1/4" />
            <select name="estado" value={form.estado} onChange={handleChange} className="border rounded px-3 py-2 w-1/4">
              <option value="Registrado">Registrado</option>
              <option value="Justificado">Justificado</option>
              <option value="No justificado">No justificado</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-pink-600 text-white px-4 py-2 rounded hover:bg-pink-700 transition">
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
            <th className="px-4 py-2 text-left">Motivo</th>
            <th className="px-4 py-2 text-left">Justificación</th>
            <th className="px-4 py-2 text-left">Estado</th>
            <th className="px-4 py-2 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} className="text-center py-4">Cargando...</td></tr>
          ) : absences.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-4 text-gray-500">No hay faltas registradas</td></tr>
          ) : (
            absences.map(absence => (
              <tr className="border-b" key={absence.id}>
                <td className="px-4 py-2">{absence.empleado}</td>
                <td className="px-4 py-2">{absence.fecha}</td>
                <td className="px-4 py-2">{absence.motivo}</td>
                <td className="px-4 py-2">{absence.justificacion}</td>
                <td className="px-4 py-2">
                  <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs">{absence.estado}</span>
                </td>
                <td className="px-4 py-2 flex gap-2">
                  <button className="text-yellow-600 hover:underline flex items-center gap-1" onClick={() => handleEdit(absence)}>
                    <span className="material-icons text-base">edit</span>
                    Editar
                  </button>
                  <button className="text-red-600 hover:underline flex items-center gap-1" onClick={() => handleDelete(absence.id)}>
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

export default AbsenceManager;
