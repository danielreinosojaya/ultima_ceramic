
import React, { useState } from 'react';
import axios from "../../node_modules/axios/index.js";
import EmployeeList from './EmployeeList';
import EmployeeForm from './EmployeeForm';
import VacationManager from './VacationManager';
import DiscountManager from './DiscountManager';
import ExtraPaymentManager from './ExtraPaymentManager';
import AbsenceManager from './AbsenceManager';
import DelayManager from './DelayManager';
import WorkHoursMonitor from './WorkHoursMonitor';
import PayrollManager from './PayrollManager';
import SocialSecurityManager from './SocialSecurityManager';
import ReportGenerator from './ReportGenerator';

const modules = [
  { key: 'empleados', label: 'Gestión de empleados', icon: 'person_search' },
  { key: 'vacaciones', label: 'Vacaciones', icon: 'beach_access' },
  { key: 'descuentos', label: 'Descuentos', icon: 'remove_circle' },
  { key: 'pagos-extras', label: 'Pagos extras', icon: 'attach_money' },
  { key: 'faltas', label: 'Faltas', icon: 'block' },
  { key: 'retrasos', label: 'Retrasos', icon: 'timer' },
  { key: 'horas', label: 'Horas trabajadas', icon: 'schedule' },
  { key: 'roles-pago', label: 'Roles de pago', icon: 'receipt_long' },
  { key: 'aportes', label: 'Aportaciones IESS', icon: 'account_balance' },
  { key: 'reportes', label: 'Reportes', icon: 'bar_chart' },
];


