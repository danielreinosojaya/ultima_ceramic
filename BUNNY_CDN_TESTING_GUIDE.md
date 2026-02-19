# Bunny CDN Upload - Manual Testing Guide

## Pre-Test Setup

### 1. Deploy Code to Vercel
```bash
git add .
git commit -m "feat: Bunny CDN photo upload integration - Phase 1"
git push origin cdn
```

### 2. Configure Bunny Credentials in Vercel
Go to Vercel Project Settings → Environment Variables:
```
BUNNY_API_KEY=<your_bunny_api_key>
BUNNY_STORAGE_ZONE=<your_storage_zone>
BUNNY_CDN_HOSTNAME=<your-cdn-hostname.b-cdn.net>
```

### 3. Redeploy Vercel Project
Trigger new deployment after adding env vars:
```
vercel --prod
```

---

## Test Case 1: Happy Path (Complete Upload)

**Objective**: Verify full upload flow works end-to-end

### Steps:
1. Navigate to client delivery form (Client Dashboard → Report Delivery)
2. Fill required fields:
   - Email: `test-bunny@example.com`
   - First Name: `Test`
   - Last Name: `User`
   - Phone: `+1234567890`
3. Click "Siguiente" to go to photos step
4. Upload 2 photos:
   - Take/select a photo from camera or gallery
   - Take/select a second photo
5. Click "Siguiente" through painting step and confirmation
6. Click "Enviar" to submit

### Expected Results:
```
✅ Success message appears: "¡Gracias! Hemos recibido tu información y fotos..."
✅ Form resets to initial state
✅ Check database: Delivery record has:
   - photos: ["https://cdn.../deliveries/uuid/photo-1.jpg", "https://cdn.../deliveries/uuid/photo-2.jpg"]
   - NOT base64 data
✅ Check Bunny dashboard: Files appear in storage under deliveries/uuid/
```

### Server Logs Expected:
```
[ClientDeliveryForm] Step 1: Creating delivery without photos...
[ClientDeliveryForm] Delivery created successfully, ID: <uuid>
[ClientDeliveryForm] Step 3: Uploading 2 photos to Bunny CDN...
[ClientDeliveryForm] Uploading photo 1/2...
[BunnyUpload] ✅ Photo uploaded successfully: https://cdn.../...
[ClientDeliveryForm] Photo 1 uploaded successfully: https://cdn.../...
[ClientDeliveryForm] Uploading photo 2/2...
[BunnyUpload] ✅ Photo uploaded successfully: https://cdn.../...
[ClientDeliveryForm] Step 4: Updating delivery with CDN photo URLs...
[ClientDeliveryForm] Submission completed successfully
```

---

## Test Case 2: Missing Bunny Credentials

**Objective**: Verify graceful degradation when Bunny not configured

### Setup:
1. Remove BUNNY_API_KEY and BUNNY_STORAGE_ZONE from Vercel env vars
2. Redeploy
3. Wait for new deployment to complete

### Steps:
1. Fill delivery form (same as Test Case 1)
2. Upload 2 photos
3. Submit

### Expected Results:
```
✅ Delivery created successfully in database (photos: null)
⚠️ Upload fails with message: "Aviso: No se pudo subir la foto 1. Continuando..."
⚠️ Photo 2 also fails
✅ User still sees success message (delivery was created)
✅ Check database: Delivery has photos: null
ℹ️ Admin can manually add photos later if needed
```

### Server Logs Expected:
```
[uploadDeliveryPhoto] Feature flag check failed
403 Forbidden: Photo upload service not available
```

---

## Test Case 3: Invalid Base64 Data

**Objective**: Verify error handling for corrupted/invalid data

### Setup (Developer Console):
1. Open browser DevTools → Console
2. Copy this code to simulate manual API call:
```javascript
const fakeBase64 = "data:image/jpeg;base64,INVALID_DATA_NOT_REAL";
fetch('/api/data?action=uploadDeliveryPhoto', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    base64Data: fakeBase64,
    deliveryId: 'test-uuid-123'
  })
}).then(r => r.json()).then(console.log);
```

### Expected Results:
```
❌ Response: { success: false, error: "Invalid base64 data or file too large" }
ℹ️ No upload attempted to Bunny
✅ Server handled gracefully
```

---

## Test Case 4: File Size Limit (>5MB)

**Objective**: Verify 5MB size limit on uploads

### Setup:
1. Create a large image file (>5MB) locally
2. Use DevTools Console to upload it:

```javascript
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.click();
fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = async (evt) => {
    const base64 = evt.target.result;
    const response = await fetch('/api/data?action=uploadDeliveryPhoto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data: base64,
        deliveryId: 'test-uuid-456'
      })
    });
    console.log(await response.json());
  };
  reader.readAsDataURL(file);
};
```

### Expected Results:
```
❌ Response: { success: false, error: "Invalid base64 data or file too large" }
✅ 5MB limit enforced
✅ No upload attempted to Bunny
```

---

## Test Case 5: Network Failure During Upload

**Objective**: Verify error handling if Bunny upload fails

### Setup (Simulate with DevTools):
1. Open DevTools → Network tab
2. Throttle to "Offline"
3. Fill delivery form with photos
4. Submit form

### Expected Results:
```
⚠️ Upload fails: "Error uploading photo..."
✅ Delivery still created (photos: null or partial)
✅ User told which photos failed
⏱️ Form doesn't hang (async errors caught)
```

---

