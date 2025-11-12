import React, { useState, useEffect } from 'react';

interface Geofence {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
}

interface GeofenceManagerProps {
  adminCode: string;
}

export const GeofenceManager: React.FC<GeofenceManagerProps> = ({ adminCode }) => {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    latitude: 4.7169,
    longitude: -74.0842,
    radius_meters: 300
  });

  // Cargar geofences
  const loadGeofences = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/timecards?action=get_geofences&adminCode=${adminCode}`
      );
      const result = await response.json();
      if (result.success) {
        setGeofences(result.data || []);
      } else {
        setError(result.error || 'Error al cargar geofences');
      }
    } catch (err) {
      setError('Error al cargar geofences');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGeofences();
  }, [adminCode]);

  const handleOpenModal = (geofence?: Geofence) => {
    if (geofence) {
      setEditingId(geofence.id);
      setFormData({
        name: geofence.name,
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        radius_meters: geofence.radius_meters
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        latitude: 4.7169,
        longitude: -74.0842,
        radius_meters: 300
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `/api/timecards?action=update_geofence&adminCode=${adminCode}&geofenceId=${editingId}`
        : `/api/timecards?action=create_geofence&adminCode=${adminCode}`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (result.success) {
        setIsModalOpen(false);
        await loadGeofences();
        setError(null);
      } else {
        setError(result.error || 'Error al guardar');
      }
    } catch (err) {
      setError('Error al guardar');
      console.error('Error:', err);
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      const response = await fetch(
        `/api/timecards?action=toggle_geofence&adminCode=${adminCode}&geofenceId=${id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: !isActive })
        }
      );

      const result = await response.json();
      if (result.success) {
        await loadGeofences();
      } else {
        setError(result.error || 'Error al actualizar');
      }
    } catch (err) {
      setError('Error al actualizar');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este geofence?')) return;

    try {
      const response = await fetch(
        `/api/timecards?action=delete_geofence&adminCode=${adminCode}&geofenceId=${id}`,
        { method: 'DELETE' }
      );

      const result = await response.json();
      if (result.success) {
        await loadGeofences();
      } else {
        setError(result.error || 'Error al eliminar');
      }
    } catch (err) {
      setError('Error al eliminar');
      console.error('Error:', err);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setError(null);
      },
      (err) => {
        setError('Error al obtener ubicación: ' + err.message);
      }
    );
  };

  const getMapsUrl = () => {
    return `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">📍 Gestión de Geofences</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configura las ubicaciones permitidas para marcar entrada/salida
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Nuevo Geofence
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2">Cargando...</p>
        </div>
      )}

      {/* Lista de Geofences */}
      {!loading && geofences.length > 0 && (
        <div className="grid gap-4">
          {geofences.map((geofence) => (
            <div
              key={geofence.id}
              className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800">{geofence.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    📍 {geofence.latitude.toFixed(6)}, {geofence.longitude.toFixed(6)}
                  </p>
                  <p className="text-sm text-gray-600">
                    🎯 Radio: {geofence.radius_meters}m
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(
                      `https://www.google.com/maps?q=${geofence.latitude},${geofence.longitude}`,
                      '_blank'
                    )}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-medium"
                  >
                    Ver Mapa
                  </button>
                  <button
                    onClick={() => handleOpenModal(geofence)}
                    className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(geofence.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={geofence.is_active}
                    onChange={() => handleToggleActive(geofence.id, geofence.is_active)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {geofence.is_active ? '✅ Activo' : '⚪ Inactivo'}
                  </span>
                </label>
                <span className="text-xs text-gray-500 ml-auto">
                  Creado: {new Date(geofence.created_at).toLocaleDateString('es-CO')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sin geofences */}
      {!loading && geofences.length === 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600">No hay geofences configurados</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              {editingId ? '✏️ Editar Geofence' : '➕ Nuevo Geofence'}
            </h3>

            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre del Lugar
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Última Ceramic - Bogotá"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Latitud */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Latitud
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Longitud */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Longitud
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Radio */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Radio (metros)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="10"
                    min="50"
                    max="1000"
                    value={formData.radius_meters}
                    onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value) })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="text-2xl">m</div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Distancia máxima permitida desde las coordenadas (típico: 200-500m)
                </p>
              </div>

              {/* Botón GPS */}
              <button
                onClick={handleGetCurrentLocation}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium mb-2"
              >
                📍 Usar mi ubicación actual
              </button>

              {/* Botón Google Maps */}
              <button
                onClick={() => window.open(getMapsUrl(), '_blank')}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                🗺️ Ver en Google Maps
              </button>

              {/* Acciones */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