const RRHHDashboard: React.FC = () => {
  const [screen, setScreen] = useState<'init' | 'admin' | 'registro' | 'adminAuth'>('init');
  const [activeModule, setActiveModule] = useState<string>('empleados');
  const [codigoEmpleado, setCodigoEmpleado] = useState('');
  const [registroStatus, setRegistroStatus] = useState<string>('');
  const [adminCode, setAdminCode] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');

  const handleRegistro = async (tipo: 'entrada' | 'salida') => {
    if (!codigoEmpleado.trim()) {
      setRegistroStatus('Ingrese su código único.');
      return;
    }
    try {
      const res = await axios.post('/api/rrhh?action=registro', {
        codigo: codigoEmpleado,
        tipo
      });
      setRegistroStatus(`Registro de ${tipo} exitoso para código ${codigoEmpleado} a las ${res.data.fecha}`);
      setCodigoEmpleado('');
    } catch (err: any) {
      setRegistroStatus('Error al registrar. Intente nuevamente.');
    }
  };

  if (screen === 'init') {
    return (
      <div className="p-8 bg-white rounded-lg shadow-md flex flex-col items-center justify-center gap-8 min-h-[60vh]">
        <h1 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span className="material-icons text-blue-600">groups</span>
          Módulo RRHH
        </h1>
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-lg">
          <button
            className="bg-blue-600 text-white px-6 py-4 rounded-lg shadow hover:bg-blue-700 transition text-lg font-semibold flex-1 flex items-center justify-center gap-2"
            onClick={() => setScreen('adminAuth')}
          >
            <span className="material-icons">dashboard</span>
            Acceso Administrador
          </button>
          <button
            className="bg-green-600 text-white px-6 py-4 rounded-lg shadow hover:bg-green-700 transition text-lg font-semibold flex-1 flex items-center justify-center gap-2"
            onClick={() => setScreen('registro')}
          >
            <span className="material-icons">login</span>
            Registro Entrada/Salida
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'adminAuth') {
    return (
      <div className="p-8 bg-white rounded-lg shadow-md flex flex-col items-center justify-center gap-6 min-h-[60vh]">
        <h2 className="text-xl font-bold mb-2 text-gray-800 flex items-center gap-2">
          <span className="material-icons text-blue-600">lock</span>
          Código de acceso administrador
        </h2>
        <input
          type="password"
          placeholder="Ingrese el código de administrador"
          className="border rounded px-4 py-2 w-full max-w-xs text-lg"
          value={adminCode}
          onChange={e => setAdminCode(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition text-lg font-semibold"
          onClick={() => {
            if (adminCode === '0990') {
              setScreen('admin');
              setAdminCode('');
              setAdminAuthError('');
            } else {
              setAdminAuthError('Código incorrecto. Intente nuevamente.');
            }
          }}
        >Ingresar</button>
        {adminAuthError && (
          <div className="mt-2 text-center text-sm text-red-600 bg-red-100 rounded p-2 w-full max-w-md">
            {adminAuthError}
          </div>
        )}
        <button
          className="mt-6 text-blue-600 underline"
          onClick={() => {
            setScreen('init');
            setAdminCode('');
            setAdminAuthError('');
          }}
        >Volver</button>
      </div>
    );
  }

  if (screen === 'registro') {
    return (
      <div className="p-8 bg-white rounded-lg shadow-md flex flex-col items-center justify-center gap-6 min-h-[60vh]">
        <h2 className="text-xl font-bold mb-2 text-gray-800 flex items-center gap-2">
          <span className="material-icons text-green-600">login</span>
          Registro Entrada/Salida
        </h2>
        <input
          type="text"
          placeholder="Ingrese su código único de empleado"
          className="border rounded px-4 py-2 w-full max-w-xs text-lg"
          value={codigoEmpleado}
          onChange={e => setCodigoEmpleado(e.target.value)}
        />
        <div className="flex gap-4">
          <button
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition text-lg font-semibold"
            onClick={() => handleRegistro('entrada')}
          >Registrar Entrada</button>
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition text-lg font-semibold"
            onClick={() => handleRegistro('salida')}
          >Registrar Salida</button>
        </div>
        {registroStatus && (
          <div className="mt-4 text-center text-sm text-gray-700 bg-gray-100 rounded p-2 w-full max-w-md">
            {registroStatus}
          </div>
        )}
        <button
          className="mt-6 text-blue-600 underline"
          onClick={() => setScreen('init')}
        >Volver</button>
      </div>
    );
  }

  // Pantalla admin normal
  const renderModule = () => {
    switch (activeModule) {
      case 'empleados':
        return <EmployeeList />;
      case 'vacaciones':
        return <VacationManager />;
      case 'descuentos':
        return <DiscountManager />;
      case 'pagos-extras':
        return <ExtraPaymentManager />;
      case 'faltas':
        return <AbsenceManager />;
      case 'retrasos':
        return <DelayManager />;
      case 'horas':
        return <WorkHoursMonitor />;
      case 'roles-pago':
        return <PayrollManager />;
      case 'aportes':
        return <SocialSecurityManager />;
      case 'reportes':
        return <ReportGenerator />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span className="material-icons text-blue-600">groups</span>
        Módulo RRHH
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* KPIs */}
        <div className="bg-blue-50 p-4 rounded flex flex-col items-center">
          <span className="material-icons text-blue-500 mb-2">person</span>
          <span className="font-semibold text-lg">Empleados activos</span>
          <span className="text-2xl text-blue-700">--</span>
        </div>
        <div className="bg-yellow-50 p-4 rounded flex flex-col items-center">
          <span className="material-icons text-yellow-500 mb-2">beach_access</span>
          <span className="font-semibold text-lg">Vacaciones pendientes</span>
          <span className="text-2xl text-yellow-700">--</span>
        </div>
        <div className="bg-red-50 p-4 rounded flex flex-col items-center">
          <span className="material-icons text-red-500 mb-2">remove_circle</span>
          <span className="font-semibold text-lg">Descuentos</span>
          <span className="text-2xl text-red-700">--</span>
        </div>
        <div className="bg-green-50 p-4 rounded flex flex-col items-center">
          <span className="material-icons text-green-500 mb-2">attach_money</span>
          <span className="font-semibold text-lg">Pagos extras</span>
          <span className="text-2xl text-green-700">--</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {modules.map((mod) => (
          <button
            key={mod.key}
            className={`bg-gray-100 hover:bg-blue-100 p-4 rounded flex items-center gap-3 shadow-sm transition font-medium text-gray-700 ${activeModule === mod.key ? 'border-2 border-blue-500' : ''}`}
            onClick={() => setActiveModule(mod.key)}
          >
            <span className={`material-icons text-${mod.icon.includes('money') ? 'green' : mod.icon.includes('remove') ? 'red' : mod.icon.includes('beach') ? 'yellow' : mod.icon.includes('block') ? 'pink' : mod.icon.includes('timer') ? 'orange' : mod.icon.includes('schedule') ? 'indigo' : mod.icon.includes('receipt') ? 'teal' : mod.icon.includes('account') ? 'cyan' : mod.icon.includes('bar') ? 'gray' : 'blue'}-600`}>{mod.icon}</span>
            {mod.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {renderModule()}
      </div>
      <button
        className="mt-8 text-blue-600 underline"
        onClick={() => setScreen('init')}
      >Volver</button>
    </div>
  );
};

export default RRHHDashboard;
