// ...existing code...
// Entradas/Salidas
export async function registrarEntradaSalida(codigo: string, tipo: 'entrada' | 'salida') {
  return await createLogRRHH({ codigo, tipo });
}
export async function obtenerLogsRRHH() {
  return await getLogsRRHH();
}

// Empleados
export async function registrarEmpleado(empleado: any) {
  return await createEmployee({
    nombre: empleado.nombre,
    cedula: empleado.cedula,
    cargo: empleado.cargo,
    fechaIngreso: empleado.fechaIngreso,
    estado: empleado.estado,
    salario: empleado.salario
  });
}
export async function obtenerEmpleados() {
  return await getEmployees();
}

// Vacaciones
export async function registrarVacacion(vacacion: any) {
  return await createVacacion({
    empleadoId: vacacion.empleadoId,
    fechaInicio: vacacion.fechaInicio,
    fechaFin: vacacion.fechaFin,
    motivo: vacacion.motivo
  });
}
export async function obtenerVacaciones() {
  return await getVacaciones();
}

// Horas trabajadas
export async function registrarHorasTrabajo(horas: any) {
  return await createHorasTrabajadas({
    empleadoId: horas.empleadoId,
    fecha: horas.fecha,
    horas: horas.horas
  });
}
export async function obtenerHorasTrabajadas() {
  return await getHorasTrabajadas();
}

// Reportes RRHH
export async function generarReporteRRHH(tipo: string, mes: string, anio: number) {
  const empleados = await getEmployees();
  switch (tipo) {
    case 'roles':
      return await Promise.all(empleados.map((e: any) => calcularRolPago(e.id, mes, anio)));
    case 'aportes':
      return await Promise.all(empleados.map(async (e: any) => {
        const rol = await calcularRolPago(e.id, mes, anio);
        return {
          empleadoId: e.id,
          nombre: e.nombre,
          aporteIessEmpleado: rol ? rol.aporteIessEmpleado : 0,
          aporteIessEmpleador: rol ? rol.aporteIessEmpleador : 0,
        };
      }));
    case 'fondos':
      return await Promise.all(empleados.map(async (e: any) => {
        const rol = await calcularRolPago(e.id, mes, anio);
        return {
          empleadoId: e.id,
          nombre: e.nombre,
          fondoReserva: rol ? rol.fondoReserva : 0,
        };
      }));
    case 'decimos':
      return await Promise.all(empleados.map(async (e: any) => {
        const rol = await calcularRolPago(e.id, mes, anio);
        return {
          empleadoId: e.id,
          nombre: e.nombre,
          decimoTercero: rol ? rol.decimoTercero : 0,
          decimoCuarto: rol ? rol.decimoCuarto : 0,
        };
      }));
    default:
      return [];
  }
}

import {
  createEmployee, getEmployees, updateEmployee,
  createVacacion, getVacaciones,
  createDescuento, getDescuentos,
  createPagoExtra, getPagosExtras,
  createFalta, getFaltas,
  createRetraso, getRetrasos,
  createHorasTrabajadas, getHorasTrabajadas,
  createLogRRHH, getLogsRRHH
} from './db';
export { deleteEmployee } from './db';

// Normativa ecuatoriana
const IESS_EMPLEADO = 0.0945;
const IESS_EMPLEADOR = 0.1115;
const FONDO_RESERVA = 0.0833;
const DECIMO_TERCERO = 1 / 12;
const DECIMO_CUARTO = 460; // Remuneración básica unificada 2025

// Faltas
export async function registrarFalta(falta: any) {
  return await createFalta({
    empleadoId: falta.empleadoId,
    fecha: falta.fecha,
    motivo: falta.motivo
  });
}
// Duplicated code and imports removed

export async function obtenerFaltas() {
  return await getFaltas();
}

// Retrasos
export async function registrarRetraso(retraso: any) {
  return await createRetraso({
    empleadoId: retraso.empleadoId,
    fecha: retraso.fecha,
    minutos: retraso.minutos,
    motivo: retraso.motivo
  });
}
export async function obtenerRetrasos() {
  return await getRetrasos();
}


// Descuentos
export async function registrarDescuento(descuento: any) {
  return await createDescuento({
    empleadoId: descuento.empleadoId,
    monto: descuento.monto,
    motivo: descuento.motivo,
    mes: descuento.mes,
    anio: descuento.anio
  });
}
export async function obtenerDescuentos() {
  return await getDescuentos();
}

// Pagos extras
export async function registrarPagoExtra(pago: any) {
  return await createPagoExtra({
    empleadoId: pago.empleadoId,
    monto: pago.monto,
    motivo: pago.motivo,
    mes: pago.mes,
    anio: pago.anio
  });
}
export async function obtenerPagosExtras() {
  return await getPagosExtras();
}

// Cálculo rol de pago
export async function calcularRolPago(empleadoId: string, mes: string, anio: number) {
  const empleados = await getEmployees();
  const emp = empleados.find((e: any) => e.id === empleadoId);
  if (!emp) return {
    aporteIessEmpleado: 0,
    aporteIessEmpleador: 0,
    fondoReserva: 0,
    decimoTercero: 0,
    decimoCuarto: 0
  };

  const salarioBase = Number(emp.salario || 0);
  const descuentosArr = (await getDescuentos()).filter((d: any) => d.empleado_id === empleadoId && d.mes === mes && d.anio === Number(anio));
  const descuentos = descuentosArr.reduce((sum: number, d: any) => sum + Number(d.monto || 0), 0);
  const pagosExtrasArr = (await getPagosExtras()).filter((p: any) => p.empleado_id === empleadoId && p.mes === mes && p.anio === Number(anio));
  const pagosExtras = pagosExtrasArr.reduce((sum: number, p: any) => sum + Number(p.monto || 0), 0);
  const aporteIessEmpleado = salarioBase * IESS_EMPLEADO;
  const aporteIessEmpleador = salarioBase * IESS_EMPLEADOR;
  // Fondo de reserva
  const fechaIngreso = new Date(emp.fechaIngreso);
  const fechaCorte = new Date(`${anio}-${mes}-01`);
  const tieneFondoReserva = fechaCorte.getFullYear() - fechaIngreso.getFullYear() > 1 || (fechaCorte.getFullYear() - fechaIngreso.getFullYear() === 1 && fechaCorte.getMonth() >= fechaIngreso.getMonth());
  const fondoReserva = tieneFondoReserva ? salarioBase * FONDO_RESERVA : 0;
  const decimoTercero = salarioBase * DECIMO_TERCERO;
  const decimoCuarto = DECIMO_CUARTO / 12;
  return {
    aporteIessEmpleado,
    aporteIessEmpleador,
    fondoReserva,
    decimoTercero,
    decimoCuarto
  };
}
// Eliminar duplicados y fragmentos corruptos
// Todas las funciones están correctamente cerradas y exportadas arriba