## Test Case 6: Backward Compatibility - Old Base64 Photos

**Objective**: Verify system still displays old base64 photos

### Setup:
1. Find existing delivery records in DB with base64 photos
2. Open PhotoViewerModal for that delivery

### Expected Results:
```
✅ Photos display correctly
✅ System detects both data: and https: URLs
✅ No errors in console
ℹ️ New uploads use CDN, old ones show base64 (during migration)
```

---

## Test Case 7: Delivery Update After Upload

**Objective**: Verify updateDelivery correctly adds CDN URLs

### Setup (Database Verification):
1. After Test Case 1, verify DB directly:

```sql
SELECT id, customer_email, photos, created_at 
FROM deliveries 
WHERE customer_email = 'test-bunny@example.com'
ORDER BY created_at DESC 
LIMIT 1;
```

### Expected Results:
```
✅ photos column contains: 
   ["https://cdn.hostname/deliveries/uuid/photo-1.jpg", 
    "https://cdn.hostname/deliveries/uuid/photo-2.jpg"]
✅ NO base64 data in database
✅ created_at shows recent timestamp
```

---

## Test Case 8: Duplicate Photo Names

**Objective**: Verify unique naming prevents photo conflicts

### Steps:
1. Upload same photo twice (upload, then upload again)
2. Check Bunny storage

### Expected Results:
```
✅ Both photos stored with unique filenames:
   deliveries/uuid-1/photo-1234567890-abc123.jpg
   deliveries/uuid-2/photo-1234567890-def456.jpg
✅ Timestamps + random suffixes ensure no conflicts
✅ Each delivery can have similarly named originals
```

---

## Test Case 9: PhotoViewerModal Display

**Objective**: Verify CDN photos display in admin PhotoViewerModal

### Steps:
1. In admin panel, open a delivery with CDN URLs (from Test Case 1)
2. Click photo icon to open PhotoViewerModal
3. Verify photo displays

### Expected Results:
```
✅ CDN URL loads and displays
✅ No CORS errors in console
✅ Image quality looks good (compressed JPEG)
✅ Navigation works (prev/next if multiple photos)
```

---

## Test Case 10: Admin NewDeliveryModal (Unchanged)

**Objective**: Verify admin photo upload still works

### Steps:
1. Go to admin → Deliveries
2. Click "Nueva Entrega"
3. Upload 1-2 photos from admin modal
4. Fill remaining fields and save

### Expected Results:
```
✅ Photos still use base64 flow (admin panel not yet updated)
✅ Delivery created with base64 photos
ℹ️ NOTE: Admin components will be updated in future iteration
ℹ️ Data model remains compatible (photos array accepts both)
```

---

## Performance Testing

### Measure Upload Time:
1. Fill form with photos
2. Open DevTools → Network tab
3. Submit form
4. Note timing in Console.log:

```javascript
// In ClientDeliveryForm handleSubmit()
console.time('total-upload');
// ... submit happens ...
console.timeEnd('total-upload');
```

**Expected Results**:
```
Single photo: 2-5 seconds
Two photos: 4-10 seconds
(Includes create delivery + compression + Bunny upload + DB update)
```

### Monitor Bunny Bandwidth:
1. Log into Bunny dashboard
2. Check bandwidth usage over test period
3. Each photo ~200-500KB (compressed JPEG)

---

## Security Verification

### Check Credentials NOT Exposed:
1. Open Network tab
2. Click form submit
3. Inspect POST /api/data requests
4. **Verify NO BUNNY_API_KEY in request body or headers**

```javascript
// SHOULD NOT APPEAR in any request
BUNNY_API_KEY=xyz
BUNNY_STORAGE_ZONE=abc
```

✅ Credentials server-side only, never sent to frontend

### Check File Size Validation:
1. Create >6MB image
2. Attempt upload via API
3. **Verify rejected before sending to Bunny**

---

## Rollback Plan

If issues found:

### Quick Rollback:
```bash
git checkout main
vercel --prod
```

### Users Unaffected:
- Existing deliveries with base64 continue to work
- New uploads simply fail gracefully (delivery still created)
- No data loss

---

## Success Criteria ✅

All tests must pass before production deployment:

- [ ] Test 1: Happy path completes
- [ ] Test 2: Graceful degradation without credentials  
- [ ] Test 3: Invalid base64 handled
- [ ] Test 4: 5MB size limit enforced
- [ ] Test 5: Network errors caught
- [ ] Test 6: Old photos still display
- [ ] Test 7: DB updates correctly
- [ ] Test 8: Unique file naming works
- [ ] Test 9: PhotoViewerModal displays CDN URLs
- [ ] Test 10: Admin flow unchanged
- [ ] Performance: Uploads < 10 seconds for 2 photos
- [ ] Security: No credentials exposed to frontend

---

## Monitoring Dashboard

After deployment, monitor:

```sql
-- Success rate
SELECT 
  COUNT(*) total,
  COUNT(CASE WHEN photos LIKE 'https://%' THEN 1 END) as cdn_photos,
  COUNT(CASE WHEN photos LIKE 'data:%' THEN 1 END) as base64_photos
FROM deliveries 
WHERE created_at > NOW() - INTERVAL '7 days';

-- Error trends (in Vercel logs)
grep "[BunnyUpload] Error" logs/ | wc -l
grep "uploadDeliveryPhoto failed" logs/ | wc -l
```

---

**Test Plan Version**: 1.0  
**Date**: October 2025  
**Status**: Ready for Testing Phase
