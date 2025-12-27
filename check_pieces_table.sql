-- Verificar si la tabla pieces existe y su estructura
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'pieces'
ORDER BY 
    ordinal_position;

-- Contar registros
SELECT COUNT(*) as total_pieces FROM pieces;

-- Ver algunos ejemplos
SELECT * FROM pieces LIMIT 5;
