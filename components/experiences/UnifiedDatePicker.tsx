import React, { useMemo } from 'react';

export interface UnifiedDatePickerProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  availableDates: string[];
  currentMonth: Date;
  onMonthChange: (direction: 'prev' | 'next') => void;
  monthName: string;
  disabledDates?: string[];
  showDayHeaders?: boolean;
}

/**
 * UNIFIED DATE PICKER COMPONENT
 * Used by: GroupClassWizard, SingleClassWizard, CustomExperienceWizard, PieceExperienceWizard
 * Single source of truth for calendar UI/UX across all modules
 */
export const UnifiedDatePicker: React.FC<UnifiedDatePickerProps> = ({
  selectedDate,
  onDateSelect,
  availableDates,
  currentMonth,
  onMonthChange,
  monthName,
  disabledDates = [],
  showDayHeaders = true
}) => {
  // Parse dates helper
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Generate month days
  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  }, [currentMonth]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onMonthChange('prev')}
          className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
        >
          ← Anterior
        </button>
        <h3 className="text-lg font-bold text-gray-800">
          {monthName}
        </h3>
        <button
          onClick={() => onMonthChange('next')}
          className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
        >
          Siguiente →
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(d => (
          <div key={d} className="text-center text-xs font-bold text-gray-500 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {monthDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} />;
          }

          const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = selectedDate === dateStr;
          const isAvailable = availableDates.includes(dateStr) && !disabledDates.includes(dateStr);
          const isDisabled = !isAvailable;

          return (
            <button
              key={day}
              onClick={() => !isDisabled && onDateSelect(dateStr)}
              disabled={isDisabled}
              className={`p-2 rounded-lg border-2 transition-all text-center font-bold text-sm ${
                isSelected
                  ? 'border-blue-500 bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                  : isDisabled
                  ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default UnifiedDatePicker;
