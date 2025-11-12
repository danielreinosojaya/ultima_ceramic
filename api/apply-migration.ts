import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  const { adminCode } = req.query;
  if (adminCode !== 'ADMIN2025') {
    return res.status(403).json({ error: 'Código admin inválido' });
  }

  try {
    // Corregir time_in: restar 5 horas
    const fixTimeIn = await sql`
      UPDATE timecards
      SET time_in = time_in - INTERVAL '5 hours'
      WHERE time_in IS NOT NULL
        AND DATE(time_in) >= '2025-11-06'
        AND EXTRACT(HOUR FROM time_in AT TIME ZONE 'UTC') > 12
      RETURNING id, time_in
    `;

    // Corregir time_out: restar 5 horas
    const fixTimeOut = await sql`
      UPDATE timecards
      SET time_out = time_out - INTERVAL '5 hours'
      WHERE time_out IS NOT NULL
        AND DATE(time_out) >= '2025-11-06'
        AND EXTRACT(HOUR FROM time_out AT TIME ZONE 'UTC') > 12
      RETURNING id, time_out
    `;

    // Recalcular hours_worked
    const recalcHours = await sql`
      UPDATE timecards
      SET hours_worked = EXTRACT(EPOCH FROM (time_out - time_in)) / 3600
      WHERE time_out IS NOT NULL
        AND time_in IS NOT NULL
        AND DATE(time_in) >= '2025-11-06'
      RETURNING id, hours_worked
    `;

    return res.json({
      success: true,
      message: 'Migration aplicada exitosamente',
      changes: {
        timeInFixed: fixTimeIn.rows.length,
        timeOutFixed: fixTimeOut.rows.length,
        hoursRecalculated: recalcHours.rows.length
      }
    });
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({
      success: false,
      error: String(error)
    });
  }
}
