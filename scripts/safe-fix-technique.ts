/**
 * Safe Technique Fix Script
 * 
 * IMPORTANT: This script creates a backup BEFORE making any changes
 * Run with: npx ts-node scripts/safe-fix-technique.ts
 * 
 * This script will:
 * 1. Create a backup of all GROUP_CLASS bookings
 * 2. Identify inconsistent bookings
 * 3. Apply fixes with verification
 * 4. Log all changes for audit
 */

import { sql } from '@vercel/postgres';
import fs from 'fs';

interface BookingBackup {
  id: string;
  booking_code: string;
  product_name: string;
  technique: string | null;
  group_metadata: any;
  backed_up_at: string;
}

async function safeFixTechnique() {
  console.log('='.repeat(70));
  console.log('🔒 SAFE TECHNIQUE FIX - WITH BACKUP');
  console.log('='.repeat(70));
  
  const backupFile = `backup_technique_${new Date().toISOString().slice(0, 10)}.json`;
  const changesLog: any[] = [];
  
  try {
    // STEP 1: Create backup of all GROUP_CLASS bookings
    console.log('\n📦 STEP 1: Creating backup of all GROUP_CLASS bookings...');
    
    const { rows: allGroupBookings } = await sql`
      SELECT 
        id,
        booking_code,
        product->>'name' as product_name,
        technique,
        group_metadata,
        slots,
        created_at
      FROM bookings 
      WHERE product_type = 'GROUP_CLASS'
      AND status = 'active'
      ORDER BY created_at DESC;
    `;

    const backupData: BookingBackup[] = allGroupBookings.map((row: any) => ({
      id: row.id,
      booking_code: row.booking_code,
      product_name: row.product_name,
      technique: row.technique,
      group_metadata: row.group_metadata,
      backed_up_at: new Date().toISOString()
    }));

    // Save backup to file
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`   ✅ Backup saved to: ${backupFile}`);
    console.log(`   📊 Total GROUP_CLASS bookings backed up: ${backupData.length}`);

    // STEP 2: Identify inconsistent bookings
    console.log('\n🔍 STEP 2: Identifying inconsistent bookings...');
    
    const { rows: pinturaIssues } = await sql`
      SELECT id, booking_code, product->>'name' as product_name, technique, group_metadata
      FROM bookings 
      WHERE product_type = 'GROUP_CLASS'
      AND group_metadata IS NOT NULL
      AND product->>'name' ILIKE '%pintura%'
      AND (group_metadata::text LIKE '%potters_wheel%' OR technique = 'potters_wheel');
    `;

    const { rows: tornoIssues } = await sql`
      SELECT id, booking_code, product->>'name' as product_name, technique, group_metadata
      FROM bookings 
      WHERE product_type = 'GROUP_CLASS'
      AND group_metadata IS NOT NULL
      AND product->>'name' ILIKE '%torno%'
      AND (group_metadata::text LIKE '%painting%' OR technique = 'painting');
    `;

    const { rows: modeladoIssues } = await sql`
      SELECT id, booking_code, product->>'name' as product_name, technique, group_metadata
      FROM bookings 
      WHERE product_type = 'GROUP_CLASS'
      AND group_metadata IS NOT NULL
      AND product->>'name' ILIKE '%modelado%'
      AND (group_metadata::text LIKE '%potters_wheel%' OR technique = 'potters_wheel');
    `;

    console.log(`   📋 Found issues:`);
    console.log(`      - Pintura de piezas with wrong technique: ${pinturaIssues.length}`);
    console.log(`      - Torno Alfarero with wrong technique: ${tornoIssues.length}`);
    console.log(`      - Modelado a Mano with wrong technique: ${modeladoIssues.length}`);

    if (pinturaIssues.length === 0 && tornoIssues.length === 0 && modeladoIssues.length === 0) {
      console.log('\n   ✅ NO INCONSISTENCIES FOUND - Nothing to fix!');
      console.log('='.repeat(70));
      return;
    }

    // STEP 3: Apply fixes with individual verification
    console.log('\n🔧 STEP 3: Applying fixes...');
    
    let totalFixed = 0;

    // Fix Pintura bookings
    for (const booking of pinturaIssues) {
      console.log(`   🔄 Fixing: ${booking.booking_code} (${booking.product_name})`);
      try {
        await sql`
          UPDATE bookings
          SET 
            group_metadata = (
              SELECT jsonb_set(
                group_metadata::jsonb,
                '{techniqueAssignments}',
                (SELECT jsonb_agg(jsonb_set(ta, '{technique}', '"painting"'))
                 FROM jsonb_array_elements(group_metadata::jsonb->'techniqueAssignments') AS ta)
              )::text
            ),
            technique = 'painting',
            updated_at = NOW()
          WHERE id = ${booking.id};
        `;
        changesLog.push({
          id: booking.id,
          code: booking.booking_code,
          action: 'fixed_pintura',
          timestamp: new Date().toISOString()
        });
        totalFixed++;
        console.log(`      ✅ Fixed: ${booking.booking_code}`);
      } catch (err) {
        console.log(`      ❌ Error fixing ${booking.booking_code}:`, err);
      }
    }

    // Fix Torno bookings
    for (const booking of tornoIssues) {
      console.log(`   🔄 Fixing: ${booking.booking_code} (${booking.product_name})`);
      try {
        await sql`
          UPDATE bookings
          SET 
            group_metadata = (
              SELECT jsonb_set(
                group_metadata::jsonb,
                '{techniqueAssignments}',
                (SELECT jsonb_agg(jsonb_set(ta, '{technique}', '"potters_wheel"'))
                 FROM jsonb_array_elements(group_metadata::jsonb->'techniqueAssignments') AS ta)
              )::text
            ),
            technique = 'potters_wheel',
            updated_at = NOW()
          WHERE id = ${booking.id};
        `;
        changesLog.push({
          id: booking.id,
          code: booking.booking_code,
          action: 'fixed_torno',
          timestamp: new Date().toISOString()
        });
        totalFixed++;
        console.log(`      ✅ Fixed: ${booking.booking_code}`);
      } catch (err) {
        console.log(`      ❌ Error fixing ${booking.booking_code}:`, err);
      }
    }

    // Fix Modelado bookings
    for (const booking of modeladoIssues) {
      console.log(`   🔄 Fixing: ${booking.booking_code} (${booking.product_name})`);
      try {
        await sql`
          UPDATE bookings
          SET 
            group_metadata = (
              SELECT jsonb_set(
                group_metadata::jsonb,
                '{techniqueAssignments}',
                (SELECT jsonb_agg(jsonb_set(ta, '{technique}', '"hand_modeling"'))
                 FROM jsonb_array_elements(group_metadata::jsonb->'techniqueAssignments') AS ta)
              )::text
            ),
            technique = 'hand_modeling',
            updated_at = NOW()
          WHERE id = ${booking.id};
        `;
        changesLog.push({
          id: booking.id,
          code: booking.booking_code,
          action: 'fixed_modelado',
          timestamp: new Date().toISOString()
        });
        totalFixed++;
        console.log(`      ✅ Fixed: ${booking.booking_code}`);
      } catch (err) {
        console.log(`      ❌ Error fixing ${booking.booking_code}:`, err);
      }
    }

    // STEP 4: Verify fixes
    console.log('\n✅ STEP 4: Verifying fixes...');
    
    const { rows: remainingIssues } = await sql`
      SELECT id, booking_code, product->>'name' as product_name, technique
      FROM bookings 
      WHERE product_type = 'GROUP_CLASS'
      AND group_metadata IS NOT NULL
      AND (
        (product->>'name' ILIKE '%pintura%' AND technique = 'potters_wheel')
        OR (product->>'name' ILIKE '%torno%' AND technique = 'painting')
        OR (product->>'name' ILIKE '%modelado%' AND technique = 'potters_wheel')
      );
    `;

    // Save changes log
    fs.writeFileSync('fix_changes_log.json', JSON.stringify(changesLog, null, 2));
    console.log(`   📝 Changes logged to: fix_changes_log.json`);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`   🔒 Backup file: ${backupFile}`);
    console.log(`   🔧 Total bookings fixed: ${totalFixed}`);
    console.log(`   ❌ Remaining inconsistencies: ${remainingIssues.length}`);
    
    if (remainingIssues.length > 0) {
      console.log('\n   ⚠️  WARNING: Some issues could not be fixed:');
      remainingIssues.forEach((b: any) => {
        console.log(`      - ${b.booking_code}: ${b.product_name} (${b.technique})`);
      });
    } else {
      console.log('\n   🎉 All inconsistencies have been fixed!');
    }
    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.log('\n📁 Backup file has been created for recovery if needed.');
  }
}

safeFixTechnique();
