/**
 * Cleanup endpoint to remove duplicate geofences
 * POST /api/setup/cleanup-geofences?adminCode=ADMIN2025
 * 
 * This endpoint removes all existing geofences so users can recreate them
 * without duplicates appearing on every update.
 */

import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  const { adminCode } = req.query;

  // Only allow with correct admin code
  if (adminCode !== 'ADMIN2025') {
    return res.status(403).json({ 
      success: false, 
      error: 'Admin code required' 
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    console.log('🧹 Starting geofence cleanup...');

    // Get count before deletion
    const beforeResult = await sql`SELECT COUNT(*) as count FROM geofences`;
    const countBefore = parseInt(beforeResult.rows[0].count);
    console.log(`📊 Geofences before cleanup: ${countBefore}`);

    // Delete all geofences
    await sql`DELETE FROM geofences`;
    console.log('✅ Deleted all geofences');

    // Reset sequence
    try {
      await sql`ALTER SEQUENCE geofences_id_seq RESTART WITH 1`;
      console.log('✅ Reset geofences_id_seq');
    } catch (e) {
      console.log('ℹ️  Could not reset sequence (may not exist)');
    }

    // Verify deletion
    const afterResult = await sql`SELECT COUNT(*) as count FROM geofences`;
    const countAfter = parseInt(afterResult.rows[0].count);
    console.log(`📊 Geofences after cleanup: ${countAfter}`);

    console.log('\n✨ Geofence cleanup completed successfully!');
    
    return res.status(200).json({
      success: true,
      message: 'All geofences removed successfully',
      stats: {
        deletedCount: countBefore,
        remainingCount: countAfter
      }
    });

  } catch (error: any) {
    console.error('❌ Cleanup failed:', error.message);
    return res.status(500).json({
      success: false,
      error: `Cleanup failed: ${error.message}`
    });
  }
}
