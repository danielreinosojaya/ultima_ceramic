import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Load env
const envContent = readFileSync('.env.local', 'utf-8');
const dbUrl = envContent.match(/DATABASE_URL="([^"]+)"/)?.[1];
const sql = neon(dbUrl);

async function check() {
  // 1. Check availability settings for Thursday
  const settings = await sql`SELECT key, value FROM settings WHERE key = 'availability'`;
  const avail = settings[0]?.value;
  console.log('=== THURSDAY AVAILABILITY (fixed class times) ===');
  console.log(JSON.stringify(avail?.Thursday || 'NO THURSDAY DATA', null, 2));
  
  // 2. Check ALL bookings on Feb 12, 2026
  const bookings = await sql`SELECT id, product_type, status, slots, technique, product FROM bookings WHERE status != 'expired' ORDER BY created_at DESC`;
  console.log('\n=== BOOKINGS ON 2026-02-12 ===');
  let found = 0;
  for (const b of bookings) {
    try {
      const slots = typeof b.slots === 'string' ? JSON.parse(b.slots) : b.slots;
      if (Array.isArray(slots)) {
        const relevantSlots = slots.filter(s => s.date === '2026-02-12');
        if (relevantSlots.length > 0) {
          found++;
          const product = typeof b.product === 'string' ? JSON.parse(b.product) : b.product;
          console.log({
            id: b.id,
            productType: b.product_type,
            status: b.status,
            technique: b.technique,
            productName: product?.name,
            productDetails: product?.details,
            slots: relevantSlots
          });
        }
      }
    } catch (e) { /* skip */ }
  }
  if (found === 0) console.log('NO BOOKINGS FOUND FOR 2026-02-12');

  // 3. Check course sessions on Feb 12
  const courses = await sql`SELECT cs.scheduled_date, cs.start_time, cs.end_time, cs.status FROM course_sessions cs JOIN course_schedules sched ON sched.id = cs.course_schedule_id WHERE cs.status != 'cancelled' AND sched.is_active = true AND cs.scheduled_date = '2026-02-12'`;
  console.log('\n=== COURSE SESSIONS ON 2026-02-12 ===');
  console.log(courses.length > 0 ? JSON.stringify(courses, null, 2) : 'NO COURSE SESSIONS');

  // 4. Check schedule overrides for Feb 12
  const overrides = await sql`SELECT key, value FROM settings WHERE key = 'scheduleOverrides'`;
  const overrideData = overrides[0]?.value;
  console.log('\n=== SCHEDULE OVERRIDE FOR 2026-02-12 ===');
  console.log(JSON.stringify(overrideData?.['2026-02-12'] || 'NO OVERRIDE', null, 2));
}

check().catch(console.error);
