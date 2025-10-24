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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const code = (req.method === 'GET' ? req.query.code : req.body && req.body.code) || '';
  const codeStr = String(code || '').trim();
  if (!codeStr) return res.status(400).json({ success: false, error: 'code is required' });

  try {
    // Try issued giftcard first
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

    // Check requests
    const { rows: reqRows } = await sql`SELECT * FROM giftcard_requests WHERE code = ${codeStr} LIMIT 1`;
    if (reqRows && reqRows.length > 0) {
      const r = reqRows[0];
      const reqCamel = toCamelCase(r);
      const status = (r.status || '').toString();
      let issuedCode: string | null = null;
      try {
        if (r.metadata && typeof r.metadata === 'object' && r.metadata.issuedCode) issuedCode = String(r.metadata.issuedCode);
        else if (r.metadata && typeof r.metadata === 'string') {
          try { const parsed = JSON.parse(r.metadata); if (parsed && parsed.issuedCode) issuedCode = String(parsed.issuedCode); } catch(e){}
        }
      } catch (e) { issuedCode = null; }

      if (status === 'approved' && issuedCode) {
        try {
          const { rows: issuedRows } = await sql`SELECT * FROM giftcards WHERE code = ${issuedCode} LIMIT 1`;
          if (issuedRows && issuedRows.length > 0) {
            const g = issuedRows[0];
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
              metadata: g.metadata || {},
              request: reqCamel
            });
          }
        } catch (e) {
          console.warn('Error resolving issuedCode for approved request:', e);
        }
        return res.status(200).json({ valid: false, reason: 'approved_request_has_issued_code', issuedCode, request: reqCamel });
      }

      return res.status(200).json({ valid: false, reason: 'request_found', request: reqCamel });
    }

    return res.status(404).json({ valid: false, reason: 'not_found' });
  } catch (err) {
    console.error('giftcards/validate error:', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}
