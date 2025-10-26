import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const body = req.body || {};
  const holdId = body.holdId || body.hold_id || null;
  if (!holdId) return res.status(400).json({ success: false, error: 'holdId is required' });

  try {
    // Use a transaction so we can record an audit row atomically with the delete
    await sql`BEGIN`;
    const { rows: [holdRow] } = await sql`SELECT * FROM giftcard_holds WHERE id = ${holdId} FOR UPDATE`;
    if (!holdRow) {
      await sql`ROLLBACK`;
      return res.status(404).json({ success: false, error: 'hold_not_found' });
    }

    await sql`DELETE FROM giftcard_holds WHERE id = ${holdId}`;

    // Insert audit entry for release (best-effort). Try preferred schema first,
    // fall back to older schema shape if needed. Audit failures should not
    // prevent the release from succeeding.
    try {
      // Preferred schema: id, giftcard_id, event_type, amount, booking_temp_ref, metadata, created_at
      await sql`
        INSERT INTO giftcard_audit (id, giftcard_id, event_type, amount, booking_temp_ref, metadata, created_at)
        VALUES (uuid_generate_v4(), ${String(holdRow.giftcard_id)}, 'hold_released', ${holdRow.amount}, ${holdRow.booking_temp_ref || null}, ${JSON.stringify({ holdId: holdRow.id })}::jsonb, NOW())
      `;
    } catch (firstAuditErr) {
      try {
        // Fallback to legacy schema: giftcard_id, action, status, amount, metadata
        await sql`
          INSERT INTO giftcard_audit (giftcard_id, action, status, amount, metadata)
          VALUES (${String(holdRow.giftcard_id)}, 'hold_released', 'success', ${holdRow.amount}, ${JSON.stringify({ holdId: holdRow.id })}::jsonb)
        `;
      } catch (auditErr) {
        console.warn('Failed to insert giftcard_audit for released hold (both attempts):', auditErr, firstAuditErr);
        // continue - audit failure should not hide successful release
      }
    }

    await sql`COMMIT`;
    return res.status(200).json({ success: true });
  } catch (err) {
    try { await sql`ROLLBACK`; } catch (_) {}
    console.error('giftcards/release-hold error:', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}
