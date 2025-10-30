#!/usr/bin/env node
/*
  repair-missing-giftcards.js

  Usage:
    REPAIR_API_URL=https://mi-app.vercel.app node scripts/repair-missing-giftcards.js
    REPAIR_API_URL=https://mi-app.vercel.app AUTH_TOKEN=xxx node scripts/repair-missing-giftcards.js --auto

  - If --auto is provided the script will run dryRun then apply the repair automatically.
  - If no REPAIR_API_URL is provided the script exits with instructions.

  Notes:
  - This script calls the API endpoint defined in the repo: action = repairMissingGiftcards.
  - It does NOT modify the DB unless you pass --auto (or edit the script).
  - Always take a DB snapshot before running the non-dry repair.
*/

const https = require('https');
const http = require('http');

async function postJson(url, body, token) {
  const parsed = new URL(url);
  const data = JSON.stringify(body);
  const isHttps = parsed.protocol === 'https:';
  const options = {
    hostname: parsed.hostname,
    port: parsed.port || (isHttps ? 443 : 80),
    path: parsed.pathname + (parsed.search || ''),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };
  if (token) options.headers['Authorization'] = `Bearer ${token}`;

  const lib = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(options, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        const ct = res.headers['content-type'] || '';
        try {
          if (ct.includes('application/json')) {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } else {
            resolve({ status: res.statusCode, body: raw });
          }
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function usageExit() {
  console.error('\nUsage: REPAIR_API_URL=https://mi-app.vercel.app [AUTH_TOKEN=xxx] node scripts/repair-missing-giftcards.js [--auto] [--limit N]');
  console.error('\nExamples:');
  console.error("  REPAIR_API_URL=https://mi-app.vercel.app node scripts/repair-missing-giftcards.js");
  console.error("  REPAIR_API_URL=https://mi-app.vercel.app AUTH_TOKEN=abc123 node scripts/repair-missing-giftcards.js --auto --limit 100");
  process.exit(2);
}

(async function main() {
  const apiUrl = process.env.REPAIR_API_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  const token = process.env.AUTH_TOKEN || process.env.API_TOKEN || process.env.BEARER_TOKEN;
  const args = process.argv.slice(2);
  const auto = args.includes('--auto');
  const limitIdx = args.indexOf('--limit');
  let limit = 100;
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    const n = parseInt(args[limitIdx + 1], 10);
    if (!isNaN(n)) limit = n;
  }

  if (!apiUrl) {
    console.error('ERROR: REPAIR_API_URL is required.');
    usageExit();
  }

  console.log('Running dryRun against:', apiUrl);
  try {
    const res = await postJson(apiUrl, { action: 'repairMissingGiftcards', dryRun: true, limit }, token);
    console.log('\nDryRun response status:', res.status);
    console.log('DryRun body:\n');
    console.log(JSON.stringify(res.body, null, 2));

    if (!auto) {
      console.log('\nDry-run complete. To apply the repair automatically re-run with --auto.');
      console.log('Example: REPAIR_API_URL=' + apiUrl + (token ? ' AUTH_TOKEN=***' : '') + ' node scripts/repair-missing-giftcards.js --auto --limit ' + limit);
      process.exit(0);
    }

    // auto == true -> apply repair
    console.log('\n--auto provided: applying repair now (dryRun=false)...');
    const res2 = await postJson(apiUrl, { action: 'repairMissingGiftcards', dryRun: false, limit }, token);
    console.log('\nRepair response status:', res2.status);
    console.log('Repair body:\n');
    console.log(JSON.stringify(res2.body, null, 2));

    if (res2.status >= 200 && res2.status < 300) {
      console.log('\nRepair finished. Review `repaired` and `failed` in the response.');
    } else {
      console.error('\nRepair failed. See output above.');
      process.exit(3);
    }
  } catch (err) {
    console.error('Request error:', err && (err.stack || err.message || err));
    process.exit(4);
  }
})();
