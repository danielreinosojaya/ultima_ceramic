import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(v => toCamelCase(v));
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key) => {
      const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const body = req.body || {};
  const amount = body.amount !== undefined ? Number(body.amount) : null;
  const ttlMinutes = Number(body.ttlMinutes || 15);
  const bookingTempRef = body.bookingTempRef || null;
  const code = body.code || null;
  const giftcardId = body.giftcardId || null;

  if (!amount || amount <= 0) return res.status(400).json({ success: false, error: 'amount is required and must be > 0' });
  if (!code && !giftcardId) return res.status(400).json({ success: false, error: 'code or giftcardId is required' });

  try {
    let giftcardRow: any = null;
    if (code) {
      const { rows: gRows } = await sql`SELECT * FROM giftcards WHERE code = ${code} LIMIT 1`;
      giftcardRow = gRows && gRows.length > 0 ? gRows[0] : null;
    } else {
      const { rows: gRows } = await sql`SELECT * FROM giftcards WHERE id = ${giftcardId} LIMIT 1`;
      giftcardRow = gRows && gRows.length > 0 ? gRows[0] : null;
    }

    if (!giftcardRow) return res.status(404).json({ success: false, error: 'giftcard_not_found' });

    const gid = String(giftcardRow.id);
    const balance = (typeof giftcardRow.balance === 'number') ? Number(giftcardRow.balance) : (giftcardRow.balance ? Number(giftcardRow.balance) : 0);

    // Eliminar bloqueo por holds: permitir uso inmediato del balance
    if (Number(balance) < Number(amount)) {
      return res.status(400).json({ success: false, error: 'insufficient_funds', available: balance, balance });
    }

    const { rows: [inserted] } = await sql`
      INSERT INTO giftcard_holds (id, giftcard_id, amount, booking_temp_ref, expires_at)
      VALUES (uuid_generate_v4(), ${gid}, ${amount}, ${bookingTempRef}, NOW() + (${ttlMinutes} * INTERVAL '1 minute'))
      RETURNING *
    `;

    return res.status(200).json({ success: true, hold: toCamelCase(inserted), available: Number(balance) - Number(amount), balance });
  } catch (err) {
    console.error('giftcards/create-hold error:', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}
