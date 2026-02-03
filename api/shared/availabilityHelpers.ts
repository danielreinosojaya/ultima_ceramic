// Shared utilities for slot availability calculations
import { sql } from '@vercel/postgres';

// ============ SLOT AVAILABILITY HELPERS ============

export const parseSlotAvailabilitySettings = async () => {
    const settingsResult = await sql`SELECT * FROM settings WHERE key IN ('availability', 'scheduleOverrides', 'classCapacity')`;
    const availability: any = settingsResult.rows.find(s => s.key === 'availability')?.value || 
        { Sunday: [], Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] };
    const scheduleOverrides: any = settingsResult.rows.find(s => s.key === 'scheduleOverrides')?.value || {};
    const classCapacity: any = settingsResult.rows.find(s => s.key === 'classCapacity')?.value || 
        { potters_wheel: 8, molding: 22, introductory_class: 8 };
    return { availability, scheduleOverrides, classCapacity };
};

export const slotTechniqueKey = (tech: string) => {
    if (tech === 'hand_modeling' || tech === 'painting' || tech === 'molding') return 'molding';
    if (tech === 'potters_wheel') return 'potters_wheel';
    return tech;
};

export const getMaxCapacityMap = (classCapacity: any): Record<string, number> => ({
    'potters_wheel': classCapacity.potters_wheel || 8,
    'hand_modeling': classCapacity.molding || 22,
    'painting': classCapacity.molding || 22,
    'molding': classCapacity.molding || 22
});

export const getMaxCapacityForTechnique = (tech: string, maxCapacityMap: Record<string, number>) => {
    const key = slotTechniqueKey(tech);
    const cap = maxCapacityMap[tech] ?? maxCapacityMap[key];
    return Number.isFinite(cap) ? (cap as number) : 22;
};

export const resolveCapacity = (dateStr: string, tech: string, maxCapacityMap: Record<string, number>, scheduleOverrides: any) => {
    const override = scheduleOverrides[dateStr];
    const overrideCap = override?.capacity;
    if (typeof overrideCap === 'number' && overrideCap > 0) return overrideCap;
    return getMaxCapacityForTechnique(tech, maxCapacityMap);
};
