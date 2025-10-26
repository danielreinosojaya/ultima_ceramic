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

    // Use a transaction and lock the giftcard row to avoid race conditions with simultaneous holds/consumes
    await sql`BEGIN`;
    try {
      // Re-fetch giftcard with lock
      const { rows: [lockedGiftcard] } = await sql`SELECT * FROM giftcards WHERE id = ${gid} FOR UPDATE`;
      const balance = (typeof lockedGiftcard.balance === 'number') ? Number(lockedGiftcard.balance) : (lockedGiftcard.balance ? Number(lockedGiftcard.balance) : 0);

      // Sum existing active holds for this giftcard (unexpired)
      const { rows: [holdSumRow] } = await sql`
        SELECT COALESCE(SUM(amount), 0) AS total_holds FROM giftcard_holds WHERE giftcard_id = ${gid} AND (expires_at IS NULL OR expires_at > NOW())
      `;
      const totalHolds = holdSumRow ? Number(holdSumRow.total_holds) : 0;
      const available = Number(balance) - Number(totalHolds);

      if (available < Number(amount)) {
        await sql`ROLLBACK`;
        return res.status(400).json({ success: false, error: 'insufficient_funds', available, balance });
      }

      const { rows: [inserted] } = await sql`
        INSERT INTO giftcard_holds (id, giftcard_id, amount, booking_temp_ref, expires_at)
        VALUES (uuid_generate_v4(), ${gid}, ${amount}, ${bookingTempRef}, NOW() + (${ttlMinutes} * INTERVAL '1 minute'))
        RETURNING *
      `;

      // Insert audit record for the created hold (part of same transaction)
      try {
        await sql`
          INSERT INTO giftcard_audit (giftcard_id, action, status, amount, metadata)
          VALUES (${String(gid)}, 'hold_created', 'success', ${amount}, ${JSON.stringify({ holdId: inserted.id, bookingTempRef })}::jsonb)
        `;
      } catch (auditErr) {
        // Non-fatal: log and continue. Audit failure shouldn't block the hold creation itself.
        console.warn('Failed to insert giftcard_audit for created hold', auditErr);
      }

      await sql`COMMIT`;
      return res.status(200).json({ success: true, hold: toCamelCase(inserted), available: Number(available) - Number(amount), balance });
    } catch (e) {
      try { await sql`ROLLBACK`; } catch(_){}
      console.error('giftcards/create-hold transaction error:', e);
      return res.status(500).json({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  } catch (err) {
    console.error('giftcards/create-hold error:', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}
