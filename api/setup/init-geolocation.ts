/**
 * One-time setup endpoint to initialize geolocation schema
 * POST /api/setup/init-geolocation?adminCode=ADMIN2025
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
    console.log('🔄 Starting geolocation schema initialization...');

    // Add location_in_lat column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN location_in_lat DECIMAL(10,7)
      `;
      console.log('✅ Added location_in_lat column');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('ℹ️  location_in_lat column already exists');
      } else {
        throw e;
      }
    }

    // Add location_in_lng column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN location_in_lng DECIMAL(10,7)
      `;
      console.log('✅ Added location_in_lng column');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('ℹ️  location_in_lng column already exists');
      } else {
        throw e;
      }
    }

    // Add location_in_accuracy column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN location_in_accuracy DECIMAL(5,2)
      `;
      console.log('✅ Added location_in_accuracy column');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('ℹ️  location_in_accuracy column already exists');
      } else {
        throw e;
      }
    }

    // Add location_out_lat column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN location_out_lat DECIMAL(10,7)
      `;
      console.log('✅ Added location_out_lat column');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('ℹ️  location_out_lat column already exists');
      } else {
        throw e;
      }
    }

    // Add location_out_lng column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN location_out_lng DECIMAL(10,7)
      `;
      console.log('✅ Added location_out_lng column');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('ℹ️  location_out_lng column already exists');
      } else {
        throw e;
      }
    }

    // Add location_out_accuracy column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN location_out_accuracy DECIMAL(5,2)
      `;
      console.log('✅ Added location_out_accuracy column');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('ℹ️  location_out_accuracy column already exists');
      } else {
        throw e;
      }
    }

    // Add device_ip_in column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN device_ip_in VARCHAR(45)
      `;
      console.log('✅ Added device_ip_in column');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('ℹ️  device_ip_in column already exists');
      } else {
        throw e;
      }
    }

    // Add device_ip_out column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN device_ip_out VARCHAR(45)
      `;
      console.log('✅ Added device_ip_out column');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('ℹ️  device_ip_out column already exists');
      } else {
        throw e;
      }
    }

    // Create geofences table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS geofences (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          latitude DECIMAL(10,7) NOT NULL,
          longitude DECIMAL(10,7) NOT NULL,
          radius_meters INTEGER NOT NULL DEFAULT 300,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('✅ Created/Verified geofences table');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('ℹ️  geofences table already exists');
      } else {
        throw e;
      }
    }

    // Create indexes
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(is_active)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_geofences_created ON geofences(created_at DESC)`;
      console.log('✅ Created geofence indexes');
    } catch (e) {
      console.log('ℹ️  Geofence indexes already exist');
    }

    // ✅ DO NOT seed default geofence - let users create geofences via Admin Panel
    // This prevents duplicate geofences being created every time the endpoint is called

    console.log('\n✨ Geolocation schema initialization completed successfully!');
    
    return res.status(200).json({
      success: true,
      message: 'Geolocation schema initialized successfully'
    });

  } catch (error: any) {
    console.error('❌ Initialization failed:', error.message);
    return res.status(500).json({
      success: false,
      error: `Initialization failed: ${error.message}`
    });
  }
}
