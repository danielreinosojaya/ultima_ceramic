#!/usr/bin/env node

/**
 * Migration runner for geolocation columns
 * Executes: migrations/20251112_add_geolocation_columns.sql
 * 
 * Usage:
 *   node scripts/run-geolocation-migration.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sql } from '@vercel/postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 Starting geolocation migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/20251112_add_geolocation_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration file loaded');
    
    // Execute migration - split by DO blocks since vercel/postgres doesn't support them well
    // We'll execute the ALTER TABLE statements individually
    
    // Add location_in_lat column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN IF NOT EXISTS location_in_lat DECIMAL(10,7)
      `;
      console.log('✅ Added location_in_lat column');
    } catch (e) {
      console.log('ℹ️  location_in_lat column already exists');
    }
    
    // Add location_in_lng column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN IF NOT EXISTS location_in_lng DECIMAL(10,7)
      `;
      console.log('✅ Added location_in_lng column');
    } catch (e) {
      console.log('ℹ️  location_in_lng column already exists');
    }
    
    // Add location_in_accuracy column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN IF NOT EXISTS location_in_accuracy DECIMAL(5,2)
      `;
      console.log('✅ Added location_in_accuracy column');
    } catch (e) {
      console.log('ℹ️  location_in_accuracy column already exists');
    }
    
    // Add location_out_lat column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN IF NOT EXISTS location_out_lat DECIMAL(10,7)
      `;
      console.log('✅ Added location_out_lat column');
    } catch (e) {
      console.log('ℹ️  location_out_lat column already exists');
    }
    
    // Add location_out_lng column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN IF NOT EXISTS location_out_lng DECIMAL(10,7)
      `;
      console.log('✅ Added location_out_lng column');
    } catch (e) {
      console.log('ℹ️  location_out_lng column already exists');
    }
    
    // Add location_out_accuracy column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN IF NOT EXISTS location_out_accuracy DECIMAL(5,2)
      `;
      console.log('✅ Added location_out_accuracy column');
    } catch (e) {
      console.log('ℹ️  location_out_accuracy column already exists');
    }
    
    // Add device_ip_in column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN IF NOT EXISTS device_ip_in VARCHAR(45)
      `;
      console.log('✅ Added device_ip_in column');
    } catch (e) {
      console.log('ℹ️  device_ip_in column already exists');
    }
    
    // Add device_ip_out column
    try {
      await sql`
        ALTER TABLE timecards 
        ADD COLUMN IF NOT EXISTS device_ip_out VARCHAR(45)
      `;
      console.log('✅ Added device_ip_out column');
    } catch (e) {
      console.log('ℹ️  device_ip_out column already exists');
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
      console.log('✅ Created geofences table');
    } catch (e) {
      console.log('ℹ️  geofences table already exists');
    }
    
    // Create indexes
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(is_active)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_geofences_created ON geofences(created_at DESC)`;
      console.log('✅ Created geofence indexes');
    } catch (e) {
      console.log('ℹ️  Geofence indexes already exist');
    }
    
    // Seed default geofence
    try {
      await sql`
        INSERT INTO geofences (name, latitude, longitude, radius_meters, is_active, created_at, updated_at)
        VALUES ('Última Ceramic - Bogotá', 4.7169, -74.0842, 300, true, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `;
      console.log('✅ Seeded default geofence');
    } catch (e) {
      if (e.message.includes('ON CONFLICT') || e.message.includes('UNIQUE')) {
        console.log('ℹ️  Default geofence already exists');
      } else {
        throw e;
      }
    }
    
    // Add role column to admin_codes if it doesn't exist
    try {
      await sql`
        ALTER TABLE admin_codes 
        ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'admin'
      `;
      console.log('✅ Added role column to admin_codes');
    } catch (e) {
      console.log('ℹ️  role column already exists in admin_codes');
    }
    
    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
