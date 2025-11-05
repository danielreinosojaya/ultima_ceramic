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
  employee?: Employee;
  timestamp?: string;
  today_hours?: number;
}

export interface ClockOutResponse {
  success: boolean;
  message: string;
  hours_worked?: number;
  timestamp?: string;
}
