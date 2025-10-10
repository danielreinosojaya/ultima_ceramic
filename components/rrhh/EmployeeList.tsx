
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Employee {
  id: string;
  nombre: string;
  cedula: string;
  cargo: string;
  fechaIngreso: string;
  estado: string;
  salario: number;
}

const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', cedula: '', cargo: '', fechaIngreso: '', estado: 'Activo', salario: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
  const res = await axios.get('/api/rrhh?action=empleados');
      setEmployees(res.data || []);
      setError('');
    } catch (e) {
      setError('Error al cargar empleados');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === 'salario' ? Number(value) : value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!form.salario || form.salario <= 0) {
      setError('El salario es obligatorio y debe ser mayor a 0');
      setLoading(false);
      return;
    }
    try {
      if (editId) {
        await axios.put('/api/rrhh?action=empleado', { id: editId, ...form });
      } else {
        await axios.post('/api/rrhh?action=empleado', form);
      }
      setShowForm(false);
      setForm({ nombre: '', cedula: '', cargo: '', fechaIngreso: '', estado: 'Activo', salario: 0 });
      setEditId(null);
      fetchEmployees();
    } catch (e) {
      setError('Error al guardar');
    }
    setLoading(false);
  };

  const handleEdit = (emp: Employee) => {
    setForm({ nombre: emp.nombre, cedula: emp.cedula, cargo: emp.cargo, fechaIngreso: emp.fechaIngreso, estado: emp.estado, salario: emp.salario });
    setEditId(emp.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este empleado?')) return;
    setLoading(true);
    try {
  await axios.delete(`/api/rrhh?action=empleado&id=${id}`);
      fetchEmployees();
    } catch (e) {
      setError('Error al eliminar');
    }
    setLoading(false);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.nombre.toLowerCase().includes(search.toLowerCase()) ||
    emp.cedula.includes(search)
  );

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span className="material-icons text-blue-600">person_search</span>
        Empleados
      </h2>
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Buscar por nombre o cédula"
          className="border rounded px-3 py-2 w-full max-w-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition" onClick={() => fetchEmployees()}>
          Buscar
        </button>
        <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition flex items-center gap-1" onClick={() => { setShowForm(true); setEditId(null); setForm({ nombre: '', cedula: '', cargo: '', fechaIngreso: '', estado: 'Activo', salario: 0 }); }}>
          <span className="material-icons">person_add</span>
          Nuevo
        </button>
      </div>
      {showForm && (
        <form className="mb-4 bg-blue-50 p-4 rounded" onSubmit={handleSubmit}>
          <div className="flex gap-4 mb-2">
            <input name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Nombre" className="border rounded px-3 py-2 w-1/6" />
            <input name="cedula" value={form.cedula} onChange={handleChange} required placeholder="Cédula" className="border rounded px-3 py-2 w-1/6" />
            <input name="cargo" value={form.cargo} onChange={handleChange} required placeholder="Cargo" className="border rounded px-3 py-2 w-1/6" />
            <input name="fechaIngreso" type="date" value={form.fechaIngreso} onChange={handleChange} required className="border rounded px-3 py-2 w-1/6" />
            <select name="estado" value={form.estado} onChange={handleChange} className="border rounded px-3 py-2 w-1/6">
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            <input name="salario" type="number" min={0} value={form.salario} onChange={handleChange} required placeholder="Salario" className="border rounded px-3 py-2 w-1/6" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">
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
            <th className="px-4 py-2 text-left">Nombre</th>
            <th className="px-4 py-2 text-left">Cédula</th>
            <th className="px-4 py-2 text-left">Cargo</th>
            <th className="px-4 py-2 text-left">Fecha ingreso</th>
            <th className="px-4 py-2 text-left">Estado</th>
            <th className="px-4 py-2 text-left">Salario</th>
            <th className="px-4 py-2 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} className="text-center py-4">Cargando...</td></tr>
          ) : filteredEmployees.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-4 text-gray-500">No hay empleados registrados</td></tr>
          ) : (
            filteredEmployees.map(emp => (
              <tr className="border-b" key={emp.id}>
                <td className="px-4 py-2">{emp.nombre}</td>
                <td className="px-4 py-2">{emp.cedula}</td>
                <td className="px-4 py-2">{emp.cargo}</td>
                <td className="px-4 py-2">{emp.fechaIngreso}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${emp.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{emp.estado}</span>
                </td>
                <td className="px-4 py-2">${emp.salario.toFixed(2)}</td>
                <td className="px-4 py-2 flex gap-2">
                  <button className="text-blue-600 hover:underline flex items-center gap-1" onClick={() => alert(JSON.stringify(emp, null, 2))}>
                    <span className="material-icons text-base">visibility</span>
                    Ver
                  </button>
                  <button className="text-yellow-600 hover:underline flex items-center gap-1" onClick={() => handleEdit(emp)}>
                    <span className="material-icons text-base">edit</span>
                    Editar
                  </button>
                  <button className="text-red-600 hover:underline flex items-center gap-1" onClick={() => handleDelete(emp.id)}>
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

export default EmployeeList;
