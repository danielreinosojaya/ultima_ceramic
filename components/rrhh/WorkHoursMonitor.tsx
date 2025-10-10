
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface WorkHour {
  id: string;
  empleado: string;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  totalHoras: number;
  observaciones: string;
}

const WorkHoursMonitor: React.FC = () => {
  const [workHours, setWorkHours] = useState<WorkHour[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ empleado: '', fecha: '', horaEntrada: '', horaSalida: '', totalHoras: 0, observaciones: '' });
  const [editId, setEditId] = useState<string | null>(null);

  const fetchWorkHours = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/rrhh?type=horas');
      setWorkHours(res.data || []);
      setError('');
    } catch (e) {
      setError('Error al cargar horas');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkHours();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === 'totalHoras' ? Number(value) : value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) {
        await axios.put('/api/rrhh?type=horas', { id: editId, ...form });
      } else {
        await axios.post('/api/rrhh?type=horas', form);
      }
      setShowForm(false);
      setForm({ empleado: '', fecha: '', horaEntrada: '', horaSalida: '', totalHoras: 0, observaciones: '' });
      setEditId(null);
      fetchWorkHours();
    } catch (e) {
      setError('Error al guardar');
    }
    setLoading(false);
  };

  const handleEdit = (wh: WorkHour) => {
    setForm({ empleado: wh.empleado, fecha: wh.fecha, horaEntrada: wh.horaEntrada, horaSalida: wh.horaSalida, totalHoras: wh.totalHoras, observaciones: wh.observaciones });
    setEditId(wh.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este registro de horas?')) return;
    setLoading(true);
    try {
      await axios.delete(`/api/rrhh?type=horas&id=${id}`);
      fetchWorkHours();
    } catch (e) {
      setError('Error al eliminar');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span className="material-icons text-indigo-600">schedule</span>
        Horas trabajadas
      </h2>
      <div className="mb-4 flex gap-2">
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition flex items-center gap-1"
          onClick={() => { setShowForm(true); setEditId(null); setForm({ empleado: '', fecha: '', horaEntrada: '', horaSalida: '', totalHoras: 0, observaciones: '' }); }}
        >
          <span className="material-icons">add</span>
          Registrar horas
        </button>
        {/* Carga masiva: funcionalidad futura */}
        <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition flex items-center gap-1" disabled>
          <span className="material-icons">upload_file</span>
          Carga masiva
        </button>
      </div>
      {showForm && (
        <form className="mb-4 bg-indigo-50 p-4 rounded" onSubmit={handleSubmit}>
          <div className="flex gap-4 mb-2">
            <input name="empleado" value={form.empleado} onChange={handleChange} required placeholder="Empleado" className="border rounded px-3 py-2 w-1/6" />
            <input name="fecha" type="date" value={form.fecha} onChange={handleChange} required className="border rounded px-3 py-2 w-1/6" />
            <input name="horaEntrada" type="time" value={form.horaEntrada} onChange={handleChange} required className="border rounded px-3 py-2 w-1/6" />
            <input name="horaSalida" type="time" value={form.horaSalida} onChange={handleChange} required className="border rounded px-3 py-2 w-1/6" />
            <input name="totalHoras" type="number" min={0} value={form.totalHoras} onChange={handleChange} required placeholder="Total horas" className="border rounded px-3 py-2 w-1/6" />
            <input name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Observaciones" className="border rounded px-3 py-2 w-1/6" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">
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
            <th className="px-4 py-2 text-left">Hora entrada</th>
            <th className="px-4 py-2 text-left">Hora salida</th>
            <th className="px-4 py-2 text-left">Total horas</th>
            <th className="px-4 py-2 text-left">Observaciones</th>
            <th className="px-4 py-2 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} className="text-center py-4">Cargando...</td></tr>
          ) : workHours.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-4 text-gray-500">No hay registros</td></tr>
          ) : (
            workHours.map(wh => (
              <tr className="border-b" key={wh.id}>
                <td className="px-4 py-2">{wh.empleado}</td>
                <td className="px-4 py-2">{wh.fecha}</td>
                <td className="px-4 py-2">{wh.horaEntrada}</td>
                <td className="px-4 py-2">{wh.horaSalida}</td>
                <td className="px-4 py-2">{wh.totalHoras}</td>
                <td className="px-4 py-2">{wh.observaciones}</td>
                <td className="px-4 py-2 flex gap-2">
                  <button className="text-yellow-600 hover:underline flex items-center gap-1" onClick={() => handleEdit(wh)}>
                    <span className="material-icons text-base">edit</span>
                    Editar
                  </button>
                  <button className="text-red-600 hover:underline flex items-center gap-1" onClick={() => handleDelete(wh.id)}>
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

export default WorkHoursMonitor;
