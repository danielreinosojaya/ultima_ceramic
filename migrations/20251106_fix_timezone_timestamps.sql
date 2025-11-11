-- CORREGIR TIMESTAMPS GUARDADOS CON OFFSET INCORRECTO
-- Los timestamps fueron guardados sumando 5 horas a UTC (error en getUTCHours de Date fake)
-- Se identifica: hora almacenada > 12 (que debería ser < 13 en tiempo real)
-- Necesario: restarles 5 horas para obtener la hora correcta

-- Actualizar time_in: restar 5 horas a registros con problema
UPDATE timecards
SET time_in = time_in - INTERVAL '5 hours'
WHERE time_in IS NOT NULL
  AND DATE(time_in) >= '2025-11-06'
  AND EXTRACT(HOUR FROM time_in AT TIME ZONE 'UTC') > 12; -- Identificar registros con offset

-- Actualizar time_out: restar 5 horas a registros con problema  
UPDATE timecards
SET time_out = time_out - INTERVAL '5 hours'
WHERE time_out IS NOT NULL
  AND DATE(time_out) >= '2025-11-06'
  AND EXTRACT(HOUR FROM time_out AT TIME ZONE 'UTC') > 12;

-- Recalcular hours_worked después de la corrección
UPDATE timecards
SET hours_worked = EXTRACT(EPOCH FROM (time_out - time_in)) / 3600
WHERE time_out IS NOT NULL
  AND time_in IS NOT NULL
  AND DATE(time_in) >= '2025-11-06';
