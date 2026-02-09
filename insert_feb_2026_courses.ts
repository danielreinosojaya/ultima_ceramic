import { sql } from '@vercel/postgres';

async function insertFeb2026CourseData() {
  try {
    console.log('Iniciando inserción de datos de cursos para Feb 2026...');

    // 1. Insertar el schedule (CS-MORNING-FEB2026)
    const scheduleResult = await sql`
      INSERT INTO course_schedules (id, format, name, days, start_time, end_time, start_date, capacity, is_active)
      VALUES (
        'CS-MORNING-FEB2026',
        '2x3',
        'Mañanas Febrero 2026',
        ARRAY['Wednesday', 'Thursday'],
        '10:00',
        '13:00',
        '2026-02-11',
        6,
        true
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id;
    `;
    console.log('✓ Schedule insertado:', scheduleResult.rows);

    // 2. Insertar sesiones individuales
    const sessionsResult = await sql`
      INSERT INTO course_sessions (
        id,
        course_schedule_id,
        session_number,
        scheduled_date,
        start_time,
        end_time,
        topic,
        status
      )
      VALUES
        ('SESS-FEB2026-1', 'CS-MORNING-FEB2026', 1, '2026-02-11', '10:00', '13:00', 'Fundamentos del torno', 'upcoming'),
        ('SESS-FEB2026-2', 'CS-MORNING-FEB2026', 2, '2026-02-12', '10:00', '13:00', 'Formas intermedias', 'upcoming')
      ON CONFLICT (id) DO NOTHING
      RETURNING id, scheduled_date, start_time, end_time;
    `;
    console.log('✓ Sesiones insertadas:', sessionsResult.rows);

    // 3. Validación: consultar datos insertados
    const validationResult = await sql`
      SELECT 
        cs.id as schedule_id,
        cs.name,
        cs.start_date,
        cs.start_time,
        cs.end_time,
        cnt.session_count
      FROM course_schedules cs
      LEFT JOIN (
        SELECT 
          course_schedule_id,
          COUNT(*) as session_count
        FROM course_sessions
        WHERE course_schedule_id = 'CS-MORNING-FEB2026'
        GROUP BY course_schedule_id
      ) cnt ON cs.id = cnt.course_schedule_id
      WHERE cs.id = 'CS-MORNING-FEB2026';
    `;
    console.log('✓ Validación de datos:', validationResult.rows);

    console.log('✅ Inserción exitosa de datos para Feb 2026');
    return true;
  } catch (error) {
    console.error('❌ Error insertando datos:', error);
    throw error;
  }
}

// Ejecutar
insertFeb2026CourseData()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
