#!/usr/bin/env node
/*
  Simple concurrency test script for `/api/giftcards/create-hold`.
  Usage (example):
    CLEANUP_SECRET=yoursecret BASE_URL=https://staging.example.com CODE=GC-ABC123 CONCURRENCY=10 node scripts/test-giftcard-concurrency.cjs

  The script performs CONCURRENCY parallel POSTs attempting to create a hold of `AMOUNT` (default 10).
  It prints responses and a summary of successes/failures.
  NOTE: Run this against a staging environment with a real DB. Do not run against production unless you know what you're doing.
*/

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CODE = process.env.CODE || null; // giftcard code
const GIFT_CARD_ID = process.env.GIFT_CARD_ID || null; // optional alternative
const CONCURRENCY = Number(process.env.CONCURRENCY || 10);
const AMOUNT = Number(process.env.AMOUNT || 10);
const TTL_MINUTES = Number(process.env.TTL_MINUTES || 15);
const CLEANUP_SECRET = process.env.CLEANUP_SECRET || null; // not required for create-hold

if (!CODE && !GIFT_CARD_ID) {
  console.error('ERROR: set CODE or GIFT_CARD_ID env var to target a giftcard.');
  process.exit(1);
}

const target = `${BASE_URL.replace(/\/$/, '')}/api/giftcards/create-hold`;

async function doRequest(i) {
  const body = {
    amount: AMOUNT,
    ttlMinutes: TTL_MINUTES
  };
  if (CODE) body.code = CODE;
  if (GIFT_CARD_ID) body.giftcardId = GIFT_CARD_ID;

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({ status: res.status }));
    return { idx: i, ok: res.ok, status: res.status, body: json };
  } catch (err) {
    return { idx: i, ok: false, error: String(err) };
  }
}

async function main() {
  console.log('Concurrency test', { target, concurrency: CONCURRENCY, amount: AMOUNT, ttlMinutes: TTL_MINUTES, code: CODE, giftcardId: GIFT_CARD_ID });
  const promises = [];
  for (let i = 0; i < CONCURRENCY; i++) promises.push(doRequest(i));

  const results = await Promise.all(promises);
  let success = 0, insufficient = 0, errors = 0;
  for (const r of results) {
    if (r.ok) {
      success++;
      console.log('[OK]', r.idx, JSON.stringify(r.body));
    } else if (r.body && r.body.error === 'insufficient_funds') {
      insufficient++;
      console.log('[INSUFFICIENT]', r.idx, JSON.stringify(r.body));
    } else {
      errors++;
      console.log('[ERR]', r.idx, r.status || '', r.error || JSON.stringify(r.body));
    }
  }
  console.log('SUMMARY:', { total: results.length, success, insufficient, errors });
}

main().catch(e => { console.error('Fatal error:', e); process.exit(2); });
