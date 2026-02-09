-- Crear tabla para inscripciones de San Valentín 2026
-- Ejecutar en Vercel Postgres Dashboard o con vercel env pull

CREATE TABLE IF NOT EXISTS valentine_registrations (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    birth_date DATE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(200) NOT NULL,
    workshop VARCHAR(50) NOT NULL CHECK (workshop IN ('florero_arreglo_floral', 'modelado_san_valentin', 'torno_san_valentin')),
    participants INTEGER NOT NULL DEFAULT 1 CHECK (participants IN (1, 2)),
    payment_proof_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_valentine_workshop ON valentine_registrations(workshop);
CREATE INDEX IF NOT EXISTS idx_valentine_status ON valentine_registrations(status);
CREATE INDEX IF NOT EXISTS idx_valentine_email ON valentine_registrations(email);
CREATE INDEX IF NOT EXISTS idx_valentine_created ON valentine_registrations(created_at DESC);

-- Verificar que se creó correctamente
SELECT 'Tabla creada exitosamente' as status;

-- Ver estructura
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'valentine_registrations'
ORDER BY ordinal_position;
