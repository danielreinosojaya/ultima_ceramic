# Geolocation System - Setup & Troubleshooting Guide

## 🔍 Issue Summary

When trying to clock-in with geolocation data, the error appeared:
```
column "location_in_lat" of relation "timecards" does not exist (error code 42703)
```

This means the database schema hadn't been migrated to include geolocation columns.

## ✅ Solution Implemented

### 1. **Graceful Fallback in Code** (Live Now)
The `handleClockIn()` and `handleClockOut()` functions now:
- Try to insert with geolocation columns (`location_in_lat`, `location_in_lng`, `device_ip_in`, etc.)
- If those columns don't exist → automatically fallback to basic insert (no geolocation data)
- This prevents clock-in/out from failing while you initialize the schema

### 2. **One-Time Setup Endpoint** (Ready to Use)
Call this endpoint to add geolocation columns to the database:

```bash
POST /api/setup/init-geolocation?adminCode=ADMIN2025
```

**What it does:**
- ✅ Adds 8 geolocation columns to `timecards` table (if they don't exist)
- ✅ Creates `geofences` table for location-based access control
- ✅ Seeds default geofence: "Última Ceramic - Bogotá" at (4.7169, -74.0842) with 300m radius
- ✅ Creates necessary indexes for performance

**Response:**
```json
{
  "success": true,
  "message": "Geolocation schema initialized successfully"
}
```

---

## 🚀 How to Initialize (Choose One)

### Option A: API Endpoint (Recommended - Easiest)
```bash
# Call the setup endpoint
curl -X POST "https://ultima-ceramic.vercel.app/api/setup/init-geolocation?adminCode=ADMIN2025"
```

### Option B: CLI Migration Script
```bash
# Make sure DATABASE_URL env var is set
export DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# Run the Node.js migration script
node scripts/run-geolocation-migration.js
```

### Option C: Manual SQL (Advanced)
```bash
# Connect to Vercel Postgres and run:
psql "$DATABASE_URL" -f migrations/20251112_add_geolocation_columns.sql
```

---

## 📊 Database Schema Added

### Columns Added to `timecards` Table:
```sql
location_in_lat       DECIMAL(10,7)   -- Latitude at clock-in
location_in_lng       DECIMAL(10,7)   -- Longitude at clock-in
location_in_accuracy  DECIMAL(5,2)    -- GPS accuracy in meters
location_out_lat      DECIMAL(10,7)   -- Latitude at clock-out
location_out_lng      DECIMAL(10,7)   -- Longitude at clock-out
location_out_accuracy DECIMAL(5,2)    -- GPS accuracy at clock-out
device_ip_in          VARCHAR(45)     -- Device IP at clock-in
device_ip_out         VARCHAR(45)     -- Device IP at clock-out
```

### New Table: `geofences`
```sql
CREATE TABLE geofences (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  radius_meters INTEGER DEFAULT 300,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Default Record:**
```
name: "Última Ceramic - Bogotá"
latitude: 4.7169
longitude: -74.0842
radius_meters: 300
is_active: true
```

---

## 🎯 Geofence Management

Once initialized, use the Admin Panel to manage geofences:

1. **Admin Dashboard** → **📍 Ubicaciones** tab
2. **Create geofence:**
   - Name: "Office Name"
   - Latitude/Longitude: Set location (use "Use my location" button)
   - Radius: Distance in meters (default 300m)
   - Toggle active/inactive without deleting

3. **Employee Check-in Behavior:**
   - ✅ Inside geofence → Clock-in succeeds
   - ❌ Outside geofence → 403 error with distance (e.g., "450m from Última Ceramic - Bogotá")

---

## 🧪 Testing the System

### 1. Initialize Geolocation Schema
```bash
curl -X POST "https://your-domain.vercel.app/api/setup/init-geolocation?adminCode=ADMIN2025"
```

### 2. Test Employee Clock-In (Within Geofence)
```bash
curl -X POST "http://localhost:3000/api/timecards?action=clock_in&code=DAR" \
  -H "Content-Type: application/json" \
  -d '{
    "localTime": {"year": 2025, "month": 11, "day": 12, "hour": 14, "minute": 0, "second": 0},
    "geolocation": {"latitude": 4.7169, "longitude": -74.0842, "accuracy": 20}
  }'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Entrada registrada correctamente a las 02:00:00 p. m.",
  "employee": {"id": 45, "code": "DAR", "name": "Employee Name"},
  "timestamp": "2025-11-12 14:00:00",
  "displayTime": "02:00:00 p. m."
}
```

### 3. Test Employee Clock-Out
```bash
curl -X POST "http://localhost:3000/api/timecards?action=clock_out&code=DAR" \
  -H "Content-Type: application/json" \
  -d '{
    "localTime": {"year": 2025, "month": 11, "day": 12, "hour": 18, "minute": 30, "second": 0},
    "geolocation": {"latitude": 4.7169, "longitude": -74.0842, "accuracy": 20}
  }'
