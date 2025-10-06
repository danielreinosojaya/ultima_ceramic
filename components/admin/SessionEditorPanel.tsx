
import React, { useState, useEffect, useMemo } from 'react';
import type { IntroductoryClass, Instructor, EnrichedIntroClassSession } from '../../types';
import * as dataService from '../../services/dataService';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';

interface SessionEditorPanelProps {
  selectedDate: Date;
  product: IntroductoryClass;
  onSave: (date: string, sessions: { time: string; instructorId: number; capacity: number }[] | null) => void;
}

const formatTimeForInput = (time12h: string): string => {
    const date = new Date(`1970-01-01 ${time12h}`);
    return date.toTimeString().slice(0, 5);
};

export const SessionEditorPanel: React.FC<SessionEditorPanelProps> = ({ selectedDate, product, onSave }) => {
  // Monolingüe español, textos hardcodeados. No usar useLanguage ni contextos de idioma.
  const dateStr = useMemo(() => selectedDate.toISOString().split('T')[0], [selectedDate]);

  const [sessions, setSessions] = useState<Omit<EnrichedIntroClassSession, 'id' | 'isOverride'>[]>([]);
  const [isCancelled, setIsCancelled] = useState(false);
  
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [newSession, setNewSession] = useState({ time: '', instructorId: 0, capacity: 8 });

  useEffect(() => {
    const fetchInstructors = async () => {
      const currentInstructors = await dataService.getInstructors();
      setInstructors(currentInstructors);
      if (currentInstructors.length > 0) {
          setNewSession(s => ({...s, instructorId: currentInstructors[0].id}));
      }
    };
    fetchInstructors();
  }, []);

  useEffect(() => {
    const override = product.overrides.find(ov => ov.date === dateStr);
    if (override) {
        if (override.sessions === null) {
            setIsCancelled(true);
            setSessions([]);
        } else {
            setIsCancelled(false);
            const enrichedOverrideSessions = override.sessions.map(s => {
                // FIX: Pass empty bookings array to satisfy function signature
                const generatedSession = dataService.generateIntroClassSessions(product, { bookings: [] }).find(gs => gs.date === dateStr && formatTimeForInput(gs.time) === s.time);
        return {
          ...s,
          date: dateStr,
          time: s.time,
          paidBookingsCount: generatedSession?.paidBookingsCount || 0,
          totalBookingsCount: generatedSession?.totalBookingsCount || 0
        };
            });
            setSessions(enrichedOverrideSessions);
        }
    } else {
        setIsCancelled(false);
        // FIX: The second argument to generateIntroClassSessions should be an options object.
        const generated = dataService.generateIntroClassSessions(product, { bookings: [] }, { generationLimitInDays: 90 })
            .filter(s => s.date === dateStr);
        setSessions(generated);
    }
  }, [selectedDate, product, dateStr]);

  const handleAddSession = () => {
    if (!newSession.time || !newSession.instructorId) {
        alert("Time and instructor are required.");
        return;
    }
    const sessionToAdd = {
        date: dateStr,
        time: newSession.time,
        instructorId: newSession.instructorId,
        capacity: newSession.capacity,
        paidBookingsCount: 0,
        totalBookingsCount: 0,
    };

    const updatedSessions = [...sessions, sessionToAdd].sort((a,b) => formatTimeForInput(a.time).localeCompare(formatTimeForInput(b.time)));
    setSessions(updatedSessions);
    onSave(dateStr, updatedSessions.map(s => ({ time: formatTimeForInput(s.time), instructorId: s.instructorId, capacity: s.capacity })));
    setNewSession(s => ({ ...s, time: '' }));
  };
  
  const handleRemoveSession = (time: string, instructorId: number) => {
    const updatedSessions = sessions.filter(s => !(formatTimeForInput(s.time) === formatTimeForInput(time) && s.instructorId === instructorId));
    setSessions(updatedSessions);
    onSave(dateStr, updatedSessions.map(s => ({ time: formatTimeForInput(s.time), instructorId: s.instructorId, capacity: s.capacity })));
  };
  
  const handleCancelAll = () => {
    setIsCancelled(true);
    setSessions([]);
    onSave(dateStr, null);
  };
  
  const handleResetToDefault = () => {
    onSave(dateStr, []); 
    setIsCancelled(false);
  };

  return (
    <div className="bg-white p-3 rounded-lg border border-gray-200 h-full flex flex-col">
      <h4 className="font-bold text-sm text-center mb-2">
        Sesiones para el día <br/> 
        <span className="font-normal text-brand-secondary">{selectedDate.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })}</span>
      </h4>
      
      <div className="flex-grow space-y-2 overflow-y-auto pr-1">
        {isCancelled ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-center text-sm text-red-600 p-4">Todas las sesiones canceladas para este día.</p>
            </div>
        ) : sessions.length > 0 ? (
          sessions.map((session, index) => (
            <div key={index} className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded">
              <div>
                <p className="font-semibold">{session.time}</p>
                <p className="text-gray-500">{instructors.find(i=>i.id === session.instructorId)?.name}</p>
                 <p className="text-gray-500 font-medium">
                    {`Pagadas: ${session.paidBookingsCount} / Capacidad: ${session.capacity} / Pendientes: ${session.totalBookingsCount - session.paidBookingsCount}`}
                </p>
              </div>
              <button type="button" onClick={() => handleRemoveSession(session.time, session.instructorId)} className="p-1 text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
            </div>
          ))
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-center text-sm text-gray-500 p-4">No hay sesiones definidas para este día.</p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-2 mt-2 space-y-2">
        <div className="flex items-center gap-1">
            <input type="time" value={newSession.time} onChange={e => setNewSession({...newSession, time: e.target.value})} className="p-1 border rounded-md text-xs w-full"/>
            <select value={newSession.instructorId} onChange={e => setNewSession({...newSession, instructorId: Number(e.target.value)})} className="p-1 border rounded-md text-xs w-full">
                {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <input type="number" min="1" value={newSession.capacity} onChange={e => setNewSession({...newSession, capacity: Number(e.target.value)})} className="p-1 border rounded-md text-xs w-20"/>
            <button type="button" onClick={handleAddSession} className="p-1.5 bg-brand-primary text-white rounded-md"><PlusIcon className="w-4 h-4"/></button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
      <button type="button" onClick={handleCancelAll} className="p-1.5 bg-red-100 text-red-700 font-semibold rounded-md hover:bg-red-200">
        Cancelar todas las sesiones
      </button>
      <button type="button" onClick={handleResetToDefault} className="p-1.5 bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200">
        Restaurar sesiones por defecto
      </button>
        </div>
      </div>
    </div>
  );
};