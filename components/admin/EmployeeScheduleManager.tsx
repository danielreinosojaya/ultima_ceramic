import React, { useState, useEffect } from 'react';
import type { EmployeeSchedule } from '../../types/timecard';

interface Employee {
  id: number;
  code: string;
  name: string;
  position?: string;
}

interface EmployeeScheduleManagerProps {
  employee: Employee;
  adminCode: string;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: '🌞 Domingo' },
  { value: 1, label: '🌅 Lunes' },
  { value: 2, label: '☀️ Martes' },
  { value: 3, label: '⛅ Miércoles' },
  { value: 4, label: '🌤️ Jueves' },
  { value: 5, label: '🌤️ Viernes' },
  { value: 6, label: '🌥️ Sábado' }
];

export const EmployeeScheduleManager: React.FC<EmployeeScheduleManagerProps> = ({
  employee,
  adminCode,
  onClose
}) => {
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkOutTime, setCheckOutTime] = useState('17:00');
  const [gracePeriod, setGracePeriod] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, [employee.id]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/timecards?action=get_employee_schedules&adminCode=${adminCode}&employeeId=${employee.id}`
      );
      const result = await response.json();
      if (result.success) {
        setSchedules(result.data);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditDay = (dayOfWeek: number) => {
    const existing = schedules.find(s => (s.dayOfWeek || s.day_of_week) === dayOfWeek);
    if (existing) {
      setCheckInTime(existing.checkInTime || existing.check_in_time);
      setCheckOutTime(existing.checkOutTime || existing.check_out_time);
      setGracePeriod(existing.gracePeriodMinutes || existing.grace_period_minutes || 10);
    } else {
      setCheckInTime('09:00');
      setCheckOutTime('17:00');
      setGracePeriod(10);
    }
    setEditingDay(dayOfWeek);
  };

  const handleSaveSchedule = async () => {
    if (!editingDay && editingDay !== 0) return;

    setSaving(true);
    try {
      const response = await fetch('/api/timecards?action=save_employee_schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          dayOfWeek: editingDay,
          checkInTime,
          checkOutTime,
          gracePeriodMinutes: gracePeriod,
          adminCode
        })
      });

      const result = await response.json();
      if (result.success) {
        await loadSchedules();
        setEditingDay(null);
      } else {
        alert('Error al guardar: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Error al guardar el horario');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!window.confirm('¿Eliminar este horario?')) return;

    try {
      const response = await fetch(
        `/api/timecards?action=delete_employee_schedule&adminCode=${adminCode}&scheduleId=${scheduleId}`,
        { method: 'DELETE' }
      );
      const result = await response.json();
      if (result.success) {
        await loadSchedules();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-brand-primary to-brand-secondary p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Horario de {employee.name}</h2>
              <p className="text-sm opacity-90">{employee.code} • {employee.position || 'Sin puesto'}</p>
            </div>
            <button
              onClick={onClose}
              className="text-xl hover:opacity-80 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando horarios...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {DAYS_OF_WEEK.map(day => {
                const schedule = schedules.find(s => (s.dayOfWeek || s.day_of_week) === day.value);
                const isEditing = editingDay === day.value;

                return (
                  <div
                    key={day.value}
                    className="border border-gray-200 rounded-lg p-4 hover:border-brand-primary/50 transition"
                  >
                    {isEditing ? (
                      // Formulario de edición
                      <div className="space-y-4">
                        <h3 className="font-bold text-brand-text">{day.label}</h3>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Entrada
                            </label>
                            <input
                              type="time"
                              value={checkInTime}
                              onChange={(e) => setCheckInTime(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Salida
                            </label>
                            <input
                              type="time"
                              value={checkOutTime}
                              onChange={(e) => setCheckOutTime(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tolerancia (min)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="60"
                              value={gracePeriod}
                              onChange={(e) => setGracePeriod(parseInt(e.target.value) || 10)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingDay(null)}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveSchedule}
                            disabled={saving}
                            className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary disabled:opacity-50"
                          >
                            {saving ? 'Guardando...' : '💾 Guardar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Vista de solo lectura
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-brand-text">{day.label}</p>
                          {schedule ? (
                            <p className="text-sm text-gray-600">
                              {schedule.checkInTime || schedule.check_in_time} - {schedule.checkOutTime || schedule.check_out_time}
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                +{schedule.gracePeriodMinutes || schedule.grace_period_minutes || 10}min
                              </span>
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No configurado</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditDay(day.value)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-semibold"
                          >
                            ✏️ Editar
                          </button>
                          {schedule && (
                            <button
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-semibold"
                            >
                              🗑️ Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
