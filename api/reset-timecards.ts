import { sql } from '@vercel/postgres';

/**
 * Endpoint para resetear base de datos de timecards
 * DESTRUCTIVO: Elimina todas las tablas y las recrea
 * Llamar a: /api/reset-timecards?token=RESET_SECRET
 */
export default async function handler(req: any, res: any) {
  const { token } = req.query;
  const RESET_TOKEN = 'reset_timecards_2025';

  // Validar token
  if (token !== RESET_TOKEN) {
    return res.status(401).json({ success: false, error: 'Acceso denegado' });
  }

  try {
    console.log('[reset] Iniciando reset DESTRUCTIVO de base de datos...');

    // 1. Dropear tablas en orden inverso de dependencias
    try {
      await sql`DROP TABLE IF EXISTS timecard_audit CASCADE`;
      console.log('[reset] ✅ Tabla timecard_audit eliminada');
    } catch (e) {
      console.log('[reset] ℹ️ timecard_audit no existía');
    }

    try {
      await sql`DROP TABLE IF EXISTS timecards CASCADE`;
      console.log('[reset] ✅ Tabla timecards eliminada');
    } catch (e) {
      console.log('[reset] ℹ️ timecards no existía');
    }

    try {
      await sql`DROP TABLE IF EXISTS employees CASCADE`;
      console.log('[reset] ✅ Tabla employees eliminada');
    } catch (e) {
      console.log('[reset] ℹ️ employees no existía');
    }

    try {
      await sql`DROP TABLE IF EXISTS admin_codes CASCADE`;
      console.log('[reset] ✅ Tabla admin_codes eliminada');
    } catch (e) {
      console.log('[reset] ℹ️ admin_codes no existía');
    }

    // 2. Recrear tablas con schema CORRECTO
    await sql`
      CREATE TABLE employees (
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
    console.log('[reset] ✅ Tabla employees creada');

    await sql`
      CREATE TABLE timecards (
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
    console.log('[reset] ✅ Tabla timecards creada');

    await sql`
      CREATE TABLE timecard_audit (
        id SERIAL PRIMARY KEY,
        timecard_id INTEGER REFERENCES timecards(id) ON DELETE CASCADE,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        action VARCHAR(50),
        changes TEXT,
        admin_code VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('[reset] ✅ Tabla timecard_audit creada con schema correcto');

    await sql`
      CREATE TABLE admin_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('[reset] ✅ Tabla admin_codes creada');

    // 3. Crear índices
    await sql`CREATE INDEX idx_timecards_employee ON timecards(employee_id)`;
    await sql`CREATE INDEX idx_timecards_date ON timecards(date)`;
    await sql`CREATE UNIQUE INDEX idx_timecards_per_day ON timecards(employee_id, date)`;
    await sql`CREATE INDEX idx_employees_code ON employees(code)`;
    await sql`CREATE INDEX idx_employees_status ON employees(status)`;
    await sql`CREATE INDEX idx_audit_timecard ON timecard_audit(timecard_id)`;
    await sql`CREATE INDEX idx_audit_employee ON timecard_audit(employee_id)`;
    console.log('[reset] ✅ Índices creados');

    // 4. Insertar admin code por defecto
    await sql`
      INSERT INTO admin_codes (code, password_hash, active, created_at)
      VALUES ('ADMIN2025', '$2b$10$xK1.kJ3mL9oP2qR4sT5uG.u9mW8xY7zA6bC5dE4fG3hI2jK1lM0nO', true, NOW())
    `;
    console.log('[reset] ✅ Admin code ADMIN2025 inicializado');

    return res.status(200).json({
      success: true,
      message: '🔄 Base de datos reseteada completamente con schema correcto',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[reset] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Error al resetear base de datos'
    });
  }
}
