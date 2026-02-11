import { sql } from '@vercel/postgres';

console.log('Checking bookings table structure...\n');

const { rows } = await sql`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'bookings' 
  ORDER BY ordinal_position
`;

console.log('Bookings columns:');
rows.forEach((r: any) => console.log(`  - ${r.column_name} (${r.data_type})`));

process.exit(0);
