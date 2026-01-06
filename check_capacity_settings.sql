-- Verificar settings de classCapacity
SELECT key, value FROM settings WHERE key = 'classCapacity';

-- Verificar scheduleOverrides
SELECT key, value FROM settings WHERE key = 'scheduleOverrides';

-- Ver todos los settings
SELECT key, value FROM settings ORDER BY key;
