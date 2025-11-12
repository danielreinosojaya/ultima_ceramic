// Tipos para el módulo de Control de Asistencia

export interface Employee {
  id: number;
  code: string;
  name: string;
  email?: string;
  position?: string;
  status: 'active' | 'inactive' | 'on_leave';
  hire_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Timecard {
  id: number;
  employee_id: number;
  date: string;
  time_in?: string;
  time_out?: string;
  hours_worked?: number;
  notes?: string;
  edited_by?: number;
  edited_at?: string;
  created_at: string;
  updated_at: string;
  // camelCase aliases for flexibility
  employeeId?: number;
  timeIn?: string;
  timeOut?: string;
  hoursWorked?: number;
  editedBy?: number;
  editedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimecardAudit {
  id: number;
  timecard_id: number;
  admin_id: number;
  action: 'created' | 'edited' | 'deleted';
  old_value?: string;
  new_value?: string;
  reason?: string;
  created_at: string;
}

export interface TimecardDayStatus {
  employee: Partial<Employee>;
  date: string;
  time_in?: string;
  time_out?: string;
  hours_worked?: number;
  status: 'present' | 'absent' | 'on_leave' | 'late' | 'in_progress';
  is_current_day?: boolean;
}

export interface TimecardReport {
  employee: Employee;
  month: number;
  year: number;
  timecards: Timecard[];
  total_hours: number;
  average_hours: number;
  days_present: number;
  days_late?: number;
  days_absent?: number;
}

export interface AdminDashboardStats {
  total_employees: number;
  active_today: number;
  absent_today: number;
  late_today: number;
  average_hours_today: number;
  employees_status: TimecardDayStatus[];
}

export interface ClockInResponse {
  success: boolean;
  message: string;
  warning?: string | null;
  employee?: Employee;
  timestamp?: string;
  displayTime?: string;
  today_hours?: number;
}

export interface ClockOutResponse {
  success: boolean;
  message: string;
  hours_worked?: number;
  timestamp?: string;
  displayTime?: string;
}

// Horarios de empleados
export interface EmployeeSchedule {
  id: number;
  employee_id: number;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  check_in_time: string; // HH:mm formato (ej: "09:00")
  check_out_time: string; // HH:mm formato (ej: "17:00")
  grace_period_minutes: number; // Minutos de tolerancia (default: 10)
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // camelCase aliases
  employeeId?: number;
  dayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  checkInTime?: string;
  checkOutTime?: string;
  gracePeriodMinutes?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LateArrival {
  timecard_id: number;
  employee_id: number;
  scheduled_time: string;
  actual_time: string;
  minutes_late: number;
  date: string;
  employee_name: string;
  employee_code: string;
  // camelCase aliases
  timecardId?: number;
  employeeId?: number;
  scheduledTime?: string;
  actualTime?: string;
  minutesLate?: number;
  employeeName?: string;
  employeeCode?: string;
}
