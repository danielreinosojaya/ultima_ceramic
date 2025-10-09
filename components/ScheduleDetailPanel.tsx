
import React from 'react';
import type { EnrichedAvailableSlot } from '../types';

interface ScheduleDetailPanelProps {
	slot: EnrichedAvailableSlot | null;
}

const ScheduleDetailPanel: React.FC<ScheduleDetailPanelProps> = ({ slot }) => {
	if (!slot) {
		return (
			<div className="bg-white rounded-xl p-4 shadow-subtle text-gray-500 text-center">
				Selecciona un horario para ver detalles.
			</div>
		);
	}

	return (
		<div className="bg-white rounded-xl p-4 shadow-subtle animate-fade-in-up">
			<div className="mb-2 text-lg font-semibold text-brand-text">{slot.time}</div>
			<div className="mb-2 text-sm text-gray-700">Instructor: {slot.instructorName || 'Sin asignar'}</div>
			<div className="mb-4 text-sm text-gray-700">Técnica: {slot.technique}</div>
			<div className="mb-4">
				<span className="font-bold text-green-700">{slot.paidBookingsCount}</span>
				<span className="text-gray-700"> / {slot.maxCapacity} Cupos</span>
				<div className="w-full bg-gray-200 rounded-full h-2 mt-2">
					<div
						className="bg-green-500 h-2 rounded-full transition-all"
						style={{ width: `${(slot.paidBookingsCount / slot.maxCapacity) * 100}%` }}
					/>
				</div>
			</div>
			{slot.totalBookingsCount > slot.paidBookingsCount && (
				<div className="text-xs text-amber-700 mt-2">Hay reservas pendientes de pago.</div>
			)}
		</div>
	);
};

export default ScheduleDetailPanel;
