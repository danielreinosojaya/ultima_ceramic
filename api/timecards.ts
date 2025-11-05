import { sql } from '@vercel/postgres';
import type { Employee, Timecard, ClockInResponse, ClockOutResponse, AdminDashboardStats } from '../types/timecard';

// Utilidades
const ADMIN_CODE_PREFIX = 'ADMIN';
const EMPLOYEE_CODE_PREFIX = 'EMP';

// Convertir snake_case a camelCase
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  }
  if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result: any, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {});
  }
  return obj;
}

async function verifyAdminCode(adminCode: string): Promise<boolean> {
  try {
    if (!adminCode) {
      return false;
    }

    // Permitir ADMIN2025 como código por defecto - SIEMPRE
    if (adminCode === 'ADMIN2025') {
      // Intentar crear el código si no existe
      try {
        await sql`
          INSERT INTO admin_codes (code, password_hash, active, created_at)
          VALUES ('ADMIN2025', '$2b$10$xK1.kJ3mL9oP2qR4sT5uG.u9mW8xY7zA6bC5dE4fG3hI2jK1lM0nO', true, NOW())
          ON CONFLICT (code) DO UPDATE SET active = true
        `;
      } catch (e) {
        // Ignore error, código ya existe
      }
      return true;
    }

    // Para otros códigos, verificar en BD
    if (!adminCode.startsWith(ADMIN_CODE_PREFIX)) {
      return false;
    }

    const result = await sql`
      SELECT id FROM admin_codes
      WHERE code = ${adminCode} AND active = true
      LIMIT 1
    `;

    return result.rows.length > 0;
  } catch (error) {
    console.error('[verifyAdminCode] Error:', error);
    // Si hay error de BD, permitir ADMIN2025
    return adminCode === 'ADMIN2025';
  }
}

async function ensureTablesExist(): Promise<void> {
  try {
    console.log('[ensureTablesExist] Starting table initialization');

    // Crear tabla employees
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
    console.log('[ensureTablesExist] employees table ready');

    // Crear tabla timecards con estructura robusta
    await sql`
      CREATE TABLE IF NOT EXISTS timecards (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        date DATE NOT NULL,
        time_in TIMESTAMP,
        time_out TIMESTAMP,
        hours_worked DECIMAL(5,2),
        notes VARCHAR(255),
        edited_by INTEGER,
        edited_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_timecards_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `;
    console.log('[ensureTablesExist] timecards table ready');

    // Crear tabla timecard_audit
    await sql`
      CREATE TABLE IF NOT EXISTS timecard_audit (
        id SERIAL PRIMARY KEY,
        timecard_id INTEGER,
        employee_id INTEGER NOT NULL,
        action VARCHAR(50),
        changes TEXT,
        admin_code VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_audit_timecard FOREIGN KEY (timecard_id) REFERENCES timecards(id) ON DELETE CASCADE,
        CONSTRAINT fk_audit_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `;
    console.log('[ensureTablesExist] timecard_audit table ready');

    // Crear tabla admin_codes
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
    console.log('[ensureTablesExist] admin_codes table ready');

    // Crear índices (sin restricciones UNIQUE adicionales que compliquen inserciones)
    await sql`CREATE INDEX IF NOT EXISTS idx_timecards_employee ON timecards(employee_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_timecards_date ON timecards(date)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_timecards_per_day ON timecards(employee_id, date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_timecard ON timecard_audit(timecard_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_employee ON timecard_audit(employee_id)`;
    console.log('[ensureTablesExist] All indexes created');

    console.log('[ensureTablesExist] Table initialization completed successfully');
  } catch (error) {
    console.error('[ensureTablesExist] Error:', error);
    // No lanzar error, intentar continuar
  }
}

