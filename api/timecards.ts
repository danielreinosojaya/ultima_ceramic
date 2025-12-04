import { sql } from '@vercel/postgres';
import type { Employee, Timecard, ClockInResponse, ClockOutResponse, AdminDashboardStats } from '../types/timecard';

// Utilidades
const ADMIN_CODE_PREFIX = 'ADMIN';
const EMPLOYEE_CODE_PREFIX = 'EMP';

// ✅ HELPER: Convertir timestamp UTC a hora Ecuador y formatear
// Recibe un ISO string UTC (ej: "2025-12-03T17:51:35.000Z")
// Retorna string formateado (ej: "5:51 p. m.") o null si inválido
function formatTimeInEcuadorTimezone(isoString: string | Date | null | undefined): string | null {
  if (!isoString) return null;
  
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return null;  // ✅ Retornar null, no "Invalid Date"
  
  // Usar Intl para convertir a Ecuador timezone
  const formatter = new Intl.DateTimeFormat('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Guayaquil',
    hour12: true
  });
  
  return formatter.format(date);
}

// ✅ HELPER: Obtener solo la fecha en Ecuador timezone
// Retorna string "YYYY-MM-DD" o null si inválido
function getEcuadorDateOnly(isoString: string | Date | null | undefined): string | null {
  if (!isoString) return null;
  
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return null;  // ✅ Retornar null, no "Invalid Date"
  
  const formatter = new Intl.DateTimeFormat('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Guayaquil'
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
}

// Convertir snake_case a camelCase y DECIMALS a números
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  }
  if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result: any, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      let value = obj[key];
      
      // Convertir DECIMAL strings a números (PostgreSQL puede retornarlos como strings)
      if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) {
        value = parseFloat(value);
      }
      
      result[camelKey] = toCamelCase(value);
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
          INSERT INTO admin_codes (code, password_hash, role, active, created_at)
          VALUES ('ADMIN2025', '$2b$10$xK1.kJ3mL9oP2qR4sT5uG.u9mW8xY7zA6bC5dE4fG3hI2jK1lM0nO', 'admin', true, NOW())
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

// ============ CONTROL DE ACCESO POR ROLES ============

type AdminRole = 'admin' | 'manager' | 'viewer';

interface RolePermission {
  canViewDashboard: boolean;
  canEditTimecard: boolean;
  canDeleteTimecard: boolean;
  canManageEmployees: boolean;
  canExportReports: boolean;
  canManageRoles: boolean;
}

const ROLE_PERMISSIONS: Record<AdminRole, RolePermission> = {
  admin: {
    canViewDashboard: true,
    canEditTimecard: true,
    canDeleteTimecard: true,
    canManageEmployees: true,
    canExportReports: true,
    canManageRoles: true
  },
  manager: {
    canViewDashboard: true,
    canEditTimecard: true,
    canDeleteTimecard: false, // Los managers no pueden eliminar
    canManageEmployees: false,
    canExportReports: true,
    canManageRoles: false
  },
  viewer: {
    canViewDashboard: true,
    canEditTimecard: false,
    canDeleteTimecard: false,
    canManageEmployees: false,
    canExportReports: false,
    canManageRoles: false
  }
};

async function getRoleByAdminCode(adminCode: string): Promise<AdminRole | null> {
  try {
    if (adminCode === 'ADMIN2025') {
      return 'admin'; // Super admin
    }

    const result = await sql`
      SELECT role FROM admin_codes
      WHERE code = ${adminCode} AND active = true
      LIMIT 1
    `;

    if (result.rows.length === 0) return null;
    return (result.rows[0].role as AdminRole) || 'viewer';
  } catch (error) {
    console.error('[getRoleByAdminCode] Error:', error);
    return null;
  }
}