```

### 4. Test Geofence Rejection (Outside Allowed Location)
```bash
curl -X POST "http://localhost:3000/api/timecards?action=clock_in&code=DAR" \
  -H "Content-Type: application/json" \
  -d '{
    "localTime": {"year": 2025, "month": 11, "day": 13, "hour": 9, "minute": 0, "second": 0},
    "geolocation": {"latitude": 4.7000, "longitude": -74.0000, "accuracy": 15}
  }'
```

**Expected Response (Rejected):**
```json
{
  "success": false,
  "message": "❌ Fuera de rango: 13285m de Última Ceramic - Bogotá",
  "geofenceCheck": {
    "isWithinGeofence": false,
    "distance": 13285,
    "geofenceName": "Última Ceramic - Bogotá"
  },
  "instruction": "Debes estar en la ubicación de trabajo para marcar entrada"
}
```

---

## 🔧 Troubleshooting

### Issue: "Already has entry today" error
**Solution:** The employee already clocked in today. They need to clock out first.

### Issue: "Geofence check" still returns false positives
**Solution:** 
1. Verify GPS coordinates are accurate
2. Check that the geofence radius is large enough
3. Test with known coordinates inside the radius

### Issue: Location columns still show "does not exist" after setup
**Solution:** 
1. Verify the API endpoint returned `"success": true`
2. Check that you used correct `adminCode=ADMIN2025`
3. Refresh the page and try again
4. Check Vercel logs for any SQL errors

---

## 📝 Files Modified/Created

```
/api/timecards.ts                              (Modified)
  - Added graceful fallback for missing geolocation columns
  - Lines 800-820: handleClockIn with try/catch
  - Lines 1076-1107: handleClockOut with try/catch

/api/setup/init-geolocation.ts                 (NEW)
  - One-time setup endpoint for schema initialization
  - Can be called multiple times (idempotent)

/migrations/20251112_add_geolocation_columns.sql  (NEW)
  - SQL migration file for reference
  - Alternative to API endpoint

/scripts/run-geolocation-migration.js          (NEW)
  - Node.js CLI script for local migration
  - Requires DATABASE_URL env var
```

---

## ✨ Next Steps

1. **Call initialization endpoint:**
   ```bash
   curl -X POST "https://your-vercel-app.com/api/setup/init-geolocation?adminCode=ADMIN2025"
   ```

2. **Test clock-in/out flow** to verify geolocation columns work

3. **Configure geofences** in Admin Panel → Ubicaciones tab

4. **Test geofence validation** by:
   - Clock-in within geofence ✅
   - Clock-in outside geofence ❌

---

## 🎓 Technical Details

**Geofence Validation:**
- Uses Haversine formula to calculate distance between GPS coordinates
- Distance calculated in meters
- Check-in blocked if distance > `radius_meters`
- Error message shows actual distance for debugging

**Graceful Degradation:**
- If geolocation columns don't exist: employees can still clock-in/out (without location data)
- If geolocation columns exist: location data is automatically captured
- No downtime during migration

**Security:**
- Location columns are nullable (optional)
- Geofence validation is secondary to employee code verification
- Admin-only access to geofence management
- All location data auditable in `timecards` table

---

**Version:** 1.0  
**Date:** November 12, 2025  
**Status:** Ready for Production
