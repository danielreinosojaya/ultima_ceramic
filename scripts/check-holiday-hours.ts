/**
 * Comprueba que las fiestas no muevan un día normal
 * y que cada fecha de la lista corte donde debe.
 * Sale con código 1 si algo no cuadra.
 */
import {
    getBusinessStartTimesForDate,
    getMaxClassStartMinutesForDate,
    isClassStartWithinBusinessHours,
} from '../utils/businessHours.ts';
import { setHolidayHoursActive } from '../utils/holidayHours.ts';
import { isStudioClosedOnDate } from '../utils/studioClosedDates.ts';
import { adjustFixedTimesForHoliday } from '../utils/holidayHours.ts';

const failures: string[] = [];

function expect(label: string, actual: unknown, expected: unknown) {
    const same = JSON.stringify(actual) === JSON.stringify(expected);
    if (!same) failures.push(`${label}: esperaba ${JSON.stringify(expected)}, obtuvo ${JSON.stringify(actual)}`);
}

function allows(date: string, time: string): boolean {
    return isClassStartWithinBusinessHours(date, time);
}

function canBook(date: string, time: string): boolean {
    return !isStudioClosedOnDate(date) && allows(date, time);
}

setHolidayHoursActive(true);

expect('lunes nov cerrado', allows('2026-11-16', '10:00'), false);
expect('lunes nov no es cierre de fiesta', isStudioClosedOnDate('2026-11-16'), false);
expect('lunes nov sin último inicio', getMaxClassStartMinutesForDate('2026-11-16'), null);

expect('martes 18:00', allows('2026-11-17', '18:00'), true);
expect('martes 18:30', allows('2026-11-17', '18:30'), false);
expect('domingo 15:00', allows('2026-11-22', '15:00'), true);
expect('domingo 18:00', allows('2026-11-22', '18:00'), false);

expect('5 ago 18:30', allows('2026-08-05', '18:30'), true);
expect('1 nov cerrado', isStudioClosedOnDate('2026-11-01'), true);
expect('1 nov no se reserva', canBook('2026-11-01', '10:00'), false);
expect('1 nov mantiene el horario de domingo', allows('2026-11-01', '10:00'), true);

expect('22 dic no cerrado', isStudioClosedOnDate('2026-12-22'), false);
expect('22 dic 18:00', allows('2026-12-22', '18:00'), true);
expect('22 dic 18:30', allows('2026-12-22', '18:30'), false);
expect('22 dic último inicio habitual', getMaxClassStartMinutesForDate('2026-12-22'), 18 * 60);

expect('5 ene no cerrado', isStudioClosedOnDate('2027-01-05'), false);
expect('5 ene 18:00', allows('2027-01-05', '18:00'), true);
expect('5 ene 18:30', allows('2027-01-05', '18:30'), false);

for (const date of ['2026-12-21', '2026-12-28']) {
    expect(`${date} 10:00`, allows(date, '10:00'), true);
    expect(`${date} 18:00`, allows(date, '18:00'), true);
    expect(`${date} 09:30`, allows(date, '09:30'), false);
    expect(`${date} 18:30`, allows(date, '18:30'), false);
    expect(`${date} abierto`, isStudioClosedOnDate(date), false);
}

expect('23 dic 15:00', allows('2026-12-23', '15:00'), true);
expect('23 dic 15:30', allows('2026-12-23', '15:30'), false);
expect('23 dic 16:00', allows('2026-12-23', '16:00'), false);

expect('26 dic 09:00', allows('2026-12-26', '09:00'), false);
expect('26 dic 10:00', allows('2026-12-26', '10:00'), true);
expect('26 dic 18:00', allows('2026-12-26', '18:00'), true);

expect('27 dic 18:00', allows('2026-12-27', '18:00'), true);
expect('27 dic 18:30', allows('2026-12-27', '18:30'), false);
expect('29 dic 18:00', allows('2026-12-29', '18:00'), true);
expect('29 dic mismo tope que un martes', getMaxClassStartMinutesForDate('2026-12-29'), 18 * 60);

for (const date of ['2026-12-24', '2026-12-25', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04']) {
    expect(`${date} cerrado`, isStudioClosedOnDate(date), true);
    expect(`${date} 10:00`, allows(date, '10:00'), false);
    expect(`${date} 18:00`, allows(date, '18:00'), false);
}

const mondayGrid = getBusinessStartTimesForDate('2026-12-21');
expect('21 dic incluye 10:00', mondayGrid.includes('10:00'), true);
expect('21 dic incluye 18:00', mondayGrid.includes('18:00'), true);
expect('21 dic no incluye 18:30', mondayGrid.includes('18:30'), false);

const earlyClose = getBusinessStartTimesForDate('2026-12-23');
expect('23 dic incluye 15:00', earlyClose.includes('15:00'), true);
expect('23 dic no incluye 15:30', earlyClose.includes('15:30'), false);

const wednesdayFixed = adjustFixedTimesForHoliday('2026-12-23', ['10:00', '11:00', '14:00', '16:00', '18:00']);
expect('23 dic fijos', wednesdayFixed, ['10:00', '11:00', '14:00']);

const mondayFixed = adjustFixedTimesForHoliday('2026-12-21', []);
expect('21 dic fijos', mondayFixed, ['10:00', '12:00', '14:00', '16:00', '18:00']);

const untouched = ['10:00', '18:00'];
expect('martes normal no toca la lista', adjustFixedTimesForHoliday('2026-11-17', untouched), untouched);

const normalTuesday = getBusinessStartTimesForDate('2026-11-17');
expect('martes normal arranca 10:00', normalTuesday[0], '10:00');
expect('martes normal cierra en 18:00', normalTuesday[normalTuesday.length - 1], '18:00');
expect('martes normal sin 18:30', normalTuesday.includes('18:30'), false);

setHolidayHoursActive(false);
try {
    expect('interruptor: 21 dic como lunes', allows('2026-12-21', '10:00'), false);
    expect('interruptor: 21 dic sin cierre de fiesta', isStudioClosedOnDate('2026-12-21'), false);
    expect('interruptor: 21 dic sin último inicio', getMaxClassStartMinutesForDate('2026-12-21'), null);
    expect('interruptor: 24 dic no cerrado', isStudioClosedOnDate('2026-12-24'), false);
    expect('interruptor: 1 nov sigue cerrado', isStudioClosedOnDate('2026-11-01'), true);
    expect('interruptor: martes sigue 18:00', allows('2026-11-17', '18:00'), true);
} finally {
    setHolidayHoursActive(true);
}

if (failures.length > 0) {
    console.error(`Horarios de fiesta: ${failures.length} fallo(s)`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

console.log('Horarios de fiesta: todas las fechas de control coinciden.');
