-- Cleanup: Remove duplicate geofences
-- This script removes all geofences and allows users to create fresh ones via Admin Panel

-- Delete all geofences (they can be recreated via UI)
DELETE FROM geofences;

-- Reset sequence if needed (optional)
ALTER SEQUENCE geofences_id_seq RESTART WITH 1;

-- Done!
-- Users can now create geofences via Admin Panel without duplicates
