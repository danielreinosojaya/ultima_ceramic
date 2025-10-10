// API endpoint para el módulo RRHH
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  registrarEntradaSalida,
  obtenerLogsRRHH,
  registrarEmpleado,
  obtenerEmpleados,
  registrarVacacion,
  obtenerVacaciones,
  registrarDescuento,
  obtenerDescuentos,
  registrarPagoExtra,
  obtenerPagosExtras,
  registrarFalta,
  obtenerFaltas,
  registrarRetraso,
  obtenerRetrasos,
  registrarHorasTrabajo,
  obtenerHorasTrabajadas,
  calcularRolPago,
  generarReporteRRHH,
  deleteEmployee
} from './rrhhService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  // Borrado de empleado
  if (method === 'DELETE' && query.action === 'empleado') {
    const { id } = query;
    if (!id) return res.status(400).json({ error: 'Falta el id de empleado' });
    try {
      await deleteEmployee(String(id));
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error al borrar empleado:', error);
      return res.status(500).json({ error: (error instanceof Error ? error.message : 'Error interno al borrar empleado'), details: error });
    }
  }

  if (method === 'POST' && query.action === 'registro') {
    const { codigo, tipo } = body;
    if (!codigo || !tipo) return res.status(400).json({ error: 'Faltan datos' });
    const log = await registrarEntradaSalida(codigo, tipo);
    return res.status(200).json(log);
  }

  if (method === 'GET' && query.action === 'logs') {
    const logs = await obtenerLogsRRHH();
    return res.status(200).json(logs);
  }

  if (method === 'POST' && query.action === 'empleado') {
    const empleado = body;
    if (!empleado) return res.status(400).json({ error: 'Faltan datos de empleado' });
    // Mapear campos para asegurar camelCase
    const mappedEmpleado = {
      nombre: empleado.nombre || empleado.Nombre,
      cedula: empleado.cedula || empleado.Cedula,
      cargo: empleado.cargo || empleado.Cargo,
      fechaIngreso: empleado.fechaIngreso || empleado.fecha_ingreso,
      estado: empleado.estado || empleado.Estado || 'activo',
      salario: empleado.salario || empleado.Salario || 0
    };
    // Validar campos obligatorios
    if (!mappedEmpleado.nombre || !mappedEmpleado.cedula || !mappedEmpleado.cargo || !mappedEmpleado.fechaIngreso) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, cedula, cargo, fechaIngreso' });
    }
    try {
      const emp = await registrarEmpleado(mappedEmpleado);
      return res.status(200).json(emp);
    } catch (error) {
      console.error('Error al crear empleado:', error);
  return res.status(500).json({ error: (error instanceof Error ? error.message : 'Error interno al crear empleado'), details: error });
    }
  }

  if (method === 'GET' && query.action === 'empleados') {
    const empleados = await obtenerEmpleados();
    return res.status(200).json(empleados);
  }

  // Vacaciones
  if (method === 'POST' && query.action === 'vacacion') {
    const vacacion = body;
    if (!vacacion) return res.status(400).json({ error: 'Faltan datos de vacación' });
    const v = await registrarVacacion(vacacion);
    return res.status(200).json(v);
  }
  if (method === 'GET' && query.action === 'vacaciones') {
    const vacaciones = await obtenerVacaciones();
    return res.status(200).json(vacaciones);
  }
  // Descuentos
  if (method === 'POST' && query.action === 'descuento') {
    const descuento = body;
    if (!descuento) return res.status(400).json({ error: 'Faltan datos de descuento' });
    const d = await registrarDescuento(descuento);
    return res.status(200).json(d);
  }
  if (method === 'GET' && query.action === 'descuentos') {
    const descuentos = await obtenerDescuentos();
    return res.status(200).json(descuentos);
  }
  // Pagos extras
  if (method === 'POST' && query.action === 'pagoextra') {
    const pago = body;
    if (!pago) return res.status(400).json({ error: 'Faltan datos de pago extra' });
    const p = await registrarPagoExtra(pago);
    return res.status(200).json(p);
  }
  if (method === 'GET' && query.action === 'pagosextras') {
    const pagosextras = await obtenerPagosExtras();
    return res.status(200).json(pagosextras);
  }

  // Faltas
  if (method === 'POST' && query.action === 'falta') {
    const falta = body;
    if (!falta) return res.status(400).json({ error: 'Faltan datos de falta' });
    const f = registrarFalta(falta);
    return res.status(200).json(f);
  }
  if (method === 'GET' && query.action === 'faltas') {
    const faltas = obtenerFaltas();
    return res.status(200).json(faltas);
  }
  // Retrasos
  if (method === 'POST' && query.action === 'retraso') {
    const retraso = body;
    if (!retraso) return res.status(400).json({ error: 'Faltan datos de retraso' });
    const r = registrarRetraso(retraso);
    return res.status(200).json(r);
  }
  if (method === 'GET' && query.action === 'retrasos') {
    const retrasos = obtenerRetrasos();
    return res.status(200).json(retrasos);
  }
  // Horas trabajadas
  if (method === 'POST' && query.action === 'horastrabajo') {
    const horas = body;
    if (!horas) return res.status(400).json({ error: 'Faltan datos de horas trabajadas' });
    const h = registrarHorasTrabajo(horas);
    return res.status(200).json(h);
  }
  if (method === 'GET' && query.action === 'horastrabajadas') {
    const horas = obtenerHorasTrabajadas();
    return res.status(200).json(horas);
  }

  // Rol de pago
  if (method === 'GET' && query.action === 'rolpago') {
    const { empleadoId, mes, anio } = query;
    if (!empleadoId || !mes || !anio) return res.status(400).json({ error: 'Faltan datos para rol de pago' });
    const rol = calcularRolPago(String(empleadoId), String(mes), Number(anio));
    return res.status(200).json(rol);
  }

  // Reportes RRHH
  if (method === 'GET' && query.action === 'reporterrhh') {
    const { tipo, mes, anio } = query;
    if (!tipo || !mes || !anio) return res.status(400).json({ error: 'Faltan datos para reporte RRHH' });
    const reporte = generarReporteRRHH(String(tipo), String(mes), Number(anio));
    return res.status(200).json(reporte);
  }

  return res.status(404).json({ error: 'No encontrado' });
}
