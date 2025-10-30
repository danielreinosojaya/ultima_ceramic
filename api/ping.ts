import { VercelRequest, VercelResponse } from '@vercel/node';

// Simple health endpoint to debug that serverless functions are reachable and accept POST
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const info = {
    ok: true,
    method: req.method,
    query: req.query || null,
    bodyPresent: !!req.body,
    // Echo small body if JSON
    body: typeof req.body === 'object' ? req.body : String(req.body || null),
    ts: new Date().toISOString()
  };

  console.log('[ping] received', info.method, info.query);
  return res.status(200).json(info);
}
