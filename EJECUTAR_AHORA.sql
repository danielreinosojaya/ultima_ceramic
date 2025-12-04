-- ========================================
-- EJECUTAR ESTO EN VERCEL POSTGRES AHORA
-- ========================================

-- 1. Ver los registros corruptos (date != fecha real del time_in)
SELECT 
    t.id,
    e.name as empleado,
    t.date as date_column,
    t.time_in,
    DATE(t.time_in AT TIME ZONE 'UTC') as fecha_real_utc,
    DATE(t.time_in) as fecha_timestamp,
    CASE 
        WHEN t.date::text != DATE(t.time_in)::text THEN '❌ CORRUPTO'
        ELSE '✅ OK'
    END as estado
FROM timecards t
LEFT JOIN employees e ON t.employee_id = e.id
WHERE t.date >= '2025-12-02'
ORDER BY t.id DESC;

-- 2. ELIMINAR registros corruptos (donde date no coincide con la fecha del timestamp)
DELETE FROM timecards
WHERE date::text != DATE(time_in)::text
  AND date >= '2025-12-02';

-- 3. Verificar qué quedó
SELECT 
    t.id,
    e.name,
    t.date,
    t.time_in,
    t.time_out
FROM timecards t
LEFT JOIN employees e ON t.employee_id = e.id
WHERE t.date >= '2025-12-02'
ORDER BY t.id DESC;
