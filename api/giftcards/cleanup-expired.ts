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

  // Optional secret to protect the endpoint in production. If CLEANUP_SECRET is set,
  // requests must include header 'x-cleanup-secret' with the same value.
  const secret = process.env.CLEANUP_SECRET || null;
  if (secret) {
    const got = (req.headers['x-cleanup-secret'] as string) || null;
    if (!got || got !== secret) return res.status(403).json({ success: false, error: 'forbidden' });
  }

  const body = req.body || {};
  const limit = body.limit ? Number(body.limit) : null; // optional limit to avoid huge batches

  try {
    await sql`BEGIN`;

    // Delete expired holds and return rows so we can audit them
    let deletedRes: any;
    if (limit && Number.isInteger(limit) && limit > 0) {
      // Use a CTE to delete only a limited set
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

    // Insert audit rows for each deleted hold (best-effort)
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
