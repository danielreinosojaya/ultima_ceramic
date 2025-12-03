-- LIMPIEZA DE DATOS CORRUPTOS: Eliminar registros que no son de hoy
-- Ejecutar esto en Vercel Postgres

-- 1. Ver qué registros tienen date de hoy pero timestamps de ayer
SELECT 
    t.id,
    e.name,
    t.date as date_column,
    t.time_in,
    DATE(t.time_in AT TIME ZONE 'America/Guayaquil') as time_in_date_ecuador,
    CASE 
        WHEN t.date != DATE(t.time_in AT TIME ZONE 'America/Guayaquil') THEN 'INCONSISTENTE'
        ELSE 'OK'
    END as status
FROM timecards t
JOIN employees e ON t.employee_id = e.id
WHERE t.date >= '2025-12-02'
ORDER BY t.date DESC, t.time_in DESC;

-- 2. ELIMINAR registros inconsistentes (date no coincide con time_in)
DELETE FROM timecards
WHERE date != DATE(time_in AT TIME ZONE 'America/Guayaquil');

-- 3. Verificar qué queda
SELECT 
    DATE(time_in AT TIME ZONE 'America/Guayaquil') as fecha_real,
    COUNT(*) as cantidad
FROM timecards
WHERE date >= '2025-12-02'
GROUP BY DATE(time_in AT TIME ZONE 'America/Guayaquil')
ORDER BY fecha_real DESC;
