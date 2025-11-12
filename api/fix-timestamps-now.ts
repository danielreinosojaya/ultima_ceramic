import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  const { adminCode } = req.query;
  
  // Permitir GET para ejecutar desde navegador
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo GET o POST' });
  }

  if (adminCode !== 'ADMIN2025') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    console.log('🔧 Iniciando corrección de timestamps...');

    // Paso 1: Ver estado actual de TODOS los registros recientes
    const beforeAll = await sql`
      SELECT 
        id, 
        employee_id, 
        date, 
        time_in,
        time_out,
        hours_worked,
        EXTRACT(HOUR FROM time_in AT TIME ZONE 'UTC') as hour_in_utc,
        EXTRACT(HOUR FROM time_out AT TIME ZONE 'UTC') as hour_out_utc
      FROM timecards 
      WHERE date >= '2025-11-06'
      ORDER BY created_at DESC
    `;

    console.log('📊 Estado ANTES:', beforeAll.rows);

    // Paso 2: Corregir TODOS los timestamps de los últimos 2 días
    // Si la hora UTC >= 13, significa que está con +5 horas de más
    const fixAll = await sql`
      UPDATE timecards
      SET 
        time_in = CASE 
          WHEN time_in IS NOT NULL AND EXTRACT(HOUR FROM time_in AT TIME ZONE 'UTC') >= 13 
          THEN time_in - INTERVAL '5 hours'
          ELSE time_in
        END,
        time_out = CASE 
          WHEN time_out IS NOT NULL AND EXTRACT(HOUR FROM time_out AT TIME ZONE 'UTC') >= 13 
          THEN time_out - INTERVAL '5 hours'
          ELSE time_out
        END
      WHERE date >= '2025-11-06'
      RETURNING id, time_in, time_out
    `;

    console.log('✅ Timestamps corregidos:', fixAll.rowCount);

    // Paso 3: Recalcular TODAS las horas trabajadas
    const recalcAll = await sql`
      UPDATE timecards
      SET hours_worked = EXTRACT(EPOCH FROM (time_out - time_in)) / 3600
      WHERE date >= '2025-11-06'
        AND time_in IS NOT NULL
        AND time_out IS NOT NULL
      RETURNING id, hours_worked
    `;

    console.log('✅ Horas recalculadas:', recalcAll.rowCount);

    // Paso 4: Verificar resultado
    const afterAll = await sql`
      SELECT 
        id, 
        employee_id, 
        date, 
        time_in,
        time_out,
        hours_worked,
        EXTRACT(HOUR FROM time_in AT TIME ZONE 'UTC') as hour_in_utc,
        EXTRACT(HOUR FROM time_out AT TIME ZONE 'UTC') as hour_out_utc,
        time_in AT TIME ZONE 'America/Bogota' as time_in_display,
        time_out AT TIME ZONE 'America/Bogota' as time_out_display
      FROM timecards 
      WHERE date >= '2025-11-06'
      ORDER BY created_at DESC
    `;

    console.log('📊 Estado DESPUÉS:', afterAll.rows);

    return res.json({
      success: true,
      message: '✅ Corrección completa',
      stats: {
        totalProcessed: fixAll.rowCount,
        hoursRecalculated: recalcAll.rowCount
      },
      before: beforeAll.rows,
      after: afterAll.rows
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: String(error),
      stack: (error as Error).stack
    });
  }
}
