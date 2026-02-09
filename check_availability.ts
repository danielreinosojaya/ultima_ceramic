import { sql } from '@vercel/postgres';

async function check() {
    const result = await sql`SELECT key, value FROM settings WHERE key IN ('availability', 'scheduleOverrides', 'classCapacity')`;
    console.log('SETTINGS ROWS:', result.rows.length);
    result.rows.forEach((row: any) => {
      console.log('\nKey:', row.key);
      console.log('Value type:', typeof row.value);
      console.log('Value keys:', row.value ? Object.keys(row.value).slice(0, 5) : 'NULL');
      if (row.key === 'availability') {
        console.log('Availability structure sample:');
        const sample = JSON.stringify(row.value).substring(0, 800);
        console.log(sample);
      }
    });
}

check().catch(console.error);
