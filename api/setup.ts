import { sql } from '@vercel/postgres';

/**
 * Endpoint de setup único - Inicializa BD una sola vez
 * Llamar a: /api/setup?token=SETUP_SECRET
 */
export default async function handler(req: any, res: any) {
  const { token } = req.query;
  const SETUP_TOKEN = 'setup_ceramic_2025';

  // Validar token
  if (token !== SETUP_TOKEN) {
    return res.status(401).json({ success: false, error: 'Acceso denegado' });
  }

  try {
    console.log('[setup] Iniciando setup de base de datos...');

    // 1. Crear tabla employees
    await sql`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        position VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active',
        hire_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('[setup] ✅ Tabla employees creada');

    // 2. Crear tabla timecards
    await sql`
      CREATE TABLE IF NOT EXISTS timecards (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        time_in TIMESTAMP,
        time_out TIMESTAMP,
        hours_worked DECIMAL(5,2),
        notes VARCHAR(255),
        edited_by INTEGER REFERENCES employees(id),
        edited_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('[setup] ✅ Tabla timecards creada');

    // 3. Crear tabla timecard_audit CON SCHEMA CORRECTO
    await sql`
      CREATE TABLE IF NOT EXISTS timecard_audit (
        id SERIAL PRIMARY KEY,
        timecard_id INTEGER REFERENCES timecards(id) ON DELETE CASCADE,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        action VARCHAR(50),
        changes TEXT,
        admin_code VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('[setup] ✅ Tabla timecard_audit creada');

    // 4. Crear tabla admin_codes
    await sql`
      CREATE TABLE IF NOT EXISTS admin_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('[setup] ✅ Tabla admin_codes creada');

    // 5. Crear índices
    await sql`CREATE INDEX IF NOT EXISTS idx_timecards_employee ON timecards(employee_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_timecards_date ON timecards(date)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_timecards_per_day ON timecards(employee_id, date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_timecard ON timecard_audit(timecard_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_employee ON timecard_audit(employee_id)`;
    console.log('[setup] ✅ Índices creados');

    // 6. Insertar admin code por defecto
    try {
      await sql`
        INSERT INTO admin_codes (code, password_hash, active, created_at)
        VALUES ('ADMIN2025', '$2b$10$xK1.kJ3mL9oP2qR4sT5uG.u9mW8xY7zA6bC5dE4fG3hI2jK1lM0nO', true, NOW())
        ON CONFLICT (code) DO NOTHING
      `;
      console.log('[setup] ✅ Admin code ADMIN2025 inicializado');
    } catch (e) {
      console.log('[setup] ℹ️ Admin code ya existe');
    }

    return res.status(200).json({
      success: true,
      message: 'Base de datos inicializada correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[setup] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Error al inicializar base de datos'
    });
  }
}
