-- Migration: Course Management System
-- Created: 2025-12-19
-- Description: Tables para sistema de cursos de torno con horarios y sesiones

-- 1. COURSE SCHEDULES (Horarios de curso disponibles)
CREATE TABLE IF NOT EXISTS course_schedules (
    id VARCHAR(50) PRIMARY KEY,
    format VARCHAR(10) NOT NULL CHECK (format IN ('3x2', '2x3')),
    name VARCHAR(100) NOT NULL,
    days TEXT[] NOT NULL, -- ['Tuesday', 'Wednesday', 'Thursday']
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    start_date DATE NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 6,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. COURSE SESSIONS (Sesiones individuales de un horario)
CREATE TABLE IF NOT EXISTS course_sessions (
    id VARCHAR(50) PRIMARY KEY,
    course_schedule_id VARCHAR(50) NOT NULL REFERENCES course_schedules(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic VARCHAR(200) NOT NULL,
    instructor_id INTEGER REFERENCES instructors(id),
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(course_schedule_id, session_number)
);

-- 3. COURSE ENROLLMENTS (Inscripciones de estudiantes)
CREATE TABLE IF NOT EXISTS course_enrollments (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('ENROLL-' || EXTRACT(EPOCH FROM NOW())::BIGINT),
    student_email VARCHAR(255) NOT NULL,
    student_info JSONB NOT NULL, -- { firstName, lastName, phoneNumber }
    course_schedule_id VARCHAR(50) NOT NULL REFERENCES course_schedules(id),
    enrollment_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending_payment' CHECK (status IN ('active', 'completed', 'dropped', 'pending_payment')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
    amount_paid DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(50),
    experience_level VARCHAR(20) CHECK (experience_level IN ('beginner', 'intermediate')),
    special_considerations TEXT,
    sessions JSONB NOT NULL DEFAULT '[]', -- [{ sessionId, attended, notes?, progressRating? }]
    completed_at TIMESTAMP,
    certificate_issued BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_email, course_schedule_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_course_schedules_active ON course_schedules(is_active, start_date);
CREATE INDEX IF NOT EXISTS idx_course_sessions_schedule ON course_sessions(course_schedule_id, session_number);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_schedule ON course_enrollments(course_schedule_id, status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_email ON course_enrollments(student_email);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(status, payment_status);

-- Función para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_course_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_course_schedules_timestamp
    BEFORE UPDATE ON course_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_course_timestamp();

CREATE TRIGGER update_course_enrollments_timestamp
    BEFORE UPDATE ON course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_course_timestamp();

-- Datos seed para testing (horarios ejemplo)
INSERT INTO course_schedules (id, format, name, days, start_time, end_time, start_date, capacity) VALUES
    ('CS-NIGHT-3x2', '3x2', 'Noches', ARRAY['Tuesday', 'Wednesday', 'Thursday'], '19:00', '21:00', '2025-02-25', 6),
    ('CS-MORNING-2x3', '2x3', 'Mañanas', ARRAY['Wednesday', 'Thursday'], '10:00', '13:00', '2025-02-27', 6)
ON CONFLICT (id) DO NOTHING;

-- Sesiones para horario de Noches (3x2)
INSERT INTO course_sessions (id, course_schedule_id, session_number, scheduled_date, start_time, end_time, topic) VALUES
    ('SESS-NIGHT-1', 'CS-NIGHT-3x2', 1, '2025-02-25', '19:00', '21:00', 'Introducción y centrado'),
    ('SESS-NIGHT-2', 'CS-NIGHT-3x2', 2, '2025-02-26', '19:00', '21:00', 'Cilindros básicos'),
    ('SESS-NIGHT-3', 'CS-NIGHT-3x2', 3, '2025-02-27', '19:00', '21:00', 'Cuencos y formas'),
    ('SESS-NIGHT-4', 'CS-NIGHT-3x2', 4, '2025-03-04', '19:00', '21:00', 'Trabajo de grosor'),
    ('SESS-NIGHT-5', 'CS-NIGHT-3x2', 5, '2025-03-05', '19:00', '21:00', 'Proyecto final'),
    ('SESS-NIGHT-6', 'CS-NIGHT-3x2', 6, '2025-03-06', '19:00', '21:00', 'Refinamiento y acabados')
ON CONFLICT (id) DO NOTHING;

-- Sesiones para horario de Mañanas (2x3)
INSERT INTO course_sessions (id, course_schedule_id, session_number, scheduled_date, start_time, end_time, topic) VALUES
    ('SESS-MORNING-1', 'CS-MORNING-2x3', 1, '2025-02-27', '10:00', '13:00', 'Fundamentos del torno'),
    ('SESS-MORNING-2', 'CS-MORNING-2x3', 2, '2025-02-28', '10:00', '13:00', 'Formas intermedias'),
    ('SESS-MORNING-3', 'CS-MORNING-2x3', 3, '2025-03-06', '10:00', '13:00', 'Proyecto final integrado')
ON CONFLICT (id) DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE course_schedules IS 'Horarios de curso disponibles (ciclos de 6h con diferentes formatos)';
COMMENT ON TABLE course_sessions IS 'Sesiones individuales que componen cada horario de curso';
COMMENT ON TABLE course_enrollments IS 'Inscripciones de estudiantes a horarios específicos con tracking de asistencia';
COMMENT ON COLUMN course_schedules.format IS '3x2 = 3 días x 2 horas, 2x3 = 2 días x 3 horas';
COMMENT ON COLUMN course_enrollments.sessions IS 'Array de objetos { sessionId, attended, notes?, progressRating? }';
