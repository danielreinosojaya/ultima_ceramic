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
    if (!adminCode || !adminCode.startsWith(ADMIN_CODE_PREFIX)) {
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
    return false;
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
    return toCamelCase(result.rows[0]) as Employee;
  } catch (error) {
    console.error('[findEmployeeByCode] Error:', error);
    return null;
  }
}

async function getTodayTimecard(employeeId: number): Promise<Timecard | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await sql`
      SELECT * FROM timecards
      WHERE employee_id = ${employeeId} AND date = ${today}
      LIMIT 1
    `;

    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as Timecard;
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
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    await sql`
      INSERT INTO timecards (employee_id, date, time_in)
      VALUES (${employee.id}, ${today}, ${now.toISOString()})
    `;

    return res.status(200).json({
      success: true,
      message: `Entrada registrada correctamente a las ${now.toLocaleTimeString()}`,
      employee,
      timestamp: now.toISOString()
    } as ClockInResponse);
  } catch (error) {
    console.error('[handleClockIn] Error:', error);
    return res.status(500).json({ success: false, message: 'Error al registrar entrada' } as ClockInResponse);
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

    return res.status(200).json({
      success: true,
      message: `Salida registrada correctamente`,
      hours_worked: hoursWorked,
      timestamp: now.toISOString()
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
    const today = new Date().toISOString().split('T')[0];

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
  if (!code || !month || !year) {
    return res.status(400).json({ success: false, error: 'Parámetros incompletos' });
  }

  const employee = await findEmployeeByCode(code);
  if (!employee) {
    return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
  }

  try {
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

  try {
    const result = await sql`
      INSERT INTO employees (code, name, email, position, status)
      VALUES (${code}, ${name}, ${email || null}, ${position || null}, 'active')
      RETURNING *
    `;

    return res.status(201).json({
      success: true,
      data: toCamelCase(result.rows[0])
    });
  } catch (error: any) {
    if (error.message.includes('duplicate')) {
      return res.status(409).json({ success: false, error: 'El código ya existe' });
    }
    console.error('[handleCreateEmployee] Error:', error);
    return res.status(500).json({ success: false, error: 'Error al crear empleado' });
  }
}

async function handleListEmployees(req: any, res: any, adminCode: string): Promise<any> {
  const isAdmin = await verifyAdminCode(adminCode);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Código admin inválido' });
  }

  try {
    const result = await sql`
      SELECT * FROM employees
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
