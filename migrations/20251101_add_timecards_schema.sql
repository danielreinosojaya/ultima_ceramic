-- Tabla: employees (gestión de empleados para marcación)
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
);

-- Tabla: timecards (registro de marcación entrada/salida)
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
);

-- Tabla: timecard_audit (auditoría de cambios)
CREATE TABLE IF NOT EXISTS timecard_audit (
  id SERIAL PRIMARY KEY,
  timecard_id INTEGER REFERENCES timecards(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  action VARCHAR(50),
  changes TEXT,
  admin_code VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: admin_codes (contraseñas admin seguras)
CREATE TABLE IF NOT EXISTS admin_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_timecards_employee ON timecards(employee_id);
CREATE INDEX IF NOT EXISTS idx_timecards_date ON timecards(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_timecards_per_day ON timecards(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(code);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
