/**
 * ============================================
 * MÓDULO DE MARCACIÓN SIMPLIFICADO
 * ============================================
 * 
 * ARQUITECTURA SIMPLE:
 * 1. Backend guarda timestamps en UTC (PostgreSQL TIMESTAMP)
 * 2. Frontend muestra en timezone America/Guayaquil
 * 3. Cálculo de horas: diferencia UTC pura
 * 4. Sin conversiones complejas ni helpers ambiguos
 */

import { sql } from '@vercel/postgres';

// ============================================
// TIPOS
// ============================================

interface Employee {
  id: number;
  code: string;
  name: string;
  position?: string;
  status: 'active' | 'inactive';
}

interface Timecard {
  id: number;
  employeeId: number;
  date: string;          // YYYY-MM-DD en timezone Ecuador
  timeIn: string;        // ISO string UTC
  timeOut?: string;      // ISO string UTC
  hoursWorked?: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// UTILIDADES SIMPLES
// ============================================

/**
 * Convierte snake_case a camelCase
 * También normaliza campos de fecha
 */
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      let value = obj[key];
      
      // Normalizar campo 'date' a formato YYYY-MM-DD
      if (key === 'date' && value) {
        if (value instanceof Date) {
          const year = value.getFullYear();
          const month = String(value.getMonth() + 1).padStart(2, '0');
          const day = String(value.getDate()).padStart(2, '0');
          value = `${year}-${month}-${day}`;
        } else if (typeof value === 'string' && value.includes('T')) {
          // Si viene como ISO string, extraer solo la fecha
          value = value.split('T')[0];
        }
      }
      
      result[camelKey] = toCamelCase(value);
      return result;
    }, {} as any);
  }
  
  return obj;
}

/**
 * Obtiene la fecha actual en Ecuador (YYYY-MM-DD)
 */