async function findEmployeeByCode(code: string): Promise<Employee | null> {
  try {
    const result = await sql`
      SELECT * FROM employees
      WHERE code = ${code} AND status = 'active'
      LIMIT 1
    `;

    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    
    // Asegurar que el ID sea un número válido
    const employee: Employee = {
      id: Number(row.id),
      code: String(row.code),
      name: String(row.name),
      email: row.email ? String(row.email) : undefined,
      position: row.position ? String(row.position) : undefined,
      status: (row.status || 'active') as 'active' | 'inactive' | 'on_leave',
      hire_date: row.hire_date ? String(row.hire_date) : undefined,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };

    if (isNaN(employee.id)) {
      console.error('[findEmployeeByCode] Invalid employee ID conversion:', { original: row.id, converted: employee.id });
      return null;
    }

    console.log('[findEmployeeByCode] Found employee:', { code, id: employee.id });
    return employee;
  } catch (error) {
    console.error('[findEmployeeByCode] Error:', error);
    return null;
  }
}

async function getTodayTimecard(employeeId: number): Promise<Timecard | null> {
  try {
    // Validar que employeeId sea un número válido
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      console.error('[getTodayTimecard] Invalid employeeId:', employeeId);
      return null;
    }

    // Obtener la fecha de hoy en zona horaria de Bogotá (UTC-5)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Bogota'
    });
    const today = formatter.format(now);
    
    console.log('[getTodayTimecard] Querying for:', { employeeId, date: today });
    
    const result = await sql`
      SELECT * FROM timecards
      WHERE employee_id = ${employeeId} AND date = ${today}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      console.log('[getTodayTimecard] No timecard found for today');
      return null;
    }

    const row = result.rows[0];
    const timecard: Timecard = {
      id: Number(row.id),
      employee_id: Number(row.employee_id),
      date: String(row.date),
      time_in: row.time_in ? new Date(row.time_in).toISOString() : undefined,
      time_out: row.time_out ? new Date(row.time_out).toISOString() : undefined,
      hours_worked: row.hours_worked ? Number(row.hours_worked) : undefined,
      notes: row.notes ? String(row.notes) : undefined,
      edited_by: row.edited_by ? Number(row.edited_by) : undefined,
      edited_at: row.edited_at ? new Date(row.edited_at).toISOString() : undefined,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };

    console.log('[getTodayTimecard] Found timecard:', { id: timecard.id, employee_id: timecard.employee_id });
    return timecard;
  } catch (error) {
    console.error('[getTodayTimecard] Error:', error);
    return null;
  }
}

async function calculateHours(timeIn: Date, timeOut: Date): Promise<number> {
  const diffMs = timeOut.getTime() - timeIn.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100; // Redondear a 2 decimales
}

// Handler principal
export default async function handler(req: any, res: any) {
  const { action, code, adminCode, month, year, startDate, endDate, format } = req.query;

  try {
    switch (action) {
      case 'clock_in':
        return await handleClockIn(req, res, code);
      
      case 'clock_out':
        return await handleClockOut(req, res, code);
      
      case 'get_admin_dashboard':
        return await handleGetAdminDashboard(req, res, adminCode);
      
      case 'get_employee_report':
        return await handleGetEmployeeReport(req, res, code, month, year);
      
      case 'download_report':
        return await handleDownloadReport(req, res, adminCode, format, startDate, endDate);
      
      case 'create_employee':
        return await handleCreateEmployee(req, res, adminCode);
      
      case 'list_employees':
        return await handleListEmployees(req, res, adminCode);
      
      case 'get_timecard_history':
        return await handleGetTimecardHistory(req, res, adminCode);
      
      case 'delete_timecard':
        return await handleDeleteTimecard(req, res, adminCode, req.query.timecardId);
      
      case 'update_timecard':
        return await handleUpdateTimecard(req, res, adminCode, req.query.timecardId);
      
      case 'delete_employee':
        return await handleDeleteEmployee(req, res, adminCode, req.query.employeeId);
      
      case 'hard_delete_employee':
        return await handleHardDeleteEmployee(req, res, adminCode, req.query.employeeId);
      
      default:
        return res.status(400).json({ success: false, error: 'Acción no válida' });
    }
  } catch (error) {
    console.error('[timecards handler] Error:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

// HANDLERS

async function handleClockIn(req: any, res: any, code: string): Promise<any> {
  if (!code) {
    return res.status(400).json({ success: false, message: 'Código requerido' } as ClockInResponse);
  }

  const employee = await findEmployeeByCode(code);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Empleado no encontrado' } as ClockInResponse);
  }

  const existingTimecard = await getTodayTimecard(employee.id);
  if (existingTimecard && existingTimecard.time_in) {
    return res.status(400).json({ 
      success: false, 
      message: `Ya marcaste entrada hoy a las ${new Date(existingTimecard.time_in).toLocaleTimeString()}`,
      today_hours: existingTimecard.hours_worked || 0
    } as ClockInResponse);
  }

  try {
    // Validaciones previas
    if (!employee.id || typeof employee.id !== 'number') {
      console.error('[handleClockIn] Invalid employee.id:', { id: employee.id, type: typeof employee.id });
      return res.status(500).json({ success: false, message: 'Error: ID de empleado inválido' } as ClockInResponse);
    }

    // Asegurar que las tablas existen antes de insertar
    await ensureTablesExist();

    const now = new Date();
    // Obtener fecha/hora en zona horaria de Bogotá
    const formatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Bogota'
    });
    const today = formatter.format(now);
    const isoTimestamp = now.toISOString();

    console.log('[handleClockIn] Inserting timecard:', {
      employee_id: employee.id,
      date: today,
      time_in: isoTimestamp,
      employeeCode: employee.code
    });

    const insertResult = await sql`
      INSERT INTO timecards (employee_id, date, time_in)
      VALUES (${employee.id}, ${today}, ${isoTimestamp})
      RETURNING id
    `;

    if (!insertResult.rows || insertResult.rows.length === 0) {
      console.error('[handleClockIn] Insert returned no rows');
      return res.status(500).json({ success: false, message: 'Error al guardar entrada' } as ClockInResponse);
    }

    console.log('[handleClockIn] Timecard inserted successfully:', insertResult.rows[0]);

    // Formato de hora con zona horaria para display
    const timeStr = now.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'America/Bogota'
    });

    return res.status(200).json({
      success: true,
      message: `Entrada registrada correctamente a las ${timeStr}`,
      employee,
      timestamp: isoTimestamp,
      displayTime: timeStr
    } as ClockInResponse);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code;
    
    console.error('[handleClockIn] Error details:', {
      errorMessage: errorMsg,
      errorCode: errorCode,
      errorDetail: (error as any)?.detail,
      employeeId: employee.id,
      employeeCode: employee.code
    });

    // Manejar errores específicos de PostgreSQL
    if (errorCode === '23505') {
      // UNIQUE constraint violation - ya existe un registro para hoy
      console.warn('[handleClockIn] Already has entry today');
      return res.status(400).json({ 
        success: false, 
        message: 'Ya has marcado entrada hoy'
      } as ClockInResponse);
    }

    if (errorCode === '23502') {
      // NOT NULL constraint violation
      console.error('[handleClockIn] NOT NULL constraint failed');
      return res.status(500).json({ 
        success: false, 
        message: 'Error: datos inválidos para registrar entrada'
      } as ClockInResponse);
    }

    if (errorCode === '23503') {
      // FOREIGN KEY constraint violation
      console.error('[handleClockIn] FOREIGN KEY constraint failed - employee_id might be invalid');
      return res.status(500).json({ 
        success: false, 
        message: 'Error: empleado no existe en la base de datos'
      } as ClockInResponse);
    }

    return res.status(500).json({ 
      success: false, 
      message: 'Error al registrar entrada',
      debug: errorMsg
    } as any);
  }
}

async function handleClockOut(req: any, res: any, code: string): Promise<any> {
  if (!code) {
    return res.status(400).json({ success: false, message: 'Código requerido' } as ClockOutResponse);
  }

  const employee = await findEmployeeByCode(code);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Empleado no encontrado' } as ClockOutResponse);
  }

  const timecard = await getTodayTimecard(employee.id);
  if (!timecard || !timecard.time_in) {
    return res.status(400).json({ 
      success: false, 
      message: 'No hay registro de entrada hoy. Marca entrada primero.' 
    } as ClockOutResponse);
  }

  if (timecard.time_out) {
    return res.status(400).json({ 
      success: false, 
      message: `Ya marcaste salida hoy a las ${new Date(timecard.time_out).toLocaleTimeString()}` 
    } as ClockOutResponse);
  }

  try {
    const now = new Date();
    const timeIn = new Date(timecard.time_in);
    const hoursWorked = await calculateHours(timeIn, now);

    await sql`
      UPDATE timecards
      SET time_out = ${now.toISOString()},
          hours_worked = ${hoursWorked},
          updated_at = NOW()
      WHERE id = ${timecard.id}
    `;

    // Formato de hora con zona horaria para display
    const timeStr = now.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'America/Bogota'
    });

    return res.status(200).json({
      success: true,
      message: `Salida registrada correctamente a las ${timeStr}`,
      hours_worked: hoursWorked,
      timestamp: now.toISOString(),
      displayTime: timeStr
    } as ClockOutResponse);
  } catch (error) {
    console.error('[handleClockOut] Error:', error);
    return res.status(500).json({ success: false, message: 'Error al registrar salida' } as ClockOutResponse);
  }
}

async function handleGetAdminDashboard(req: any, res: any, adminCode: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  try {
    // Asegurar que las tablas existen
    await ensureTablesExist();

    // Obtener la fecha de hoy en zona horaria de Bogotá
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Bogota'
    });
    const today = formatter.format(now);

    // Total empleados activos
    const employeesResult = await sql`SELECT COUNT(*) as count FROM employees WHERE status = 'active'`;
    const totalEmployees = parseInt(employeesResult.rows[0].count);

    // Presentes hoy
    const presentResult = await sql`
      SELECT COUNT(DISTINCT employee_id) as count FROM timecards
      WHERE date = ${today} AND time_in IS NOT NULL
    `;
    const activeToday = parseInt(presentResult.rows[0].count);

    // Ausentes hoy
    const absentToday = totalEmployees - activeToday;

    // Tardanzas (entrada después de las 09:00)
    const lateResult = await sql`
      SELECT COUNT(*) as count FROM timecards
      WHERE date = ${today}
      AND time_in IS NOT NULL
      AND EXTRACT(HOUR FROM time_in) > 9 OR (EXTRACT(HOUR FROM time_in) = 9 AND EXTRACT(MINUTE FROM time_in) > 0)
    `;
    const lateToday = parseInt(lateResult.rows[0].count);

    // Promedio de horas
    const avgResult = await sql`
      SELECT AVG(hours_worked) as avg_hours FROM timecards
      WHERE date = ${today} AND hours_worked IS NOT NULL
    `;
    const averageHours = avgResult.rows[0].avg_hours ? Math.round(parseFloat(avgResult.rows[0].avg_hours) * 100) / 100 : 0;

    // Estado de empleados hoy
    const statusResult = await sql`
      SELECT 
        e.id, e.code, e.name, e.position,
        t.date, t.time_in, t.time_out, t.hours_worked
      FROM employees e
      LEFT JOIN timecards t ON e.id = t.employee_id AND t.date = ${today}
      WHERE e.status = 'active'
      ORDER BY e.name
    `;

    const employeesStatus = statusResult.rows.map((row: any) => ({
      employee: {
        id: row.id,
        code: row.code,
        name: row.name,
        position: row.position,
        status: 'active'
      },
      date: row.date || today,
      time_in: row.time_in,
      time_out: row.time_out,
      hours_worked: row.hours_worked,
      status: !row.time_in ? 'absent' : row.time_out ? 'present' : 'in_progress',
      is_current_day: true
    }));

    const dashboard: AdminDashboardStats = {
      total_employees: totalEmployees,
      active_today: activeToday,
      absent_today: absentToday,
      late_today: lateToday,
      average_hours_today: averageHours,
      employees_status: employeesStatus as any
    };

    return res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    console.error('[handleGetAdminDashboard] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener dashboard' });
  }
}

async function handleGetEmployeeReport(req: any, res: any, code: string, month: string, year: string): Promise<any> {
  if (!code) {
    return res.status(400).json({ success: false, error: 'Código requerido' });
  }

  const employee = await findEmployeeByCode(code);
  if (!employee) {
    return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
  }

  try {
    // Si no hay mes/año, retornar solo el estado de hoy (para UI de marcación)
    if (!month || !year) {
      // Obtener la fecha de hoy en zona horaria de Bogotá
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Bogota'
      });
      const todayStr = formatter.format(now);
      
      const todayResult = await sql`
        SELECT * FROM timecards
        WHERE employee_id = ${employee.id}
        AND date = ${todayStr}
        LIMIT 1
      `;

      const todayStatus = todayResult.rows.length > 0 
        ? toCamelCase(todayResult.rows[0]) as Timecard
        : null;

      return res.status(200).json({
        success: true,
        employee,
        todayStatus
      });
    }

    // Si hay mes/año, retornar reporte completo del mes
    const result = await sql`
      SELECT * FROM timecards
      WHERE employee_id = ${employee.id}
      AND EXTRACT(MONTH FROM date) = ${month}
      AND EXTRACT(YEAR FROM date) = ${year}
      ORDER BY date DESC
    `;

    const timecards = result.rows.map(row => toCamelCase(row)) as Timecard[];

    const totalHours = timecards.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const averageHours = timecards.length > 0 ? Math.round(totalHours / timecards.length * 100) / 100 : 0;
    const daysPresent = timecards.filter(t => t.time_in).length;

    return res.status(200).json({
      success: true,
      data: {
        employee,
        month: parseInt(month),
        year: parseInt(year),
        timecards,
        total_hours: totalHours,
        average_hours: averageHours,
        days_present: daysPresent
      }
    });
  } catch (error) {
    console.error('[handleGetEmployeeReport] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener reporte' });
  }
}

async function handleDownloadReport(req: any, res: any, adminCode: string, format: string, startDate: string, endDate: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  try {
    const result = await sql`
      SELECT 
        e.code, e.name, e.position,
        t.date, t.time_in, t.time_out, t.hours_worked
      FROM employees e
      LEFT JOIN timecards t ON e.id = t.employee_id
      WHERE (${startDate}::DATE IS NULL OR t.date >= ${startDate}::DATE)
      AND (${endDate}::DATE IS NULL OR t.date <= ${endDate}::DATE)
      AND e.status = 'active'
      ORDER BY e.name, t.date DESC
    `;

    if (format === 'csv') {
      let csv = 'Código,Nombre,Puesto,Fecha,Entrada,Salida,Horas\n';
      result.rows.forEach((row: any) => {
        const timeIn = row.time_in ? new Date(row.time_in).toLocaleTimeString() : '';
        const timeOut = row.time_out ? new Date(row.time_out).toLocaleTimeString() : '';
        csv += `${row.code},"${row.name}",${row.position || ''},${row.date},${timeIn},${timeOut},${row.hours_worked || ''}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="asistencia_${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    }

    return res.status(400).json({ success: false, error: 'Formato no soportado' });
  } catch (error) {
    console.error('[handleDownloadReport] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al descargar reporte' });
  }
}

