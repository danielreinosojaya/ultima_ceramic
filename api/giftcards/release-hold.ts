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
    const { rows: [holdRow] } = await sql`SELECT id FROM giftcard_holds WHERE id = ${holdId}`;
    if (!holdRow) return res.status(404).json({ success: false, error: 'hold_not_found' });

    await sql`DELETE FROM giftcard_holds WHERE id = ${holdId}`;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('giftcards/release-hold error:', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}