function getEcuadorDate(): string {
  const now = new Date();
  const ecuadorDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
  const year = ecuadorDate.getFullYear();
  const month = String(ecuadorDate.getMonth() + 1).padStart(2, '0');
  const day = String(ecuadorDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================
// HELPERS
// ============================================

/**
 * Parsea el body - maneja tanto object como string
 */
function parseBody(body: any): any {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (e) {
      console.error('[Parse Error]', e);
      return {};
    }
  }
  return body || {};
}

// ============================================
// HANDLERS
// ============================================

/**
 * Marcar ENTRADA
 */
async function handleClockIn(req: any, res: any) {
  const bodyData = parseBody(req.body);
  const { code } = bodyData;
  
  if (!code) {
    return res.status(400).json({ success: false, error: 'Código requerido' });
  }

  try {
    // 1. Buscar empleado
    const empResult = await sql`
      SELECT id, code, name, position, status 
      FROM employees 
      WHERE code = ${code} AND status = 'active'
      LIMIT 1
    `;

    if (empResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    }

    const employee = empResult.rows[0];
    const ecuadorDate = getEcuadorDate();

    // 2. Verificar si ya marcó hoy
    const existingResult = await sql`
      SELECT id FROM timecards 
      WHERE employee_id = ${employee.id} 
        AND date = ${ecuadorDate}
      LIMIT 1
    `;

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ya has marcado entrada hoy' 
      });
    }

    // 3. Insertar nueva marcación (time_in en UTC)
    const insertResult = await sql`
      INSERT INTO timecards (employee_id, date, time_in, created_at, updated_at)
      VALUES (
        ${employee.id},
        ${ecuadorDate},
        NOW(),
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    const timecard = toCamelCase(insertResult.rows[0]);

    return res.status(200).json({
      success: true,
      message: 'Entrada registrada',
      employee: toCamelCase(employee),
      timecard
    });

  } catch (error) {
    console.error('[ClockIn Error]', error);
    return res.status(500).json({ success: false, error: 'Error al registrar entrada' });
  }
}

/**
 * Marcar SALIDA
 */
async function handleClockOut(req: any, res: any) {
  const bodyData = parseBody(req.body);
  const { code } = bodyData;
  
  if (!code) {
    return res.status(400).json({ success: false, error: 'Código requerido' });
  }

  try {
    // 1. Buscar empleado
    const empResult = await sql`
      SELECT id, code, name FROM employees 
      WHERE code = ${code} AND status = 'active'
      LIMIT 1
    `;

    if (empResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    }

    const employee = empResult.rows[0];
    const ecuadorDate = getEcuadorDate();

    // 2. Buscar marcación de hoy
    const timecardResult = await sql`
      SELECT * FROM timecards 
      WHERE employee_id = ${employee.id} 
        AND date = ${ecuadorDate}
      LIMIT 1
    `;

    if (timecardResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Primero debes marcar entrada' 
      });
    }

    const timecard = timecardResult.rows[0];

    if (timecard.time_out) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ya marcaste salida hoy' 
      });
    }

    // 3. Actualizar con time_out y calcular horas (diferencia UTC)
    const updateResult = await sql`
      UPDATE timecards 
      SET 
        time_out = NOW(),
        hours_worked = EXTRACT(EPOCH FROM (NOW() - time_in)) / 3600,
        updated_at = NOW()
      WHERE id = ${timecard.id}
      RETURNING *
    `;

    const updatedTimecard = toCamelCase(updateResult.rows[0]);

    return res.status(200).json({
      success: true,
      message: `Salida registrada. Horas trabajadas: ${updatedTimecard.hoursWorked?.toFixed(2)}h`,
      timecard: updatedTimecard
    });

  } catch (error) {
    console.error('[ClockOut Error]', error);
    return res.status(500).json({ success: false, error: 'Error al registrar salida' });
  }
}

/**
 * Obtener estado del empleado HOY
 */
async function handleGetEmployeeStatus(req: any, res: any) {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ success: false, error: 'Código requerido' });
  }

  try {
    // 1. Buscar empleado
    // No filtrar por status aquí: el panel admin necesita ver inactivos también
    const empResult = await sql`
      SELECT id, code, name, position, status FROM employees 
      WHERE code = ${code}
      LIMIT 1
    `;

    if (empResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    }

    const employee = toCamelCase(empResult.rows[0]);
    const ecuadorDate = getEcuadorDate();

    // 2. Buscar marcación de hoy
    const timecardResult = await sql`
      SELECT * FROM timecards 
      WHERE employee_id = ${employee.id} 
        AND date = ${ecuadorDate}
      LIMIT 1
    `;

    const todayTimecard = timecardResult.rows.length > 0 
      ? toCamelCase(timecardResult.rows[0])
      : null;

    return res.status(200).json({
      success: true,
      employee,
      todayTimecard,
      ecuadorDate
    });

  } catch (error) {
    console.error('[GetEmployeeStatus Error]', error);
    return res.status(500).json({ success: false, error: 'Error al obtener estado' });
  }
}

/**
 * Obtener historial del empleado
 */
async function handleGetEmployeeHistory(req: any, res: any) {
  const { code, month, year } = req.query;
  
  if (!code) {
    return res.status(400).json({ success: false, error: 'Código requerido' });
  }

  try {
    // 1. Buscar empleado
    const empResult = await sql`
      SELECT id, code, name FROM employees 
      WHERE code = ${code} AND status = 'active'
      LIMIT 1
    `;

    if (empResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    }

    const employee = empResult.rows[0];

    // 2. Obtener historial
    let historyResult;
    
    if (month && year) {
      // Historial de un mes específico
      historyResult = await sql`
        SELECT * FROM timecards 
        WHERE employee_id = ${employee.id}
          AND EXTRACT(MONTH FROM date) = ${parseInt(month)}
          AND EXTRACT(YEAR FROM date) = ${parseInt(year)}
        ORDER BY date DESC
      `;
    } else {
      // Últimos 30 días
      historyResult = await sql`
        SELECT * FROM timecards 
        WHERE employee_id = ${employee.id}
          AND date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY date DESC
      `;
    }

    const history = historyResult.rows.map(row => toCamelCase(row));

    return res.status(200).json({
      success: true,
      employee: toCamelCase(employee),
      history
    });

  } catch (error) {
    console.error('[GetEmployeeHistory Error]', error);
    return res.status(500).json({ success: false, error: 'Error al obtener historial' });
  }
}

/**
 * Obtener TODOS los empleados
 */
async function handleGetAllEmployees(req: any, res: any) {
  try {
    const result = await sql`
      SELECT id, code, name, position, status 
      FROM employees 
      ORDER BY name ASC
    `;

    const employees = result.rows.map(row => toCamelCase(row));

    return res.status(200).json({
      success: true,
      employees
    });
  } catch (error) {
    console.error('[GetAllEmployees Error]', error);
    return res.status(500).json({ success: false, error: 'Error al obtener empleados' });
  }
}

/**
 * Crear nuevo empleado
 */
async function handleCreateEmployee(req: any, res: any) {
  const bodyData = parseBody(req.body);
  const { code, name, position } = bodyData;

  if (!code || !name) {
    return res.status(400).json({ success: false, error: 'Código y nombre requeridos' });
  }

  try {
    // Verificar si el código ya existe
    const existingResult = await sql`
      SELECT id FROM employees WHERE code = ${code.toUpperCase()} LIMIT 1
    `;

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'El código ya existe' });
    }

    // Insertar nuevo empleado
    const insertResult = await sql`
      INSERT INTO employees (code, name, position, status, created_at, updated_at)
      VALUES (
        ${code.toUpperCase()},
        ${name},
        ${position || null},
        'active',
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    const employee = toCamelCase(insertResult.rows[0]);

    return res.status(200).json({
      success: true,
      message: 'Empleado creado correctamente',
      employee
    });
  } catch (error) {
    console.error('[CreateEmployee Error]', error);
    return res.status(500).json({ success: false, error: 'Error al crear empleado' });
  }
}

