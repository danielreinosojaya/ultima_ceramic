-- Migration: Add geolocation columns to timecards and create geofences table
-- Date: 2025-11-12
-- Purpose: Support geofencing validation for check-in/out operations

-- Add location columns to timecards (if they don't exist)
-- Using generated migration approach
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='timecards' AND column_name='location_in_lat'
  ) THEN
    ALTER TABLE timecards ADD COLUMN location_in_lat DECIMAL(10,7);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='timecards' AND column_name='location_in_lng'
  ) THEN
    ALTER TABLE timecards ADD COLUMN location_in_lng DECIMAL(10,7);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='timecards' AND column_name='location_in_accuracy'
  ) THEN
    ALTER TABLE timecards ADD COLUMN location_in_accuracy DECIMAL(5,2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='timecards' AND column_name='location_out_lat'
  ) THEN
    ALTER TABLE timecards ADD COLUMN location_out_lat DECIMAL(10,7);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='timecards' AND column_name='location_out_lng'
  ) THEN
    ALTER TABLE timecards ADD COLUMN location_out_lng DECIMAL(10,7);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='timecards' AND column_name='location_out_accuracy'
  ) THEN
    ALTER TABLE timecards ADD COLUMN location_out_accuracy DECIMAL(5,2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='timecards' AND column_name='device_ip_in'
  ) THEN
    ALTER TABLE timecards ADD COLUMN device_ip_in VARCHAR(45);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='timecards' AND column_name='device_ip_out'
  ) THEN
    ALTER TABLE timecards ADD COLUMN device_ip_out VARCHAR(45);
  END IF;
END $$;

-- Create geofences table for location-based access control
CREATE TABLE IF NOT EXISTS geofences (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 300,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for geofences
CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(is_active);
CREATE INDEX IF NOT EXISTS idx_geofences_created ON geofences(created_at DESC);

-- Seed default geofence for Última Ceramic Bogotá
INSERT INTO geofences (name, latitude, longitude, radius_meters, is_active, created_at, updated_at)
VALUES ('Última Ceramic - Bogotá', 4.7169, -74.0842, 300, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Add role column to admin_codes if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='admin_codes' AND column_name='role'
  ) THEN
    ALTER TABLE admin_codes ADD COLUMN role VARCHAR(20) DEFAULT 'admin';
  END IF;
END $$;