async function handleCreateEmployee(req: any, res: any, adminCode: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  const { code, name, email, position } = req.body;

  if (!code || !name) {
    return res.status(400).json({ success: false, error: 'Código y nombre requeridos' });
  }

  // Validar y normalizar inputs fuera del try para que estén en scope
  const formattedCode = String(code).toUpperCase().trim();
  const formattedName = String(name).trim();
  
  if (!formattedCode || !formattedName) {
    return res.status(400).json({ success: false, error: 'Código y nombre no pueden estar vacíos' });
  }

  try {
    // Insertar empleado
    const result = await sql`
      INSERT INTO employees (code, name, email, position, status, created_at, updated_at)
      VALUES (${formattedCode}, ${formattedName}, ${email || null}, ${position || null}, 'active', NOW(), NOW())
      RETURNING id, code, name, email, position, status, created_at, updated_at
    `;

    if (result.rows.length === 0) {
      return res.status(500).json({ success: false, error: 'No se pudo crear el empleado' });
    }

    return res.status(201).json({
      success: true,
      data: toCamelCase(result.rows[0])
    });
  } catch (error: any) {
    console.error('[handleCreateEmployee] Error:', error);
    
    const errorMsg = error?.message || '';
    if (errorMsg.includes('duplicate') || errorMsg.includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'El código de empleado ya existe' });
    }
    if (errorMsg.includes('relation') || errorMsg.includes('does not exist')) {
      // Auto-inicializar BD y reintentar
      console.log('[handleCreateEmployee] BD no inicializada, creando tablas...');
      await ensureTablesExist();
      
      // Reintentar inserción
      try {
        const retryResult = await sql`
          INSERT INTO employees (code, name, email, position, status, created_at, updated_at)
          VALUES (${formattedCode}, ${formattedName}, ${email || null}, ${position || null}, 'active', NOW(), NOW())
          RETURNING id, code, name, email, position, status, created_at, updated_at
        `;
        
        return res.status(201).json({
          success: true,
          data: toCamelCase(retryResult.rows[0])
        });
      } catch (retryError: any) {
        return res.status(500).json({ success: false, error: `Error: ${retryError?.message}` });
      }
    }
    
    return res.status(500).json({ success: false, error: `Error: ${errorMsg}` });
  }
}