/**
 * Actualizar estado de empleado (activar/desactivar)
 */
async function handleUpdateEmployeeStatus(req: any, res: any) {
  const bodyData = parseBody(req.body);
  const { employeeId, status } = bodyData;

  if (!employeeId || !status) {
    return res.status(400).json({ success: false, error: 'ID y estado requeridos' });
  }

  if (status !== 'active' && status !== 'inactive') {
    return res.status(400).json({ success: false, error: 'Estado inválido' });
  }

  try {
    const updateResult = await sql`
      UPDATE employees 
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${employeeId}
      RETURNING *
    `;

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    }

    const employee = toCamelCase(updateResult.rows[0]);

    return res.status(200).json({
      success: true,
      message: `Empleado ${status === 'active' ? 'activado' : 'desactivado'}`,
      employee
    });
  } catch (error) {
    console.error('[UpdateEmployeeStatus Error]', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar empleado' });
  }
}

/**
 * Actualizar timecard (editar entrada/salida)
 */
async function handleUpdateTimecard(req: any, res: any) {
  const bodyData = parseBody(req.body);
  const { timecardId, date, timeIn, timeOut } = bodyData;

  if (!timecardId || !date || !timeIn) {
    return res.status(400).json({ success: false, error: 'ID, fecha y entrada requeridos' });
  }

  try {
    // Validar que timeIn sea formato HH:MM
    if (!/^\d{2}:\d{2}$/.test(timeIn)) {
      return res.status(400).json({ success: false, error: 'Formato de entrada inválido (HH:MM)' });
    }

    if (timeOut && !/^\d{2}:\d{2}$/.test(timeOut)) {
      return res.status(400).json({ success: false, error: 'Formato de salida inválido (HH:MM)' });
    }

    // Convertir HH:MM a timestamp UTC
    // date viene como YYYY-MM-DD en Ecuador
    const [year, month, day] = date.split('-').map(Number);
    const [hourIn, minuteIn] = timeIn.split(':').map(Number);
    
    // Crear fecha en Ecuador y convertir a UTC
    const ecuadorDate = new Date(year, month - 1, day, hourIn, minuteIn, 0);
    const ecuadorOffset = -5 * 60; // Ecuador UTC-5
    const timeInUtc = new Date(ecuadorDate.getTime() - (ecuadorDate.getTimezoneOffset() + ecuadorOffset) * 60000);

    // Convertir timeOut si existe
    let timeOutUtc: Date | null = null;
    if (timeOut) {
      const [hourOut, minuteOut] = timeOut.split(':').map(Number);
      const ecuadorDateOut = new Date(year, month - 1, day, hourOut, minuteOut, 0);
      timeOutUtc = new Date(ecuadorDateOut.getTime() - (ecuadorDateOut.getTimezoneOffset() + ecuadorOffset) * 60000);
    }

    // Actualizar timecard
    let hoursWorked = null;
    if (timeOutUtc) {
      hoursWorked = (timeOutUtc.getTime() - timeInUtc.getTime()) / (1000 * 60 * 60);
    }

    const updateResult = await sql`
      UPDATE timecards
      SET
        time_in = ${timeInUtc.toISOString()},
        time_out = ${timeOutUtc ? timeOutUtc.toISOString() : null},
        hours_worked = ${hoursWorked},
        updated_at = NOW()
      WHERE id = ${timecardId}
      RETURNING *
    `;

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Registro no encontrado' });
    }

    const timecard = toCamelCase(updateResult.rows[0]);

    return res.status(200).json({
      success: true,
      message: 'Horario actualizado correctamente',
      timecard
    });
  } catch (error) {
    console.error('[UpdateTimecard Error]', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar horario' });
  }
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

export default async function handler(req: any, res: any) {
  const { action } = req.query;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (action) {
      case 'clock_in':
        return await handleClockIn(req, res);
      
      case 'clock_out':
        return await handleClockOut(req, res);
      
      case 'get_status':
        return await handleGetEmployeeStatus(req, res);
      
      case 'get_history':
        return await handleGetEmployeeHistory(req, res);
      
      case 'get_all_employees':
        return await handleGetAllEmployees(req, res);
      
      case 'create_employee':
        return await handleCreateEmployee(req, res);
      
      case 'update_employee_status':
        return await handleUpdateEmployeeStatus(req, res);
      
      case 'update_timecard':
        return await handleUpdateTimecard(req, res);
      
      default:
        return res.status(400).json({ success: false, error: 'Acción no válida' });
    }
  } catch (error) {
    console.error('[Handler Error]', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}
