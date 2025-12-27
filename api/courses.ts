import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

// Utility: snake_case to camelCase transformer
function toCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(toCamelCase);
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            result[camelKey] = toCamelCase(obj[key]);
            return result;
        }, {} as any);
    }
    return obj;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { action } = req.query;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        switch (action) {
            case 'getSchedules': {
                // Obtener horarios disponibles con información de sesiones
                const { rows: schedules } = await sql`
                    SELECT 
                        cs.id,
                        cs.format,
                        cs.name,
                        cs.days,
                        cs.start_time,
                        cs.end_time,
                        cs.start_date,
                        cs.capacity,
                        cs.is_active,
                        cs.created_at,
                        COALESCE(
                            (SELECT COUNT(*) 
                             FROM course_enrollments 
                             WHERE course_schedule_id = cs.id 
                             AND status IN ('active', 'pending_payment')),
                            0
                        ) as current_enrollments
                    FROM course_schedules cs
                    WHERE cs.is_active = true
                    AND cs.start_date >= CURRENT_DATE
                    ORDER BY cs.start_date ASC
                `;

                // Para cada schedule, obtener sus sesiones
                const schedulesWithSessions = await Promise.all(
                    schedules.map(async (schedule) => {
                        const { rows: sessions } = await sql`
                            SELECT 
                                id,
                                session_number,
                                scheduled_date,
                                start_time,
                                end_time,
                                topic,
                                instructor_id,
                                status
                            FROM course_sessions
                            WHERE course_schedule_id = ${schedule.id}
                            ORDER BY session_number ASC
                        `;

                        return {
                            ...schedule,
                            sessions: sessions
                        };
                    })
                );

                return res.status(200).json({
                    success: true,
                    data: toCamelCase(schedulesWithSessions)
                });
            }

            case 'enroll': {
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }

                const {
                    studentEmail,
                    studentInfo,
                    courseScheduleId,
                    experience,
                    specialConsiderations
                } = req.body;

                // Validaciones
                if (!studentEmail || !studentInfo || !courseScheduleId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Campos requeridos: studentEmail, studentInfo, courseScheduleId'
                    });
                }

                if (!studentInfo.firstName || !studentInfo.lastName || !studentInfo.phoneNumber) {
                    return res.status(400).json({
                        success: false,
                        error: 'Información de estudiante incompleta'
                    });
                }

                // Verificar que el schedule existe y está activo
                const { rows: scheduleRows } = await sql`
                    SELECT id, capacity, start_date, is_active
                    FROM course_schedules
                    WHERE id = ${courseScheduleId}
                `;

                if (scheduleRows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Horario de curso no encontrado'
                    });
                }

                const schedule = scheduleRows[0];

                if (!schedule.is_active) {
                    return res.status(400).json({
                        success: false,
                        error: 'Este horario ya no está disponible'
                    });
                }

                // Verificar capacidad
                const { rows: enrollmentCount } = await sql`
                    SELECT COUNT(*) as count
                    FROM course_enrollments
                    WHERE course_schedule_id = ${courseScheduleId}
                    AND status IN ('active', 'pending_payment')
                `;

                const currentEnrollments = parseInt(enrollmentCount[0].count);
                if (currentEnrollments >= schedule.capacity) {
                    return res.status(400).json({
                        success: false,
                        error: 'Este horario ya alcanzó su capacidad máxima'
                    });
                }

                // Verificar inscripción duplicada
                const { rows: existingEnrollment } = await sql`
                    SELECT id
                    FROM course_enrollments
                    WHERE student_email = ${studentEmail}
                    AND course_schedule_id = ${courseScheduleId}
                    AND status IN ('active', 'pending_payment')
                `;

                if (existingEnrollment.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Ya existe una inscripción activa con este email para este horario'
                    });
                }

                // Obtener sesiones del schedule
                const { rows: sessions } = await sql`
                    SELECT id
                    FROM course_sessions
                    WHERE course_schedule_id = ${courseScheduleId}
                    ORDER BY session_number ASC
                `;

                // Crear inscripción
                const { rows: newEnrollment } = await sql`
                    INSERT INTO course_enrollments (
                        student_email,
                        student_info,
                        course_schedule_id,
                        enrollment_date,
                        status,
                        payment_status,
                        amount_paid,
                        experience_level,
                        special_considerations,
                        sessions
                    ) VALUES (
                        ${studentEmail},
                        ${JSON.stringify(studentInfo)},
                        ${courseScheduleId},
                        NOW(),
                        'pending_payment',
                        'pending',
                        0,
                        ${experience || 'beginner'},
                        ${specialConsiderations || null},
                        ${JSON.stringify(sessions.map(s => ({ sessionId: s.id, attended: false })))}
                    )
                    RETURNING *
                `;

                // TODO Phase 2: Enviar email de confirmación con iCal
                // await sendEnrollmentConfirmationEmail(newEnrollment[0]);

                return res.status(201).json({
                    success: true,
                    data: toCamelCase(newEnrollment[0])
                });
            }

            case 'getEnrollment': {
                const { enrollmentId } = req.query;

                if (!enrollmentId) {
                    return res.status(400).json({
                        success: false,
                        error: 'enrollmentId es requerido'
                    });
                }

                const { rows } = await sql`
                    SELECT * FROM course_enrollments
                    WHERE id = ${enrollmentId as string}
                `;

                if (rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Inscripción no encontrada'
                    });
                }

                return res.status(200).json({
                    success: true,
                    data: toCamelCase(rows[0])
                });
            }

            case 'updatePaymentStatus': {
                if (req.method !== 'PUT') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }

                const { enrollmentId, amountPaid, paymentMethod } = req.body;

                if (!enrollmentId || amountPaid === undefined) {
                    return res.status(400).json({
                        success: false,
                        error: 'enrollmentId y amountPaid son requeridos'
                    });
                }

                const { rows } = await sql`
                    UPDATE course_enrollments
                    SET 
                        payment_status = CASE 
                            WHEN ${amountPaid} >= 150 THEN 'paid'
                            WHEN ${amountPaid} > 0 THEN 'partial'
                            ELSE 'pending'
                        END,
                        amount_paid = ${amountPaid},
                        status = CASE 
                            WHEN ${amountPaid} >= 150 THEN 'active'
                            ELSE status
                        END,
                        payment_method = ${paymentMethod || null},
                        updated_at = NOW()
                    WHERE id = ${enrollmentId}
                    RETURNING *
                `;

                if (rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Inscripción no encontrada'
                    });
                }

                return res.status(200).json({
                    success: true,
                    data: toCamelCase(rows[0])
                });
            }

            case 'markAttendance': {
                if (req.method !== 'PUT') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }

                const { enrollmentId, sessionId, attended, notes, progressRating } = req.body;

                if (!enrollmentId || !sessionId || attended === undefined) {
                    return res.status(400).json({
                        success: false,
                        error: 'enrollmentId, sessionId y attended son requeridos'
                    });
                }

                // Obtener enrollment actual
                const { rows: enrollmentRows } = await sql`
                    SELECT sessions FROM course_enrollments WHERE id = ${enrollmentId}
                `;

                if (enrollmentRows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Inscripción no encontrada'
                    });
                }

                const sessions = enrollmentRows[0].sessions;
                const updatedSessions = sessions.map((s: any) => {
                    if (s.sessionId === sessionId) {
                        return {
                            ...s,
                            attended,
                            notes: notes || s.notes,
                            progressRating: progressRating || s.progressRating
                        };
                    }
                    return s;
                });

                const { rows } = await sql`
                    UPDATE course_enrollments
                    SET 
                        sessions = ${JSON.stringify(updatedSessions)},
                        updated_at = NOW()
                    WHERE id = ${enrollmentId}
                    RETURNING *
                `;

                return res.status(200).json({
                    success: true,
                    data: toCamelCase(rows[0])
                });
            }

            case 'getAllEnrollments': {
                const { scheduleId, status } = req.query;

                let query = sql`
                    SELECT * FROM course_enrollments
                    WHERE 1=1
                `;

                if (scheduleId) {
                    query = sql`${query} AND course_schedule_id = ${scheduleId as string}`;
                }

                if (status) {
                    query = sql`${query} AND status = ${status as string}`;
                }

                query = sql`${query} ORDER BY enrollment_date DESC`;

                const { rows } = await query;

                return res.status(200).json({
                    success: true,
                    data: toCamelCase(rows)
                });
            }

            case 'toggleScheduleActive': {
                if (req.method !== 'PUT') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }

                const { scheduleId, isActive } = req.body;

                if (!scheduleId || isActive === undefined) {
                    return res.status(400).json({
                        success: false,
                        error: 'scheduleId e isActive son requeridos'
                    });
                }

                const { rows } = await sql`
                    UPDATE course_schedules
                    SET 
                        is_active = ${isActive},
                        updated_at = NOW()
                    WHERE id = ${scheduleId}
                    RETURNING *
                `;

                if (rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Horario no encontrado'
                    });
                }

                return res.status(200).json({
                    success: true,
                    data: toCamelCase(rows[0])
                });
            }

            case 'createSchedule': {
                if (req.method !== 'POST') {
                    return res.status(405).json({ success: false, error: 'Method not allowed' });
                }

                const { format, name, days, startTime, endTime, startDate, capacity } = req.body;

                if (!format || !name || !days || !startTime || !endTime || !startDate || !capacity) {
                    return res.status(400).json({
                        success: false,
                        error: 'Todos los campos son requeridos'
                    });
                }

                // Generar ID único
                const scheduleId = `CS-${name.toUpperCase().replace(/\s+/g, '-')}-${Date.now()}`;

                // Crear schedule
                const { rows: scheduleRows } = await sql`
                    INSERT INTO course_schedules (
                        id, format, name, days, start_time, end_time, start_date, capacity, is_active
                    ) VALUES (
                        ${scheduleId},
                        ${format},
                        ${name},
                        ${days},
                        ${startTime},
                        ${endTime},
                        ${startDate},
                        ${capacity},
                        true
                    )
                    RETURNING *
                `;

                // Generar sesiones automáticamente
                const sessions = [];
                const numSessions = format === '3x2' ? 6 : 3;
                const sessionDuration = format === '3x2' ? 2 : 3; // horas por sesión
                
                let currentDate = new Date(startDate + 'T00:00:00');
                let sessionCount = 0;

                const topics = format === '3x2' 
                    ? ['Introducción y centrado', 'Cilindros básicos', 'Cuencos y formas', 'Trabajo de grosor', 'Proyecto final parte 1', 'Refinamiento y acabados']
                    : ['Fundamentos del torno', 'Formas intermedias', 'Proyecto final integrado'];

                while (sessionCount < numSessions) {
                    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()];
                    
                    if (days.includes(dayName)) {
                        const sessionId = `SESS-${scheduleId}-${sessionCount + 1}`;
                        const dateStr = currentDate.toISOString().split('T')[0];
                        
                        await sql`
                            INSERT INTO course_sessions (
                                id, course_schedule_id, session_number, scheduled_date, 
                                start_time, end_time, topic, status
                            ) VALUES (
                                ${sessionId},
                                ${scheduleId},
                                ${sessionCount + 1},
                                ${dateStr},
                                ${startTime},
                                ${endTime},
                                ${topics[sessionCount]},
                                'upcoming'
                            )
                        `;
                        
                        sessions.push({
                            id: sessionId,
                            sessionNumber: sessionCount + 1,
                            scheduledDate: dateStr,
                            startTime,
                            endTime,
                            topic: topics[sessionCount],
                            status: 'upcoming'
                        });
                        
                        sessionCount++;
                    }
                    
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                return res.status(201).json({
                    success: true,
                    data: toCamelCase({
                        ...scheduleRows[0],
                        sessions,
                        currentEnrollments: 0
                    })
                });
            }

            default:
                return res.status(400).json({
                    success: false,
                    error: `Acción no reconocida: ${action}`
                });
        }
    } catch (error: any) {
        console.error('Error in courses API:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Error interno del servidor'
        });
    }
}
