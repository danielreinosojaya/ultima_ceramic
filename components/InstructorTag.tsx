
import React, { useMemo } from 'react';
import type { Instructor } from '../types';
import { PALETTE_COLORS } from '../constants';
import { useLanguage } from '../context/LanguageContext';

interface InstructorTagProps {
  instructorId: number;
  instructors: Instructor[];
}

const colorMap = PALETTE_COLORS.reduce((acc, color) => {
    acc[color.name] = { bg: color.bg };
    return acc;
}, {} as Record<string, { bg: string }>);
const defaultColors = { bg: 'bg-gray-400' };

export const InstructorTag: React.FC<InstructorTagProps> = ({ instructorId, instructors }) => {
  const { t } = useLanguage();
  const instructor = useMemo(() => {
    return instructors.find(i => i.id === instructorId);
  }, [instructorId, instructors]);

  if (!instructor) {
    return null;
  }
  
  const color = colorMap[instructor.colorScheme]?.bg || defaultColors.bg;

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${color}`}></span>
      <div>
        <p className="text-xs font-medium text-brand-secondary leading-tight">{t('summary.instructorHeader')}</p>
        <p className="text-sm font-semibold text-brand-text leading-tight">{instructor.name}</p>
      </div>
    </div>
  );
};