async function handleListEmployees(req: any, res: any, adminCode: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  try {
    // Asegurar que las tablas existen
    await ensureTablesExist();

    const result = await sql`
      SELECT * FROM employees
      WHERE status = 'active'
      ORDER BY name
    `;

    return res.status(200).json({
      success: true,
      data: result.rows.map(row => toCamelCase(row))
    });
  } catch (error) {
    console.error('[handleListEmployees] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al listar empleados' });
  }
}

async function handleGetTimecardHistory(req: any, res: any, adminCode: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  const { employeeId, startDate, endDate } = req.query;

  try {
    const result = await sql`
      SELECT * FROM timecards
      WHERE employee_id = ${employeeId}
      AND (${startDate}::DATE IS NULL OR date >= ${startDate}::DATE)
      AND (${endDate}::DATE IS NULL OR date <= ${endDate}::DATE)
      ORDER BY date DESC
    `;

    return res.status(200).json({
      success: true,
      data: result.rows.map(row => toCamelCase(row))
    });
  } catch (error) {
    console.error('[handleGetTimecardHistory] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener historial' });
  }
}

async function handleDeleteTimecard(req: any, res: any, adminCode: string, timecardId: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  if (!timecardId) {
    return res.status(400).json({ success: false, error: 'ID de marcación requerido' });
  }

  try {
    await ensureTablesExist();
    
    const tcId = parseInt(timecardId, 10);
    
    if (isNaN(tcId)) {
      return res.status(400).json({ success: false, error: 'ID de marcación inválido' });
    }

    // Guardar en audit antes de eliminar
    const timecard = await sql`SELECT * FROM timecards WHERE id = ${tcId}`;
    if (timecard.rows.length > 0) {
      await sql`
        INSERT INTO timecard_audit (timecard_id, employee_id, action, changes, admin_code, created_at)
        VALUES (${tcId}, ${timecard.rows[0].employee_id}, 'DELETE', ${'{"deleted": true}'}, ${adminCode}, NOW())
      `;
    }

    // Eliminar
    const result = await sql`DELETE FROM timecards WHERE id = ${tcId} RETURNING id`;

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Marcación no encontrada' });
    }

    return res.status(200).json({
      success: true,
      message: 'Marcación eliminada correctamente'
    });
  } catch (error: any) {
    console.error('[handleDeleteTimecard] Error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error al eliminar marcación' });
  }
}

