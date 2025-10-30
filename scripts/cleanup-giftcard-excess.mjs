#!/usr/bin/env node
/*
Safe cleanup script for giftcard holds that exceed the giftcard balance.

Usage examples:

# dry-run preview by giftcard id
DATABASE_URL="postgres://..." node scripts/cleanup-giftcard-excess.mjs --giftcard-id 180

# dry-run preview by code
DATABASE_URL="postgres://..." node scripts/cleanup-giftcard-excess.mjs --code GC-TEST-8CCE26

# perform deletion (non-interactive)
DATABASE_URL="postgres://..." node scripts/cleanup-giftcard-excess.mjs --code GC-TEST-8CCE26 --yes

Notes:
- This script requires the `pg` package. Install with `npm install pg` in the project root.
- The script will show which hold rows would be deleted in dry-run mode. Only when you pass --yes will it delete inside a transaction.
- Always ensure you have a DB backup or are running against a development/staging DB before deleting rows.
*/

import { Client } from 'pg';
import readline from 'readline';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--giftcard-id') out.giftcardId = args[++i];
    else if (a === '--code') out.code = args[++i];
    else if (a === '--yes') out.yes = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  const { giftcardId, code, yes } = parseArgs();
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is required.');
    process.exit(1);
  }
  if (!giftcardId && !code) {
    console.error('ERROR: pass --giftcard-id <id> or --code <CODE>');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    let gid = giftcardId;
    if (!gid) {
      const qr = await client.query('SELECT id FROM giftcards WHERE code = $1 LIMIT 1', [code]);
      if (!qr.rows || qr.rows.length === 0) {
        console.error('No giftcard found with code', code);
        process.exit(1);
      }
      gid = String(qr.rows[0].id);
    }

    console.log('Target giftcard id:', gid);

    // Preview: count + total
    const totalQr = await client.query(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total_holds
       FROM giftcard_holds
       WHERE giftcard_id = $1 AND expires_at > NOW()`
    , [gid]);

    console.log('Active holds for giftcard:', totalQr.rows[0]);

    // Show candidate rows that, if deleted (the ones that push running sum > balance), would be removed
    const previewQuery = `WITH ordered AS (
      SELECT id, amount, booking_temp_ref, created_at,
             SUM(amount) OVER (ORDER BY created_at ASC) AS running
      FROM giftcard_holds
      WHERE giftcard_id = $1 AND expires_at > NOW()
    )
    SELECT o.id, o.amount, o.booking_temp_ref, o.created_at, o.running
    FROM ordered o
    WHERE o.running > (SELECT COALESCE(balance,0) FROM giftcards WHERE id = $1)
    ORDER BY o.running ASC`;

    const preview = await client.query(previewQuery, [gid]);
    if (!preview.rows || preview.rows.length === 0) {
      console.log('\nNo candidate holds to delete (running sum does not exceed balance).');
    } else {
      console.log('\nHolds that WOULD be removed (preview):');
      for (const r of preview.rows) {
        console.log(`- id=${r.id} amount=${r.amount} running=${r.running} created_at=${r.created_at} booking_temp_ref=${r.booking_temp_ref}`);
      }
    }

    // If nothing to delete, finish
    if (!preview.rows || preview.rows.length === 0) {
      const after = await client.query(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total_holds FROM giftcard_holds WHERE giftcard_id = $1 AND expires_at > NOW()`, [gid]
      );
      console.log('\nCurrent after-check:', after.rows[0]);
      await client.end();
      return;
    }

    // Ask confirmation unless --yes
    if (!yes) {
      const ans = (await ask('\nProceed to DELETE the previewed holds? Type YES to confirm: ')).trim();
      if (ans !== 'YES') {
        console.log('Aborting. No changes made.');
        await client.end();
        return;
      }
    } else {
      console.log('\n--yes provided, proceeding without interactive confirmation');
    }

    // Perform deletion in a transaction and return deleted rows
    try {
      await client.query('BEGIN');
      const deleteQuery = `WITH ordered AS (
        SELECT id, amount,
               SUM(amount) OVER (ORDER BY created_at ASC) AS running
        FROM giftcard_holds
        WHERE giftcard_id = $1 AND expires_at > NOW()
      )
      DELETE FROM giftcard_holds h
      USING ordered o
      WHERE h.id = o.id
        AND o.running > (SELECT COALESCE(balance,0) FROM giftcards WHERE id = $1)
      RETURNING h.id, h.amount, h.booking_temp_ref, h.created_at`;

      const delRes = await client.query(deleteQuery, [gid]);
      console.log('\nDeleted rows count:', delRes.rowCount);
      if (delRes.rowCount > 0) {
        for (const r of delRes.rows) {
          console.log(`- deleted id=${r.id} amount=${r.amount} created_at=${r.created_at} booking_temp_ref=${r.booking_temp_ref}`);
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      console.error('Error deleting rows, rolling back:', e);
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    }

    // Final verification
    const final = await client.query(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total_holds FROM giftcard_holds WHERE giftcard_id = $1 AND expires_at > NOW()`, [gid]
    );
    const gift = await client.query(`SELECT id, code, balance FROM giftcards WHERE id = $1`, [gid]);
    console.log('\nFinal holds summary:', final.rows[0]);
    console.log('Giftcard row:', gift.rows[0]);

    await client.end();
  } catch (err) {
    console.error('Unhandled error:', err);
    try { await client.end(); } catch (_) {}
    process.exit(1);
  }
}

main();
