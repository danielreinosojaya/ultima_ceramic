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

  const action = req.query.action || req.body?.action;

  if (!action) {
    return res.status(400).json({ success: false, error: 'Action is required' });
  }

  try {
    switch (action) {
      case 'create-hold': {
        const body = req.body || {};
        const amount = body.amount !== undefined ? Number(body.amount) : null;
        const ttlMinutes = Number(body.ttlMinutes || 3);
        const bookingTempRef = body.bookingTempRef || null;
        const code = body.code || null;
        const giftcardId = body.giftcardId || null;

        if (!amount || amount <= 0) return res.status(400).json({ success: false, error: 'amount is required and must be > 0' });
        if (!code && !giftcardId) return res.status(400).json({ success: false, error: 'code or giftcardId is required' });

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

        await sql`BEGIN`;
        try {
          const { rows: [lockedGiftcard] } = await sql`SELECT * FROM giftcards WHERE id = ${gid} FOR UPDATE`;
          const balance = Number(lockedGiftcard.balance || 0);

          const { rows: [holdSumRow] } = await sql`
            SELECT COALESCE(SUM(amount), 0) AS total_holds FROM giftcard_holds WHERE giftcard_id = ${gid} AND (expires_at IS NULL OR expires_at > NOW())
          `;
          const totalHolds = Number(holdSumRow?.total_holds || 0);
          const available = balance - totalHolds;

          if (available < amount) {
            await sql`ROLLBACK`;
            return res.status(400).json({ success: false, error: 'insufficient_funds', available, balance });
          }

          const { rows: [inserted] } = await sql`
            INSERT INTO giftcard_holds (id, giftcard_id, amount, booking_temp_ref, expires_at)
            VALUES (uuid_generate_v4(), ${gid}, ${amount}, ${bookingTempRef}, NOW() + (${ttlMinutes} * INTERVAL '1 minute'))
            RETURNING *
          `;

          await sql`COMMIT`;
          return res.status(200).json({ success: true, hold: toCamelCase(inserted), available: available - amount, balance });
        } catch (e) {
          await sql`ROLLBACK`;
          throw e;
        }
      }
      case 'release-hold': {
        const body = req.body || {};
        const holdId = body.holdId || body.hold_id || null;
        if (!holdId) return res.status(400).json({ success: false, error: 'holdId is required' });

        await sql`BEGIN`;
        const { rows: [holdRow] } = await sql`SELECT * FROM giftcard_holds WHERE id = ${holdId} FOR UPDATE`;
        if (!holdRow) {
          await sql`ROLLBACK`;
          return res.status(404).json({ success: false, error: 'hold_not_found' });
        }

        await sql`DELETE FROM giftcard_holds WHERE id = ${holdId}`;
        await sql`COMMIT`;
        return res.status(200).json({ success: true });
      }
      case 'cleanup-expired': {
        const secret = process.env.CLEANUP_SECRET || null;
        if (secret) {
          const got = (req.headers['x-cleanup-secret'] as string) || null;
          if (!got || got !== secret) return res.status(403).json({ success: false, error: 'forbidden' });
        }

        const body = req.body || {};
        const limit = body.limit ? Number(body.limit) : null;

        try {
          await sql`BEGIN`;
          let deletedRes: any;
          if (limit && Number.isInteger(limit) && limit > 0) {
            const { rows } = await sql`
              WITH to_delete AS (
                SELECT id FROM giftcard_holds WHERE expires_at <= NOW() ORDER BY expires_at ASC LIMIT ${limit}
              )
              DELETE FROM giftcard_holds WHERE id IN (SELECT id FROM to_delete) RETURNING *
            `;
            deletedRes = rows;
          } else {
            const { rows } = await sql`DELETE FROM giftcard_holds WHERE expires_at <= NOW() RETURNING *`;
            deletedRes = rows;
          }

          for (const d of deletedRes) {
            try {
              await sql`
                INSERT INTO giftcard_audit (giftcard_id, action, status, error, amount, metadata)
                VALUES (${String(d.giftcard_id)}, 'expire', 'reverted', NULL, ${d.amount}, ${JSON.stringify({ holdId: d.id, reason: 'expired' })}::jsonb)
              `;
            } catch (auditErr) {
              console.warn('Failed to insert giftcard_audit for expired hold', d.id, auditErr);
            }
          }

          await sql`COMMIT`;
          return res.status(200).json({ success: true, deleted: deletedRes.length, holds: toCamelCase(deletedRes) });
        } catch (err) {
          try { await sql`ROLLBACK`; } catch (_) {}
          console.error('giftcards/cleanup-expired error:', err);
          return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
        }
      }
      case 'validate': {
        const code = (req.method === 'GET' ? req.query.code : req.body && req.body.code) || '';
        const codeStr = String(code || '').trim();
        if (!codeStr) return res.status(400).json({ success: false, error: 'code is required' });

        try {
          const { rows: giftcardRows } = await sql`SELECT * FROM giftcards WHERE code = ${codeStr} LIMIT 1`;
          if (giftcardRows && giftcardRows.length > 0) {
            const g = giftcardRows[0];
            const balance = (typeof g.balance === 'number') ? g.balance : (g.balance ? parseFloat(g.balance) : 0);
            const initialValue = (typeof g.initial_value === 'number') ? g.initial_value : (g.initial_value ? parseFloat(g.initial_value) : null);
            const expiresAt = g.expires_at ? new Date(g.expires_at).toISOString() : null;
            const isExpired = expiresAt ? (new Date() > new Date(expiresAt)) : false;
            return res.status(200).json({
              valid: !isExpired,
              code: g.code,
              giftcardId: g.id,
              balance: Number(balance),
              initialValue: initialValue !== null ? Number(initialValue) : null,
              expiresAt,
              status: isExpired ? 'expired' : 'active',
              metadata: g.metadata || {}
            });
          }

          return res.status(404).json({ valid: false, reason: 'not_found' });
        } catch (err) {
          console.error('giftcards/validate error:', err);
          return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
        }
      }
      default:
        return res.status(400).json({ success: false, error: 'Unknown action' });
    }
  } catch (err) {
    console.error('Error in giftcards handler:', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}