/**
 * Check database for technique inconsistencies
 * Run with: npx ts-node scripts/check-db-technique.ts
 */

import { sql } from '@vercel/postgres';

async function checkInconsistentBookings() {
  console.log('='.repeat(70));
  console.log('CHECKING DATABASE FOR TECHNIQUE INCONSISTENCIES');
  console.log('='.repeat(70));

  try {
    // Query 1: All GROUP_CLASS bookings
    console.log('\n📋 Query 1: All GROUP_CLASS bookings with details...\n');
    const { rows: allGroupClasses } = await sql`
      SELECT 
          id,
          booking_code,
          product->>'name' as product_name,
          technique,
          group_metadata,
          TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
      FROM bookings 
      WHERE product_type = 'GROUP_CLASS'
      AND group_metadata IS NOT NULL
      AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 30;
    `;

    if (allGroupClasses.length === 0) {
      console.log('   No GROUP_CLASS bookings found.');
    } else {
      console.log(`   Found ${allGroupClasses.length} GROUP_CLASS bookings:\n`);
      allGroupClasses.forEach((row: any, i: number) => {
        console.log(`   [${i + 1}] ID: ${row.id}`);
        console.log(`       Code: ${row.booking_code}`);
        console.log(`       Product: ${row.product_name}`);
        console.log(`       Technique: ${row.technique || 'NULL'}`);
        console.log(`       Created: ${row.created_at}`);
        
        // Parse group_metadata to check techniqueAssignments
        try {
          const metadata = typeof row.group_metadata === 'string' 
            ? JSON.parse(row.group_metadata) 
            : row.group_metadata;
          if (metadata?.techniqueAssignments) {
            console.log(`       Assignments: ${JSON.stringify(metadata.techniqueAssignments)}`);
          }
        } catch (e) {
          console.log(`       Metadata: ${row.group_metadata}`);
        }
        console.log('');
      });
    }

    // Query 2: Check for "Pintura" products with wrong technique
    console.log('-'.repeat(70));
    console.log('📋 Query 2: "Pintura de piezas" products with wrong technique...\n');
    
    const { rows: pinturaIssues } = await sql`
      SELECT 
          id,
          booking_code,
          product->>'name' as product_name,
          technique,
          group_metadata,
          slots,
          TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
      FROM bookings 
      WHERE product_type = 'GROUP_CLASS'
      AND group_metadata IS NOT NULL
      AND product->>'name' ILIKE '%pintura%'
      AND (
          group_metadata::text LIKE '%potters_wheel%'
          OR technique = 'potters_wheel'
      )
      ORDER BY created_at DESC;
    `;

    if (pinturaIssues.length === 0) {
      console.log('   ✅ No "Pintura de piezas" bookings with "potters_wheel" technique found.');
    } else {
      console.log(`   🚨 FOUND ${pinturaIssues.length} ISSUES:\n`);
      pinturaIssues.forEach((row: any, i: number) => {
        console.log(`   [${i + 1}] ID: ${row.id} - Code: ${row.booking_code}`);
        console.log(`       Product: ${row.product_name}`);
        console.log(`       Technique: ${row.technique}`);
        console.log(`       Created: ${row.created_at}`);
        try {
          const metadata = typeof row.group_metadata === 'string' 
            ? JSON.parse(row.group_metadata) 
            : row.group_metadata;
          console.log(`       Assignments: ${JSON.stringify(metadata.techniqueAssignments)}`);
        } catch (e) {}
        console.log('');
      });
    }

    // Query 3: Check for "Torno" products with wrong technique
    console.log('-'.repeat(70));
    console.log('📋 Query 3: "Torno Alfarero" products with wrong technique...\n');
    
    const { rows: tornoIssues } = await sql`
      SELECT 
          id,
          booking_code,
          product->>'name' as product_name,
          technique,
          group_metadata,
          slots,
          TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
      FROM bookings 
      WHERE product_type = 'GROUP_CLASS'
      AND group_metadata IS NOT NULL
      AND product->>'name' ILIKE '%torno%'
      AND (
          group_metadata::text LIKE '%painting%'
          OR technique = 'painting'
      )
      ORDER BY created_at DESC;
    `;

    if (tornoIssues.length === 0) {
      console.log('   ✅ No "Torno Alfarero" bookings with "painting" technique found.');
    } else {
      console.log(`   🚨 FOUND ${tornoIssues.length} ISSUES:\n`);
      tornoIssues.forEach((row: any, i: number) => {
        console.log(`   [${i + 1}] ID: ${row.id} - Code: ${row.booking_code}`);
        console.log(`       Product: ${row.product_name}`);
        console.log(`       Technique: ${row.technique}`);
        console.log(`       Created: ${row.created_at}`);
        try {
          const metadata = typeof row.group_metadata === 'string' 
            ? JSON.parse(row.group_metadata) 
            : row.group_metadata;
          console.log(`       Assignments: ${JSON.stringify(metadata.techniqueAssignments)}`);
        } catch (e) {}
        console.log('');
      });
    }

    // Summary
    console.log('='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n   Total GROUP_CLASS bookings: ${allGroupClasses.length}`);
    console.log(`   Issues with "Pintura" products: ${pinturaIssues.length}`);
    console.log(`   Issues with "Torno" products: ${tornoIssues.length}`);
    
    if (pinturaIssues.length > 0 || tornoIssues.length > 0) {
      console.log('\n   🚨 DATA INCONSISTENCIES FOUND IN DATABASE');
      console.log('   The bookings shown above have mismatched technique data.');
    } else {
      console.log('\n   ✅ NO DATA INCONSISTENCIES FOUND');
      console.log('   If the UI is still showing wrong technique, the issue is');
      console.log('   likely in the frontend logic (getBookingDisplayName).');
    }
    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkInconsistentBookings();
