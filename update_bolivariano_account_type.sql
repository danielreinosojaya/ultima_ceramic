-- Actualizar tipo de cuenta del Banco Bolivariano de "Cuenta Corriente" a "Ahorros"

UPDATE settings
SET data = jsonb_set(
    data,
    '{1,accountType}',
    '"Ahorros"'
)
WHERE key = 'bankDetails'
AND data->>1 IS NOT NULL
AND data->1->>'bankName' = 'Banco Bolivariano';

-- Verificar el cambio
SELECT 
    key,
    data->1->>'bankName' as banco,
    data->1->>'accountType' as tipo_cuenta
FROM settings
WHERE key = 'bankDetails';
