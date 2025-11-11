-- Ver últimos registros de EMP333 para diagnosticar qué se guardó
SELECT id, employee_id, date, time_in, time_out, hours_worked, created_at 
FROM timecards 
WHERE employee_id = 8 
ORDER BY created_at DESC 
LIMIT 5;