async function handleUpdateTimecard(req: any, res: any, adminCode: string, timecardId: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  if (!timecardId) {
    return res.status(400).json({ success: false, error: 'ID de marcación requerido' });
  }

  const { time_in, time_out, notes } = req.body;

  try {
    await ensureTablesExist();
    
    const tcId = parseInt(timecardId, 10);
    
    if (isNaN(tcId)) {
      return res.status(400).json({ success: false, error: 'ID de marcación inválido' });
    }

    // Obtener marcación anterior
    const oldTimecard = await sql`SELECT * FROM timecards WHERE id = ${tcId}`;
    if (oldTimecard.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Marcación no encontrada' });
    }

    // Calcular horas si hay ambas marcas
    let hoursWorked = 0;
    if (time_in && time_out) {
      const inTime = new Date(time_in).getTime();
      const outTime = new Date(time_out).getTime();
      hoursWorked = Math.round((outTime - inTime) / (1000 * 60 * 60) * 100) / 100;
    }

    // Guardar cambios en audit
    const changes = {
      time_in: time_in ? time_in : oldTimecard.rows[0].time_in,
      time_out: time_out ? time_out : oldTimecard.rows[0].time_out,
      notes: notes || null
    };

    await sql`
      INSERT INTO timecard_audit (timecard_id, employee_id, action, changes, admin_code, created_at)
      VALUES (${tcId}, ${oldTimecard.rows[0].employee_id}, 'UPDATE', ${JSON.stringify(changes)}, ${adminCode}, NOW())
    `;

    // Actualizar
    const result = await sql`
      UPDATE timecards 
      SET 
        time_in = COALESCE(${time_in}::TIMESTAMP, time_in),
        time_out = COALESCE(${time_out}::TIMESTAMP, time_out),
        hours_worked = ${hoursWorked},
        notes = ${notes || null},
        edited_by = ${adminCode},
        edited_at = NOW(),
        updated_at = NOW()
      WHERE id = ${tcId}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Marcación no encontrada' });
    }

    return res.status(200).json({
      success: true,
      data: toCamelCase(result.rows[0]),
      message: 'Marcación actualizada correctamente'
    });
  } catch (error: any) {
    console.error('[handleUpdateTimecard] Error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error al actualizar marcación' });
  }
}

async function handleDeleteEmployee(req: any, res: any, adminCode: string, employeeId: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  if (!employeeId) {
    return res.status(400).json({ success: false, error: 'ID de empleado requerido' });
  }

  try {
    await ensureTablesExist();
    
    const empId = parseInt(employeeId, 10);
    
    if (isNaN(empId)) {
      return res.status(400).json({ success: false, error: 'ID de empleado inválido' });
    }
    
    // Opción 1: Soft delete (cambiar status a 'inactive')
    // Opción 2: Hard delete (eliminar todo, incluyendo timecards)
    // Usaremos soft delete por defecto para preservar datos

    const result = await sql`
      UPDATE employees 
      SET status = 'inactive', updated_at = NOW()
      WHERE id = ${empId}
      RETURNING id
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    }

    return res.status(200).json({
      success: true,
      message: 'Empleado desactivado correctamente'
    });
  } catch (error: any) {
    console.error('[handleDeleteEmployee] Error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error al desactivar empleado' });
  }
}

async function handleHardDeleteEmployee(req: any, res: any, adminCode: string, employeeId: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  if (!employeeId) {
    return res.status(400).json({ success: false, error: 'ID de empleado requerido' });
  }

  try {
    await ensureTablesExist();
    
    const empId = parseInt(employeeId, 10);
    
    if (isNaN(empId)) {
      return res.status(400).json({ success: false, error: 'ID de empleado inválido' });
    }
    
    // Eliminar primero marcaciones y audits
    await sql`DELETE FROM timecard_audit WHERE employee_id = ${empId}`;
    await sql`DELETE FROM timecards WHERE employee_id = ${empId}`;
    const result = await sql`DELETE FROM employees WHERE id = ${empId} RETURNING id`;

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    }

    return res.status(200).json({
      success: true,
      message: 'Empleado y todos sus registros eliminados permanentemente'
    });
  } catch (error: any) {
    console.error('[handleHardDeleteEmployee] Error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error al eliminar empleado' });
  }
}