async function verifyPermission(adminCode: string, permission: keyof RolePermission): Promise<boolean> {
  try {
    const isAdmin = await verifyAdminCode(adminCode);
    if (!isAdmin) return false;

    const role = await getRoleByAdminCode(adminCode);
    if (!role) return false;

    const permissions = ROLE_PERMISSIONS[role];
    return permissions[permission];
  } catch (error) {
    console.error('[verifyPermission] Error:', error);
    return false;
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
        location_in_lat DECIMAL(10,7),
        location_in_lng DECIMAL(10,7),
        location_in_accuracy DECIMAL(5,2),
        location_out_lat DECIMAL(10,7),
        location_out_lng DECIMAL(10,7),
        location_out_accuracy DECIMAL(5,2),
        device_ip_in VARCHAR(45),
        device_ip_out VARCHAR(45),
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
        role VARCHAR(20) DEFAULT 'admin',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('[ensureTablesExist] admin_codes table ready');

    // Crear tabla employee_schedules (horarios)
    await sql`
      CREATE TABLE IF NOT EXISTS employee_schedules (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
        check_in_time TIME NOT NULL,
        check_out_time TIME NOT NULL,
        grace_period_minutes INTEGER DEFAULT 10,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_schedule_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        CONSTRAINT uq_employee_day UNIQUE (employee_id, day_of_week)
      )
    `;
    console.log('[ensureTablesExist] employee_schedules table ready');

    // Crear tabla de tardanzas/retrasos
    await sql`
      CREATE TABLE IF NOT EXISTS tardanzas (
        id SERIAL PRIMARY KEY,
        timecard_id INTEGER NOT NULL,
        employee_id INTEGER NOT NULL,
        retraso_minutos INTEGER NOT NULL,
        tipo_retraso VARCHAR(20) DEFAULT 'normal', -- 'leve' (≤15min), 'normal' (≤30min), 'grave' (>30min)
        horario_esperado TIME,
        horario_real TIME,
        fecha DATE NOT NULL,
        admin_notes VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_tardanzas_timecard FOREIGN KEY (timecard_id) REFERENCES timecards(id) ON DELETE CASCADE,
        CONSTRAINT fk_tardanzas_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `;
    console.log('[ensureTablesExist] tardanzas table ready');

    // Crear tabla geofences (ubicaciones permitidas para check-in)
    await sql`
      CREATE TABLE IF NOT EXISTS geofences (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        radius_meters INTEGER NOT NULL DEFAULT 200,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('[ensureTablesExist] geofences table ready');

    // NO insertar geofences por defecto - el usuario los crea en el Admin Panel
    // Esto evita duplicados cada vez que se ejecuta ensureTablesExist()

    // Crear índices para horarios
    await sql`CREATE INDEX IF NOT EXISTS idx_schedules_employee ON employee_schedules(employee_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_schedules_active ON employee_schedules(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_timecards_employee ON timecards(employee_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_timecards_date ON timecards(date)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_timecards_per_day ON timecards(employee_id, date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_timecard ON timecard_audit(timecard_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_employee ON timecard_audit(employee_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tardanzas_employee ON tardanzas(employee_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tardanzas_fecha ON tardanzas(fecha)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tardanzas_timecard ON tardanzas(timecard_id)`;
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

    // ✅ ESTRATEGIA DEFINITIVA: Comparar con fecha de Ecuador pero usar UTC en DB
    // Obtener fecha actual de Ecuador para comparación
    const ecuadorDateResult = await sql`
      SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Guayaquil')::DATE as ecuador_date
    `;
    const ecuadorDate = ecuadorDateResult.rows[0].ecuador_date;
    
    const result = await sql`
      SELECT * FROM timecards
      WHERE employee_id = ${employeeId} 
        AND date = ${ecuadorDate}
      LIMIT 1
    `;

    console.log('[getTodayTimecard] Query result:', { 
      employeeId, 
      currentDate: 'CURRENT_TIMESTAMP AT TIME ZONE America/Guayaquil', 
      rowsFound: result.rows.length 
    });
    
    if (result.rows.length === 0) {
      console.log('[getTodayTimecard] NO MATCH');
      return null;
    }

    const row = result.rows[0];
    // ✅ DEFINITIVO: Retornar timestamps como ISO strings UTC
    // PostgreSQL guarda en UTC, JavaScript los interpreta como UTC, frontend convierte a Ecuador
    const timecard: Timecard = {
      id: Number(row.id),
      employee_id: Number(row.employee_id),
      date: String(row.date),
      time_in: row.time_in ? (row.time_in instanceof Date ? row.time_in.toISOString() : new Date(row.time_in).toISOString()) : undefined,
      time_out: row.time_out ? (row.time_out instanceof Date ? row.time_out.toISOString() : new Date(row.time_out).toISOString()) : undefined,
      hours_worked: row.hours_worked ? Number(row.hours_worked) : undefined,
      notes: row.notes ? String(row.notes) : undefined,
      edited_by: row.edited_by ? Number(row.edited_by) : undefined,
      edited_at: row.edited_at ? (row.edited_at instanceof Date ? row.edited_at.toISOString() : new Date(row.edited_at).toISOString()) : undefined,
      created_at: row.created_at ? (row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString()) : new Date().toISOString(),
      updated_at: row.updated_at ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString()) : new Date().toISOString()
    };

    console.log('[getTodayTimecard] Found timecard:', { id: timecard.id, employee_id: timecard.employee_id, time_in: timecard.time_in });
    return timecard;
  } catch (error) {
    console.error('[getTodayTimecard] Error:', error);
    return null;
  }
}

async function calculateHours(timeIn: string, timeOut: string): Promise<number> {
  // timeIn y timeOut ahora vienen como TIMESTAMP literals: "2025-11-27 16:51:23"
  // Estos NO son ISO strings, representan hora LOCAL
  // Para calcular diferencia, parseamos ambos de la misma forma (como hora local)
  
  try {
    // Convertir de formato "YYYY-MM-DD HH:mm:ss" a Date
    // Agregamos T para que sea ISO-like, pero sin especificar timezone
    const timeInISO = timeIn.replace(' ', 'T');
    const timeOutISO = timeOut.replace(' ', 'T');
    
    const timeInDate = new Date(timeInISO);
    const timeOutDate = new Date(timeOutISO);
    
    const timeInMs = timeInDate.getTime();
    const timeOutMs = timeOutDate.getTime();
    const diffMs = timeOutMs - timeInMs;
    
    // Convertir a horas
    const hours = diffMs / (1000 * 60 * 60);
    
    console.log('[calculateHours] Detalles del cálculo (TIMESTAMP local):', {
      timeIn,
      timeOut,
      timeInISO,
      timeOutISO,
      timeInMs,
      timeOutMs,
      diffMs,
      diffSeconds: diffMs / 1000,
      diffMinutes: diffMs / (1000 * 60),
      hoursBeforeRounding: hours,
      hoursAfterRounding: Math.round(hours * 100) / 100
    });
    
    // Si el resultado es negativo, significa que timeOut < timeIn
    if (hours < 0) {
      console.warn('[calculateHours] Negative hours detected:', { timeIn, timeOut, hours, diffMs });
      return 0;
    }
    
    return Math.round(hours * 100) / 100; // Redondear a 2 decimales
  } catch (error) {
    console.error('[calculateHours] Error parsing timestamps:', { timeIn, timeOut, error });
    return 0;
  }
}

// ============ VALIDACIONES DE GEOLOCALIZACIÓN ============

interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  ipAddress?: string;
}

interface GeofenceCheckResult {
  isWithinGeofence: boolean;
  distance: number;
  geofenceName: string;
  warning?: string;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Haversine formula para calcular distancia en metros
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function validateGeofence(
  latitude: number,
  longitude: number
): Promise<GeofenceCheckResult> {
  try {
    const result = await sql`
      SELECT id, name, latitude, longitude, radius_meters
      FROM geofences
      WHERE is_active = true
      ORDER BY ABS(latitude - ${latitude}) + ABS(longitude - ${longitude})
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return {
        isWithinGeofence: false,
        distance: Infinity,
        geofenceName: 'No hay geofences configurados',
        warning: 'Sistema de geofence no configurado'
      };
    }

    const geofence = result.rows[0];
    const distance = calculateDistance(
      latitude,
      longitude,
      parseFloat(geofence.latitude),
      parseFloat(geofence.longitude)
    );

    const isWithin = distance <= geofence.radius_meters;

    return {
      isWithinGeofence: isWithin,
      distance: Math.round(distance),
      geofenceName: geofence.name,
      warning: !isWithin ? `Fuera de rango: ${Math.round(distance)}m de ${geofence.name}` : undefined
    };
  } catch (error) {
    console.error('[validateGeofence] Error:', error);
    return {
      isWithinGeofence: false,
      distance: Infinity,
      geofenceName: 'Error',
      warning: 'Error al validar ubicación'
    };
  }
}

// ============ VALIDACIONES ROBUSTAS ============

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

async function validateTimecardUpdate(
  timecardId: number,
  newTimeIn?: string,
  newTimeOut?: string,
  employeeId?: number
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  try {
    // Obtener el timecard actual
    const currentResult = await sql`SELECT * FROM timecards WHERE id = ${timecardId}`;
    if (currentResult.rows.length === 0) {
      errors.push({
        field: 'timecard_id',
        message: 'Marcación no encontrada',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    const currentTimecard = currentResult.rows[0];

    // Validación 1: No editar registros más viejos de 30 días
    const recordDate = new Date(currentTimecard.date);
    const today = new Date();
    const daysDifference = Math.floor((today.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > 30) {
      errors.push({
        field: 'date',
        message: `No se pueden editar registros con más de 30 días (este registro tiene ${daysDifference} días)`,
        severity: 'error'
      });
    }

    // Validación 2: time_in debe ser anterior a time_out
    if (newTimeIn && newTimeOut) {
      const timeInDate = new Date(newTimeIn);
      const timeOutDate = new Date(newTimeOut);
      
      if (timeInDate >= timeOutDate) {
        errors.push({
          field: 'time_out',
          message: 'La hora de salida debe ser posterior a la de entrada',
          severity: 'error'
        });
      }

      // Validación 3: Horas razonables (máximo 12 horas de trabajo)
      const diffMs = timeOutDate.getTime() - timeInDate.getTime();
      const hoursWorked = diffMs / (1000 * 60 * 60);
      
      if (hoursWorked > 12) {
        errors.push({
          field: 'hours_worked',
          message: `Horas trabajadas (${hoursWorked.toFixed(2)}h) exceden lo razonable (máx 12h)`,
          severity: 'warning'
        });
      }
    }

    // Validación 4: No editar horas futuras
    if (newTimeIn) {
      const timeInDate = new Date(newTimeIn);
      if (timeInDate > new Date()) {
        errors.push({
          field: 'time_in',
          message: 'No se pueden registrar horas futuras',
          severity: 'error'
        });
      }
    }

    // Validación 5: Employee debe estar activo
    if (employeeId) {
      const empResult = await sql`SELECT status FROM employees WHERE id = ${employeeId}`;
      if (empResult.rows.length > 0 && empResult.rows[0].status !== 'active') {
        errors.push({
          field: 'employee_id',
          message: 'El empleado no está activo',
          severity: 'error'
        });
      }
    }

    // Si hay errores de severidad 'error', no es válido
    const hasErrors = errors.some(e => e.severity === 'error');
    return { isValid: !hasErrors, errors };

  } catch (error) {
    console.error('[validateTimecardUpdate] Error:', error);
    errors.push({
      field: 'validation',
      message: 'Error al validar los datos',
      severity: 'error'
    });
    return { isValid: false, errors };
  }
}

// Handler principal
export default async function handler(req: any, res: any) {
  const { action, code, adminCode: queryAdminCode, month, year, startDate, endDate, format } = req.query;
  
  // adminCode puede venir en query (GET) o en body (POST)
  const adminCode = queryAdminCode || req.body?.adminCode;

  console.log('[timecards handler] Request received:', {
    action,
    code,
    adminCode,
    method: req.method,
    url: req.url
  });

  try {
    // ✅ SOLUCIÓN DEFINITIVA: Configurar timezone de PostgreSQL a Ecuador
    // Esto hace que todas las funciones NOW(), CURRENT_TIMESTAMP, etc. usen hora de Ecuador
    await sql`SET TIME ZONE 'America/Guayaquil'`;
    console.log('[timecards handler] PostgreSQL timezone set to America/Guayaquil');
    
    switch (action) {
      case 'clock_in':
        return await handleClockIn(req, res, code);
      
      case 'clock_out':
        return await handleClockOut(req, res, code);
      
      case 'get_admin_dashboard':
        return await handleGetAdminDashboard(req, res, adminCode);
      
      case 'get_employee_report':
        return await handleGetEmployeeReport(req, res, code, month, year);
      
      case 'get_tardanzas':
        return await handleGetTardanzas(req, res, code, month, year);
      
      case 'download_report':
        return await handleDownloadReport(req, res, adminCode, format, startDate, endDate);
      
      case 'get_monthly_report':
        return await handleGetMonthlyReport(req, res, adminCode, req.query.year, req.query.month, req.query.format);
      
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
      
      case 'get_employee_schedules':
        return await handleGetEmployeeSchedules(req, res, adminCode, req.query.employeeId as string);
      
      case 'save_employee_schedule':
        return await handleSaveEmployeeSchedule(req, res, adminCode);
      
      case 'delete_employee_schedule':
        return await handleDeleteEmployeeSchedule(req, res, adminCode, req.query.scheduleId as string);
      
      case 'get_geofences':
        return await handleGetGeofences(req, res, adminCode);
      
      case 'create_geofence':
        return await handleCreateGeofence(req, res, adminCode);
      
      case 'update_geofence':
        return await handleUpdateGeofence(req, res, adminCode, req.query.geofenceId);
      
      case 'toggle_geofence':
        return await handleToggleGeofence(req, res, adminCode, req.query.geofenceId);
      
      case 'delete_geofence':
        return await handleDeleteGeofence(req, res, adminCode, req.query.geofenceId);
      
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

  try {
    // Validaciones previas
    if (!employee.id || typeof employee.id !== 'number') {
      console.error('[handleClockIn] Invalid employee.id:', { id: employee.id, type: typeof employee.id });
      return res.status(500).json({ success: false, message: 'Error: ID de empleado inválido' } as ClockInResponse);
    }

    // Asegurar que las tablas existen antes de insertar
    await ensureTablesExist();

    const geolocation = req.body?.geolocation; // { latitude, longitude, accuracy }
    const deviceIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    
    // ✅ OBLIGATORIO: Validar geofence
    let geofenceCheck: GeofenceCheckResult | null = null;
    
    if (!geolocation?.latitude || !geolocation?.longitude) {
      // ❌ SIN UBICACIÓN = RECHAZAR
      return res.status(403).json({
        success: false,
        message: '❌ Se requiere ubicación GPS para marcar entrada',
        geofenceCheck: null,
        instruction: 'Activa el GPS de tu dispositivo'
      } as any);
    }
    
    geofenceCheck = await validateGeofence(geolocation.latitude, geolocation.longitude);
    console.log('[handleClockIn] Geofence check:', geofenceCheck);
    
    if (!geofenceCheck.isWithinGeofence) {
      return res.status(403).json({
        success: false,
        message: `❌ ${geofenceCheck.warning}`,
        geofenceCheck,
        instruction: 'Debes estar en la ubicación de trabajo para marcar entrada'
      } as any);
    }
    
    // ✅ SOLUCIÓN CORRECTA: 
    // 1. Obtener NOW() en UTC (esto es lo que PostgreSQL almacena internamente)
    // 2. Calcular la FECHA derivando del timestamp en Ecuador timezone
    // 3. Esto garantiza que time_in se guarda en UTC pero la fecha es Ecuador
    const nowResult = await sql`
      SELECT 
        NOW() as utc_now,
        (NOW() AT TIME ZONE 'America/Guayaquil')::DATE as ecuador_date
    `;
    const utcNow = nowResult.rows[0].utc_now; // TIMESTAMP en UTC
    const ecuadorDate = nowResult.rows[0].ecuador_date; // DATE en Ecuador
    
    console.log('[handleClockIn] Time calculation:', {
      utcNow,
      ecuadorDate,
      utcNowType: typeof utcNow,
      ecuadorDateType: typeof ecuadorDate,
      nowUtcJs: new Date().toISOString()
    });
    
    // Intentar insertar con todas las columnas de geolocalización
    // ✅ CRÍTICO: 
    // - time_in se guarda en UTC (como debe ser)
    // - date se guarda como la fecha en Ecuador (derivada del timezone)
    // - Esto asegura sincronización perfecta
    let insertResult;
    try {
      insertResult = await sql`
        INSERT INTO timecards (
          employee_id, 
          date, 
          time_in, 
          location_in_lat, 
          location_in_lng, 
          location_in_accuracy, 
          device_ip_in
        )
        VALUES (
          ${employee.id}, 
          ${ecuadorDate},
          ${utcNow},
          ${geolocation?.latitude || null}, 
          ${geolocation?.longitude || null}, 
          ${geolocation?.accuracy || null}, 
          ${deviceIP}
        )
        RETURNING id, time_in, date
      `;
    } catch (insertError: any) {
      // Si las columnas de geolocalización no existen, intentar sin ellas
      if (insertError?.message?.includes('does not exist') || insertError?.code === '42703') {
        console.warn('[handleClockIn] Geolocation columns not found, attempting basic insert:', insertError.message);
        insertResult = await sql`
          INSERT INTO timecards (employee_id, date, time_in)
          VALUES (
            ${employee.id}, 
            ${ecuadorDate},
            ${utcNow}
          )
          RETURNING id, time_in, date
        `;
      } else {
        throw insertError;
      }
    }

    if (!insertResult.rows || insertResult.rows.length === 0) {
      console.error('[handleClockIn] Insert returned no rows');
      return res.status(500).json({ success: false, message: 'Error al guardar entrada' } as ClockInResponse);
    }

    console.log('[handleClockIn] Timecard inserted successfully:', {
      id: insertResult.rows[0].id,
      date: insertResult.rows[0].date,
      time_in: insertResult.rows[0].time_in,
      dateType: typeof insertResult.rows[0].date
    });

    // VALIDAR RETRASOS
    try {
      const timecardId = insertResult.rows[0].id;
      const timeInTimestamp = insertResult.rows[0].time_in;
      
      // Obtener día de semana usando el timestamp guardado (convertido a Ecuador)
      const timeInDate = new Date(timeInTimestamp);
      const ecuadorDateForSchedule = new Date(timeInDate.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
      const dayOfWeek = ecuadorDateForSchedule.getDay();
      
      const scheduleResult = await sql`
        SELECT check_in_time, grace_period_minutes
        FROM employee_schedules
        WHERE employee_id = ${employee.id}
        AND day_of_week = ${dayOfWeek}
        AND is_active = true
        LIMIT 1
      `;

      if (scheduleResult.rows.length > 0) {
        const schedule = scheduleResult.rows[0];
        const expectedCheckInStr = schedule.check_in_time; // Format: "HH:MM:SS"
        const gracePeriodMinutes = schedule.grace_period_minutes || 10;

        // Parsear hora esperada
        const [expectedHour, expectedMin] = expectedCheckInStr.split(':').map(Number);
        const expectedTimeInMinutes = expectedHour * 60 + expectedMin;
        
        // Obtener hora real de entrada en Ecuador
        const actualHour = ecuadorDateForSchedule.getHours();
        const actualMinute = ecuadorDateForSchedule.getMinutes();
        const actualTimeInMinutes = actualHour * 60 + actualMinute;

        // Calcular retraso
        const retrasominutos = Math.max(0, actualTimeInMinutes - expectedTimeInMinutes);

        console.log('[handleClockIn] Retraso detectado:', {
          expectedTime: `${String(expectedHour).padStart(2, '0')}:${String(expectedMin).padStart(2, '0')}`,
          actualTime: `${String(actualHour).padStart(2, '0')}:${String(actualMinute).padStart(2, '0')}`,
          retrasominutos,
          gracePeriod: gracePeriodMinutes,
          esRetrasoReal: retrasominutos > gracePeriodMinutes
        });

        // Si hay retraso mayor al período de gracia, registrar
        if (retrasominutos > gracePeriodMinutes) {
          let tipoRetraso = 'leve'; // ≤15 min
          if (retrasominutos > 30) tipoRetraso = 'grave';
          else if (retrasominutos > 15) tipoRetraso = 'normal';

          await sql`
            INSERT INTO tardanzas (
              timecard_id, 
              employee_id, 
              retraso_minutos, 
              tipo_retraso, 
              horario_esperado, 
              horario_real, 
              fecha
            )
            VALUES (
              ${timecardId},
              ${employee.id},
              ${retrasominutos},
              ${tipoRetraso}::VARCHAR,
              ${expectedCheckInStr}::TIME,
              ${`${String(actualHour).padStart(2, '0')}:${String(actualMinute).padStart(2, '0')}:00`}::TIME,
              CURRENT_DATE
            )
          `;

          console.log('[handleClockIn] Tardanza registrada:', {
            empleado: employee.code,
            retrasominutos,
            tipo: tipoRetraso,
            fecha: 'CURRENT_DATE (Ecuador)'
          });
        }
      }
    } catch (tardanzaError) {
      console.warn('[handleClockIn] Advertencia al registrar tardanza:', tardanzaError);
      // No bloquear el clock in si falla la detección de tardanza
    }

    // ✅ Formatear hora de respuesta desde timestamp guardado (convertir a Ecuador)
    const timeInTimestamp = insertResult.rows[0].time_in;
    const timeStr = new Date(timeInTimestamp).toLocaleTimeString('es-EC', {
      timeZone: 'America/Guayaquil',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    return res.status(200).json({
      success: true,
      message: `Entrada registrada correctamente a las ${timeStr}`,
      employee,
      timestamp: timeInTimestamp,
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
      console.warn('[handleClockIn] Already has entry today');
      return res.status(400).json({ 
        success: false, 
        message: 'Ya has marcado entrada hoy'
      } as ClockInResponse);
    }

    if (errorCode === '23502') {
      console.error('[handleClockIn] NOT NULL constraint failed');
      return res.status(500).json({ 
        success: false, 
        message: 'Error: datos inválidos para registrar entrada'
      } as ClockInResponse);
    }

    if (errorCode === '23503') {
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
    // ESTRATEGIA CORRECTA: Usar localTime del cliente, convertir considerando timezone del servidor
    const geolocation = req.body?.geolocation; // { latitude, longitude, accuracy }
    
    // ✅ OBLIGATORIO: Validar geofence
    if (!geolocation?.latitude || !geolocation?.longitude) {
      // ❌ SIN UBICACIÓN = RECHAZAR
      return res.status(403).json({
        success: false,
        message: '❌ Se requiere ubicación GPS para marcar salida',
        instruction: 'Activa el GPS de tu dispositivo'
      } as any);
    }
    
    const geofenceCheck = await validateGeofence(geolocation.latitude, geolocation.longitude);
    console.log('[handleClockOut] Geofence check:', geofenceCheck);
    
    if (!geofenceCheck.isWithinGeofence) {
      return res.status(403).json({
        success: false,
        message: `❌ ${geofenceCheck.warning}`,
        instruction: 'Debes estar en la ubicación de trabajo para marcar salida'
      } as any);
    }
    
    // Capturar IP
    const deviceIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    
    // ✅ MISMA ESTRATEGIA QUE CLOCK IN:
    // 1. Obtener NOW() en UTC
    // 2. Guardar time_out en UTC
    // 3. Calcular hours_worked en UTC también
    const nowResult = await sql`
      SELECT NOW() as utc_now
    `;
    const utcNow = nowResult.rows[0].utc_now;
    
    // Actualizar en BD - intentar con geolocation columns, fallback si no existen
    let updateResult;
    try {
      updateResult = await sql`
        UPDATE timecards
        SET time_out = ${utcNow},
            hours_worked = EXTRACT(EPOCH FROM (${utcNow} - time_in)) / 3600,
            location_out_lat = ${geolocation.latitude},
            location_out_lng = ${geolocation.longitude},
            location_out_accuracy = ${geolocation.accuracy},
            device_ip_out = ${deviceIP},
            updated_at = NOW()
        WHERE id = ${timecard.id}
        RETURNING *
      `;
    } catch (updateError: any) {
      // Si las columnas de geolocalización no existen, intentar sin ellas
      if (updateError?.message?.includes('does not exist') || updateError?.code === '42703') {
        console.warn('[handleClockOut] Geolocation columns not found, attempting basic update:', updateError.message);
        updateResult = await sql`
          UPDATE timecards
          SET time_out = ${utcNow},
              hours_worked = EXTRACT(EPOCH FROM (${utcNow} - time_in)) / 3600,
              updated_at = NOW()
          WHERE id = ${timecard.id}
          RETURNING *
        `;
      } else {
        throw updateError;
      }
    }
    
    if (updateResult.rows.length === 0) {
      console.error('[handleClockOut] UPDATE no retornó registros');
      return res.status(500).json({ success: false, message: 'Error al guardar salida' } as ClockOutResponse);
    }
    
    const updatedRecord = updateResult.rows[0];

    console.log('[handleClockOut] Registro actualizado:', {
      id: updatedRecord.id,
      time_in: updatedRecord.time_in,
      time_out: updatedRecord.time_out,
      hours_worked_from_db: updatedRecord.hours_worked
    });

    // Calcular horas trabajadas
    const hoursFromDB = updatedRecord.hours_worked ? parseFloat(updatedRecord.hours_worked) : 0;
    
    // ✅ Formatear hora para Ecuador usando toLocaleTimeString
    const timeOut = new Date(updateResult.rows[0].time_out);
    const timeStr = timeOut.toLocaleTimeString('es-EC', {
      timeZone: 'America/Guayaquil',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return res.status(200).json({
      success: true,
      message: `Salida registrada correctamente a las ${timeStr}. Horas trabajadas: ${hoursFromDB.toFixed(2)}h`,
      hours_worked: hoursFromDB,
      timestamp: updateResult.rows[0].time_out,
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

  // ✅ Verificar permiso de lectura del dashboard
  const hasPermission = await verifyPermission(adminCode, 'canViewDashboard');
  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      error: 'Sin permiso',
      message: 'Tu rol no tiene permiso para ver el dashboard'
    });
  }

  try {
    // Asegurar que las tablas existen
    await ensureTablesExist();

    // ✅ Obtener fecha de hoy en Ecuador usando PostgreSQL
    const ecuadorDateResult = await sql`
      SELECT (NOW() AT TIME ZONE 'America/Guayaquil')::DATE as ecuador_date
    `;
    const today = ecuadorDateResult.rows[0].ecuador_date;
    
    console.log('[handleGetAdminDashboard] ===== DEBUG FECHA =====');
    console.log('[handleGetAdminDashboard] Today date (Ecuador):', today);
    console.log('[handleGetAdminDashboard] Today type:', typeof today);
    console.log('[handleGetAdminDashboard] Today string:', String(today));
    console.log('[handleGetAdminDashboard] ========================');

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

    // Tardanzas del sistema de schedules
    const lateResult = await sql`
      SELECT COUNT(*) as count FROM tardanzas
      WHERE fecha = ${today}
    `;
    const lateToday = parseInt(lateResult.rows[0].count);

    // Promedio de horas
    const avgResult = await sql`
      SELECT AVG(hours_worked) as avg_hours FROM timecards
      WHERE date = ${today} AND hours_worked IS NOT NULL
    `;
    const averageHours = avgResult.rows[0].avg_hours ? Math.round(parseFloat(avgResult.rows[0].avg_hours) * 100) / 100 : 0;

    // Estado de empleados hoy
    // ✅ FIX DEFINITIVO: La subconsulta DEBE retornar NULL para date si no hay match
    // NO usar t.date porque el LEFT JOIN puede traer NULL, usar ${today} solo si hay time_in
    const statusResult = await sql`
      SELECT 
        e.id, e.code, e.name, e.position,
        t.id as timecard_id,
        t.date::text as timecard_date,
        t.time_in, 
        t.time_out, 
        t.hours_worked
      FROM employees e
      LEFT JOIN timecards t ON e.id = t.employee_id AND t.date = ${today}
      WHERE e.status = 'active'
      ORDER BY e.name
    `;
    
    console.log('[handleGetAdminDashboard] Query returned', statusResult.rows.length, 'employees');
    console.log('[handleGetAdminDashboard] Sample data:', statusResult.rows.slice(0, 2).map(r => ({
      name: r.name,
      timecard_date: r.timecard_date,
      time_in: r.time_in,
      has_timecard: !!r.time_in
    })));

    const employeesStatus = statusResult.rows.map((row: any) => {
      let hoursWorked = row.hours_worked ? Number(row.hours_worked) : null;
      
      // ✅ CRUCIAL: Solo incluir empleados que REALMENTE tienen timecard de HOY
      // Si timecard_date es NULL, significa que NO marcaron hoy
      const hasTimecardToday = row.timecard_id !== null && row.timecard_date !== null;
      
      // ✅ ASEGURAR que date es SIEMPRE un string YYYY-MM-DD, nunca un timestamp ISO
      let dateStr = null;
      if (hasTimecardToday && row.timecard_date) {
        if (typeof row.timecard_date === 'string') {
          // Ya es string, asegurarse que tenga formato YYYY-MM-DD
          dateStr = row.timecard_date.substring(0, 10);
        } else if (row.timecard_date instanceof Date) {
          // Es Date object, convertir a YYYY-MM-DD
          const year = row.timecard_date.getUTCFullYear();
          const month = String(row.timecard_date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(row.timecard_date.getUTCDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        }
      }
      
      // ✅ FORMATEAR HORAS CON TIMEZONE ECUADOR
      const timeInFormatted = hasTimecardToday && row.time_in ? formatTimeInEcuadorTimezone(row.time_in) : null;
      const timeOutFormatted = hasTimecardToday && row.time_out ? formatTimeInEcuadorTimezone(row.time_out) : null;
      
      console.log('[handleGetAdminDashboard] Processing employee:', {
        code: row.code,
        name: row.name,
        timecard_date_raw: row.timecard_date,
        timecard_date_final: dateStr,
        time_in: row.time_in,
        time_in_formatted: timeInFormatted,
        time_out: row.time_out,
        time_out_formatted: timeOutFormatted,
        hours_worked: hoursWorked,
        hasTimecardToday
      });
      
      return {
        employee: {
          id: row.id,
          code: row.code,
          name: row.name,
          position: row.position,
          status: 'active'
        },
        date: dateStr,
        time_in: timeInFormatted,
        time_out: timeOutFormatted,
        hours_worked: hasTimecardToday ? hoursWorked : null,
        status: !hasTimecardToday ? 'absent' : row.time_out ? 'present' : 'in_progress',
        is_current_day: true
      };
    });

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
      // ✅ Obtener la fecha de hoy en zona horaria de Ecuador
      const ecuadorDateResult = await sql`
        SELECT (NOW() AT TIME ZONE 'America/Guayaquil')::DATE as ecuador_date
      `;
      const todayStr = ecuadorDateResult.rows[0].ecuador_date;
      
      console.log('[handleGetEmployeeReport] Querying for today:', {
        employeeId: employee.id,
        employeeCode: employee.code,
        todayStr,
        nowUtc: new Date().toISOString()
      });
      
      // ✅ CRUCIAL: Asegurar que solo traemos registros de HOY
      // Comparar el campo date (DATE) con la fecha calculada de Ecuador
      const todayResult = await sql`
        SELECT * FROM timecards
        WHERE employee_id = ${employee.id}
        AND date = ${todayStr}::DATE
        ORDER BY created_at DESC
        LIMIT 1
      `;

      console.log('[handleGetEmployeeReport] Query details:', {
        employeeId: employee.id,
        employeeCode: employee.code,
        queryDate: todayStr,
        queryDateType: typeof todayStr,
        rowsFound: todayResult.rows.length,
        rows: todayResult.rows.map(r => ({
          id: r.id,
          employee_id: r.employee_id,
          date: r.date,
          date_type: typeof r.date,
          time_in: r.time_in,
          time_out: r.time_out,
          hours_worked: r.hours_worked
        }))
      });

      // Convertir snake_case a camelCase
      const todayRecords = todayResult.rows.map(row => toCamelCase(row));
      
      // El único registro (si existe) es el todayStatus
      const todayStatus = todayRecords.length > 0 ? todayRecords[0] : null;

      console.log('[handleGetEmployeeReport] Returning:', {
        totalRecordsToday: todayRecords.length,
        hasStatus: todayStatus !== null,
        statusHasTimeIn: todayStatus?.timeIn ? 'YES' : 'NO',
        statusDate: todayStatus?.date,
        expectedDate: todayStr
      });

      return res.status(200).json({
        success: true,
        employee,
        todayStatus,
        todayRecords: todayRecords // Todos los registros del día (solo 1 máximo)
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

    // Convertir snake_case a camelCase
    const timecards = result.rows.map(row => toCamelCase(row));

    const totalHours = timecards.reduce((sum, t) => sum + (t.hoursWorked || 0), 0);
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

async function handleGetTardanzas(req: any, res: any, code: string, month: string, year: string): Promise<any> {
  if (!code) {
    return res.status(400).json({ success: false, error: 'Código requerido' });
  }

  const employee = await findEmployeeByCode(code);
  if (!employee) {
    return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
  }

  try {
    let query;
    
    if (month && year) {
      // Reporte de tardanzas de un mes específico
      query = sql`
        SELECT 
          id,
          timecard_id,
          retraso_minutos,
          tipo_retraso,
          horario_esperado,
          horario_real,
          fecha,
          admin_notes,
          created_at
        FROM tardanzas
        WHERE employee_id = ${employee.id}
        AND EXTRACT(MONTH FROM fecha) = ${month}
        AND EXTRACT(YEAR FROM fecha) = ${year}
        ORDER BY fecha DESC
      `;
    } else {
      // Últimas 30 tardanzas (histórico general)
      query = sql`
        SELECT 
          id,
          timecard_id,
          retraso_minutos,
          tipo_retraso,
          horario_esperado,
          horario_real,
          fecha,
          admin_notes,
          created_at
        FROM tardanzas
        WHERE employee_id = ${employee.id}
        ORDER BY fecha DESC
        LIMIT 30
      `;
    }

    const result = await query;
    const tardanzas = result.rows.map(row => toCamelCase(row));

    // Estadísticas
    const totalTardanzas = tardanzas.length;
    const tardanzasLeves = tardanzas.filter(t => t.tipoRetraso === 'leve').length;
    const tardanzasNormales = tardanzas.filter(t => t.tipoRetraso === 'normal').length;
    const tardanzasGraves = tardanzas.filter(t => t.tipoRetraso === 'grave').length;
    const promedioRetrasoMinutos = tardanzas.length > 0 
      ? Math.round(tardanzas.reduce((sum, t) => sum + t.retrasominutos, 0) / tardanzas.length * 100) / 100
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        employee,
        month: month ? parseInt(month) : null,
        year: year ? parseInt(year) : null,
        tardanzas,
        estadisticas: {
          total: totalTardanzas,
          leves: tardanzasLeves,
          normales: tardanzasNormales,
          graves: tardanzasGraves,
          promedioMinutos: promedioRetrasoMinutos
        }
      }
    });
  } catch (error) {
    console.error('[handleGetTardanzas] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener tardanzas' });
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
        const timeIn = row.time_in ? formatTimeInEcuadorTimezone(row.time_in) : '';
        const timeOut = row.time_out ? formatTimeInEcuadorTimezone(row.time_out) : '';
        const hours = row.hours_worked ? Number(row.hours_worked).toFixed(2) : '';
        csv += `${row.code},"${row.name}",${row.position || ''},${row.date},${timeIn},${timeOut},${hours}\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="asistencia_${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    }

    return res.status(400).json({ success: false, error: 'Formato no soportado' });
  } catch (error) {
    console.error('[handleDownloadReport] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al descargar reporte' });
  }
}

async function handleGetMonthlyReport(req: any, res: any, adminCode: string, year: string, month: string, format?: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  // ✅ Verificar permiso de exportación de reportes
  const hasPermission = await verifyPermission(adminCode, 'canExportReports');
  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      error: 'Sin permiso',
      message: 'Tu rol no tiene permiso para exportar reportes'
    });
  }

  if (!year || !month) {
    return res.status(400).json({ success: false, error: 'Año y mes requeridos' });
  }

  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10);

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({ success: false, error: 'Año o mes inválido' });
  }

  try {
    // Obtener todos los registros del mes
    const timecardResult = await sql`
      SELECT 
        e.id,
        e.code,
        e.name,
        e.position,
        t.id as timecard_id,
        t.date,
        t.time_in,
        t.time_out,
        t.hours_worked,
        t.notes
      FROM employees e
      LEFT JOIN timecards t ON e.id = t.employee_id
        AND EXTRACT(YEAR FROM t.date) = ${yearNum}
        AND EXTRACT(MONTH FROM t.date) = ${monthNum}
      WHERE e.status = 'active'
      ORDER BY e.name, t.date DESC
    `;

    // Procesar datos
    const reportData: Record<string, any> = {};
    let totalHours = 0;
    let totalDays = 0;
    let totalTardanzas = 0;

    timecardResult.rows.forEach((row: any) => {
      if (!reportData[row.code]) {
        reportData[row.code] = {
          employee_code: row.code,
          employee_name: row.name,
          employee_position: row.position,
          records: [],
          stats: {
            total_hours: 0,
            days_worked: 0,
            days_absent: 0,
            tardanzas_count: 0
          }
        };
      }

      if (row.timecard_id) {
        reportData[row.code].records.push({
          date: row.date,
          time_in: row.time_in,
          time_out: row.time_out,
          hours_worked: row.hours_worked,
          tardanzas: row.tardanzas_count,
          max_retraso: row.max_retraso,
          notes: row.notes
        });

        if (row.hours_worked) {
          reportData[row.code].stats.total_hours += Number(row.hours_worked);
          totalHours += Number(row.hours_worked);
        }
        if (row.time_in) {
          reportData[row.code].stats.days_worked++;
          totalDays++;
        }
        if (row.tardanzas_count > 0) {
          reportData[row.code].stats.tardanzas_count += Number(row.tardanzas_count);
          totalTardanzas += Number(row.tardanzas_count);
        }
      }
    });

    // Si pide CSV, generar
    if (format === 'csv') {
      // Función auxiliar para formatear hora local desde timestamp guardado como UTC
      const formatTimeForCSV = (isoString: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
        const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
      };

      let csv = 'Código,Nombre,Puesto,Fecha,Entrada,Salida,Horas,Tardanzas,Retraso(min),Notas\n';
      
      Object.values(reportData).forEach((employee: any) => {
        employee.records.forEach((record: any) => {
          const timeIn = formatTimeForCSV(record.time_in);
          const timeOut = formatTimeForCSV(record.time_out);
          const hours = record.hours_worked ? Number(record.hours_worked).toFixed(2) : '';
          
          csv += `${employee.employee_code},"${employee.employee_name}",${employee.employee_position || ''},`;
          csv += `${record.date},${timeIn},${timeOut},${hours},`;
          csv += `${record.tardanzas},${record.max_retraso || ''},"${record.notes || ''}\n`;
        });
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="reporte_asistencia_${yearNum}-${String(monthNum).padStart(2, '0')}.csv"`);
      return res.send('\uFEFF' + csv); // Agregar BOM para Excel
    }

    // Si no especifica formato, retornar JSON
    const summary = {
      year: yearNum,
      month: monthNum,
      month_name: new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(yearNum, monthNum - 1)),
      total_employees: Object.keys(reportData).length,
      total_hours: Math.round(totalHours * 100) / 100,
      total_days_worked: totalDays,
      total_tardanzas: totalTardanzas
    };

    return res.status(200).json({
      success: true,
      summary,
      data: Object.values(reportData)
    });

  } catch (error) {
    console.error('[handleGetMonthlyReport] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al generar reporte' });
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
    // ✅ Convertir employeeId a número
    const empId = parseInt(employeeId);
    
    if (!Number.isInteger(empId) || empId <= 0) {
      return res.status(400).json({ success: false, error: 'ID de empleado inválido' });
    }

    let result;
    
    // ✅ Validar y convertir fechas si vienen en formato YYYY-MM-DD (string local del cliente)
    // Las fechas del cliente pueden estar en cualquier timezone, pero PostgreSQL necesita comparar correctamente
    const normalizeDate = (dateStr: string) => {
      // Si es "YYYY-MM-DD", lo pasamos tal cual - PostgreSQL lo interpreta como DATE
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      return null;
    };
    
    const normStartDate = startDate ? normalizeDate(startDate) : null;
    const normEndDate = endDate ? normalizeDate(endDate) : null;
    
    // Construir query según los filtros disponibles
    if (normStartDate && normEndDate) {
      result = await sql`
        SELECT * FROM timecards 
        WHERE employee_id = ${empId}
        AND date >= ${normStartDate}::DATE
        AND date <= ${normEndDate}::DATE
        ORDER BY date DESC
      `;
    } else if (normStartDate) {
      result = await sql`
        SELECT * FROM timecards 
        WHERE employee_id = ${empId}
        AND date >= ${normStartDate}::DATE
        ORDER BY date DESC
      `;
    } else if (normEndDate) {
      result = await sql`
        SELECT * FROM timecards 
        WHERE employee_id = ${empId}
        AND date <= ${normEndDate}::DATE
        ORDER BY date DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM timecards 
        WHERE employee_id = ${empId}
        ORDER BY date DESC
      `;
    }

    console.log('[handleGetTimecardHistory] Query result:', {
      employeeId: empId,
      startDate: normStartDate,
      endDate: normEndDate,
      rowsFound: result.rows.length
    });

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

  // ✅ Verificar permiso específico
  const hasPermission = await verifyPermission(adminCode, 'canDeleteTimecard');
  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      error: 'Sin permiso',
      message: 'Tu rol no tiene permiso para eliminar marcaciones'
    });
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

    // Guardar registro completo en audit antes de eliminar
    const timecardResult = await sql`SELECT * FROM timecards WHERE id = ${tcId}`;
    if (timecardResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Marcación no encontrada' });
    }

    const deletedRecord = timecardResult.rows[0];

    // ✅ AUDITORÍA COMPLETA: Guardar todo el registro antes de eliminarlo
    const deletionDetails = {
      action: 'DELETE',
      deletedRecord: {
        id: deletedRecord.id,
        employee_id: deletedRecord.employee_id,
        date: deletedRecord.date,
        time_in: deletedRecord.time_in,
        time_out: deletedRecord.time_out,
        hours_worked: deletedRecord.hours_worked,
        notes: deletedRecord.notes,
        created_at: deletedRecord.created_at,
        updated_at: deletedRecord.updated_at
      },
      deletedAt: new Date().toISOString(),
      deletedBy: adminCode
    };

    await sql`
      INSERT INTO timecard_audit (timecard_id, employee_id, action, changes, admin_code, created_at)
      VALUES (${tcId}, ${deletedRecord.employee_id}, 'DELETE', ${JSON.stringify(deletionDetails)}, ${adminCode}, NOW())
    `;

    // Eliminar
    const result = await sql`DELETE FROM timecards WHERE id = ${tcId} RETURNING id`;

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Marcación no encontrada' });
    }

    console.log('[handleDeleteTimecard] Successfully deleted:', {
      timecardId: tcId,
      employeeId: deletedRecord.employee_id,
      adminCode
    });

    return res.status(200).json({
      success: true,
      message: 'Marcación eliminada correctamente',
      deletedRecord: {
        id: deletedRecord.id,
        employee_id: deletedRecord.employee_id,
        date: deletedRecord.date
      }
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

  // ✅ Verificar permiso específico
  const hasPermission = await verifyPermission(adminCode, 'canEditTimecard');
  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      error: 'Sin permiso',
      message: 'Tu rol no tiene permiso para editar marcaciones'
    });
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

    const oldRecord = oldTimecard.rows[0];

    // ✅ NUEVAS VALIDACIONES ROBUSTAS
    const validation = await validateTimecardUpdate(
      tcId,
      time_in,
      time_out,
      oldRecord.employee_id
    );

    if (!validation.isValid) {
      const errorMessages = validation.errors
        .filter(e => e.severity === 'error')
        .map(e => e.message);
      
      return res.status(400).json({
        success: false,
        error: 'Validación fallida',
        details: errorMessages,
        validationErrors: validation.errors
      });
    }

    // Advertencias (si las hay)
    const warnings = validation.errors.filter(e => e.severity === 'warning');

    // Calcular horas si hay ambas marcas
    let hoursWorked = 0;
    if (time_in && time_out) {
      hoursWorked = await calculateHours(time_in, time_out);
    }

    // ✅ AUDITORÍA COMPLETA: Capturar ANTES y DESPUÉS
    const changeDetails = {
      before: {
        time_in: oldRecord.time_in,
        time_out: oldRecord.time_out,
        hours_worked: oldRecord.hours_worked,
        notes: oldRecord.notes,
        edited_at: oldRecord.edited_at,
        updated_at: oldRecord.updated_at
      },
      after: {
        time_in: time_in || oldRecord.time_in,
        time_out: time_out || oldRecord.time_out,
        hours_worked: hoursWorked || oldRecord.hours_worked,
        notes: notes || oldRecord.notes
      },
      changedFields: [] as string[]
    };

    // Marcar qué campos fueron modificados
    if (time_in && time_in !== oldRecord.time_in) changeDetails.changedFields.push('time_in');
    if (time_out && time_out !== oldRecord.time_out) changeDetails.changedFields.push('time_out');
    if (notes !== undefined && notes !== oldRecord.notes) changeDetails.changedFields.push('notes');

    // Guardar en auditoría
    await sql`
      INSERT INTO timecard_audit (timecard_id, employee_id, action, changes, admin_code, created_at)
      VALUES (${tcId}, ${oldRecord.employee_id}, 'UPDATE', ${JSON.stringify(changeDetails)}, ${adminCode}, NOW())
    `;

    // Actualizar
    const result = await sql`
      UPDATE timecards 
      SET 
        time_in = COALESCE(${time_in}::TIMESTAMP, time_in),
        time_out = COALESCE(${time_out}::TIMESTAMP, time_out),
        hours_worked = ${hoursWorked || oldRecord.hours_worked}::DECIMAL(5,2),
        notes = ${notes !== undefined ? notes : oldRecord.notes},
        edited_by = ${adminCode},
        edited_at = NOW(),
        updated_at = NOW()
      WHERE id = ${tcId}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Marcación no encontrada' });
    }

    console.log('[handleUpdateTimecard] Successfully updated:', {
      timecardId: tcId,
      adminCode,
      changedFields: changeDetails.changedFields,
      warnings: warnings.length > 0 ? warnings : 'none'
    });

    return res.status(200).json({
      success: true,
      data: toCamelCase(result.rows[0]),
      message: 'Marcación actualizada correctamente',
      warnings: warnings.length > 0 ? warnings : undefined
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

// ============ HORARIOS (SCHEDULES) ============

async function getEmployeeSchedule(employeeId: number, dayOfWeek?: number): Promise<any[]> {
  try {
    if (dayOfWeek !== undefined) {
      const result = await sql`
        SELECT * FROM employee_schedules
        WHERE employee_id = ${employeeId}
        AND day_of_week = ${dayOfWeek}
        AND is_active = true
        LIMIT 1
      `;
      return result.rows.length > 0 ? [toCamelCase(result.rows[0])] : [];
    }
    
    const result = await sql`
      SELECT * FROM employee_schedules
      WHERE employee_id = ${employeeId}
      AND is_active = true
      ORDER BY day_of_week
    `;
    return result.rows.map(row => toCamelCase(row));
  } catch (error) {
    console.error('[getEmployeeSchedule] Error:', error);
    return [];
  }
}

async function calculateLateArrival(employeeId: number, checkInTime: string, date: string): Promise<{ isLate: boolean; minutesLate: number; scheduledTime: string | null } | null> {
  try {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    const schedule = await getEmployeeSchedule(employeeId, dayOfWeek);
    if (schedule.length === 0) {
      return null; // No hay horario para este día
    }

    const scheduledCheckIn = schedule[0].checkInTime || schedule[0].check_in_time;
    const gracePeriod = schedule[0].gracePeriodMinutes || schedule[0].grace_period_minutes || 10;

    const [scheduledHours, scheduledMinutes] = scheduledCheckIn.split(':').map(Number);
    const scheduledTimeMs = scheduledHours * 60 + scheduledMinutes;

    const checkInObj = new Date(checkInTime);
    const actualHours = checkInObj.getHours();
    const actualMinutes = checkInObj.getMinutes();
    const actualTimeMs = actualHours * 60 + actualMinutes;

    const minutesLate = Math.max(0, actualTimeMs - scheduledTimeMs - gracePeriod);
    const isLate = minutesLate > 0;

    return {
      isLate,
      minutesLate,
      scheduledTime: scheduledCheckIn
    };
  } catch (error) {
    console.error('[calculateLateArrival] Error:', error);
    return null;
  }
}

async function handleGetEmployeeSchedules(req: any, res: any, adminCode: string, employeeId: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  try {
    const empId = parseInt(employeeId, 10);
    if (isNaN(empId)) {
      return res.status(400).json({ success: false, error: 'ID de empleado inválido' });
    }

    const schedules = await getEmployeeSchedule(empId);
    
    return res.status(200).json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('[handleGetEmployeeSchedules] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener horarios' });
  }
}

async function handleSaveEmployeeSchedule(req: any, res: any, adminCode: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  try {
    const { employeeId, dayOfWeek, checkInTime, checkOutTime, gracePeriodMinutes } = req.body;

    if (!employeeId || dayOfWeek === undefined || !checkInTime || !checkOutTime) {
      return res.status(400).json({ success: false, error: 'Datos incompletos' });
    }

    const empId = parseInt(employeeId, 10);
    const day = parseInt(dayOfWeek, 10);
    const grace = parseInt(gracePeriodMinutes || '10', 10);

    if (isNaN(empId) || isNaN(day) || day < 0 || day > 6) {
      return res.status(400).json({ success: false, error: 'Datos inválidos' });
    }

    // Verificar que el empleado existe
    const empResult = await sql`SELECT id FROM employees WHERE id = ${empId}`;
    if (empResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    }

    // Insertar o actualizar
    const result = await sql`
      INSERT INTO employee_schedules (employee_id, day_of_week, check_in_time, check_out_time, grace_period_minutes, is_active)
      VALUES (${empId}, ${day}, ${checkInTime}::TIME, ${checkOutTime}::TIME, ${grace}, true)
      ON CONFLICT (employee_id, day_of_week) DO UPDATE SET
        check_in_time = ${checkInTime}::TIME,
        check_out_time = ${checkOutTime}::TIME,
        grace_period_minutes = ${grace},
        updated_at = NOW()
      RETURNING *
    `;

    return res.status(200).json({
      success: true,
      data: toCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('[handleSaveEmployeeSchedule] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al guardar horario' });
  }
}

async function handleDeleteEmployeeSchedule(req: any, res: any, adminCode: string, scheduleId: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  try {
    const schId = parseInt(scheduleId, 10);
    if (isNaN(schId)) {
      return res.status(400).json({ success: false, error: 'ID inválido' });
    }

    await sql`DELETE FROM employee_schedules WHERE id = ${schId}`;
    
    return res.status(200).json({
      success: true,
      message: 'Horario eliminado'
    });
  } catch (error) {
    console.error('[handleDeleteEmployeeSchedule] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al eliminar horario' });
  }
}

// ============ GEOFENCE HANDLERS ============

async function handleGetGeofences(req: any, res: any, adminCode: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  try {
    const result = await sql`
      SELECT id, name, latitude, longitude, radius_meters, is_active, created_at
      FROM geofences
      ORDER BY created_at DESC
    `;

    return res.status(200).json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        radius_meters: parseInt(row.radius_meters)
      }))
    });
  } catch (error) {
    console.error('[handleGetGeofences] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener geofences' });
  }
}

async function handleCreateGeofence(req: any, res: any, adminCode: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  const { name, latitude, longitude, radius_meters } = req.body;

  if (!name || latitude === undefined || longitude === undefined || !radius_meters) {
    return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
  }

  try {
    const result = await sql`
      INSERT INTO geofences (name, latitude, longitude, radius_meters, is_active)
      VALUES (${name}, ${latitude}, ${longitude}, ${radius_meters}, true)
      RETURNING id, name, latitude, longitude, radius_meters, is_active, created_at
    `;

    if (result.rows.length === 0) {
      return res.status(500).json({ success: false, error: 'Error al crear geofence' });
    }

    const row = result.rows[0];
    return res.status(201).json({
      success: true,
      data: {
        ...row,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        radius_meters: parseInt(row.radius_meters)
      }
    });
  } catch (error) {
    console.error('[handleCreateGeofence] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al crear geofence' });
  }
}

async function handleUpdateGeofence(req: any, res: any, adminCode: string, geofenceId: any): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  const { name, latitude, longitude, radius_meters } = req.body;
  const gfId = parseInt(geofenceId, 10);

  if (isNaN(gfId)) {
    return res.status(400).json({ success: false, error: 'ID inválido' });
  }

  try {
    const result = await sql`
      UPDATE geofences
      SET name = ${name}, latitude = ${latitude}, longitude = ${longitude}, radius_meters = ${radius_meters}, updated_at = NOW()
      WHERE id = ${gfId}
      RETURNING id, name, latitude, longitude, radius_meters, is_active, created_at
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Geofence no encontrado' });
    }

    const row = result.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        ...row,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        radius_meters: parseInt(row.radius_meters)
      }
    });
  } catch (error) {
    console.error('[handleUpdateGeofence] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar geofence' });
  }
}

async function handleToggleGeofence(req: any, res: any, adminCode: string, geofenceId: any): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  const { is_active } = req.body;
  const gfId = parseInt(geofenceId, 10);

  if (isNaN(gfId)) {
    return res.status(400).json({ success: false, error: 'ID inválido' });
  }

  try {
    const result = await sql`
      UPDATE geofences
      SET is_active = ${is_active}, updated_at = NOW()
      WHERE id = ${gfId}
      RETURNING id, name, latitude, longitude, radius_meters, is_active, created_at
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Geofence no encontrado' });
    }

    const row = result.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        ...row,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        radius_meters: parseInt(row.radius_meters)
      }
    });
  } catch (error) {
    console.error('[handleToggleGeofence] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar geofence' });
  }
}

async function handleDeleteGeofence(req: any, res: any, adminCode: string, geofenceId: any): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  const gfId = parseInt(geofenceId, 10);

  if (isNaN(gfId)) {
    return res.status(400).json({ success: false, error: 'ID inválido' });
  }

  try {
    await sql`DELETE FROM geofences WHERE id = ${gfId}`;

    return res.status(200).json({
      success: true,
      message: 'Geofence eliminado'
    });
  } catch (error) {
    console.error('[handleDeleteGeofence] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al eliminar geofence' });
  }
}
