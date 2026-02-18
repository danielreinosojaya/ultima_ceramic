/**
 * TEST SUITE: Optimization Phase 1 & 2
 * Validar que los fixes no rompieron funcionalidad
 * 
 * Este archivo simula operaciones reales del usuario y mide latencia/payload
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  success: boolean;
  latencyMs: number;
  payloadBytes: number;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, url: string, method: string = 'GET', body?: any) {
  console.log(`\n🧪 Testing: ${name}`);
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      timeout: 30000
    });

    const latency = Date.now() - startTime;
    const data = await response.json();
    const payloadBytes = JSON.stringify(data).length;

    const success = response.ok;
    results.push({ name, success, latencyMs: latency, payloadBytes });

    console.log(`  ✅ Success: ${success}`);
    console.log(`  ⏱️  Latency: ${latency}ms`);
    console.log(`  📦 Payload: ${(payloadBytes / 1024).toFixed(2)} KB`);

    if (!success) {
      console.log(`  ❌ Error: ${response.statusText}`);
      console.log(`  Response: ${JSON.stringify(data).substring(0, 200)}`);
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    results.push({
      name,
      success: false,
      latencyMs: latency,
      payloadBytes: 0,
      error: error instanceof Error ? error.message : String(error)
    });
    console.log(`  ❌ Error: ${error}`);
  }
}

async function runTests() {
  console.log('🚀 Starting Optimization Validation Tests\n');
  console.log(`API Base: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Test 1: Ping endpoint (no DDL)
  await test('API Health Check (ping)', '/api/data?action=ping');

  // Test 2: Get available slots (LIMIT 1000 + no DDL)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  await test(
    'Check Slot Availability (LIMIT 1000)',
    `/api/data?action=getAvailableSlots&date=${dateStr}&time=14:00&technique=molding&participants=2`,
    'GET'
  );

  // Test 3: Get customers (SELECT partial)
  await test(
    'Get Customers Summary (SELECT 5 fields, LIMIT 500)',
    '/api/data?action=getCustomers&page=1&limit=50',
    'GET'
  );

  // Test 4: List giftcard requests (no CREATE TABLE)
  await test(
    'List Giftcard Requests (no DDL)',
    '/api/data?action=listGiftcardRequests',
    'GET'
  );

  // Test 5: List giftcards (no CREATE TABLE)
  await test(
    'List Giftcards (no DDL)',
    '/api/data?action=listGiftcards',
    'GET'
  );

  // Test 6: Get instructors (cached, should be fast)
  await test(
    'Get Instructors (read-only)',
    '/api/data?action=instructors',
    'GET'
  );

  // Print Report
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST REPORT');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}/${results.length}`);
  }

  console.log('\n📈 Performance Metrics:');
  const avgLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length;
  const totalPayload = results.reduce((sum, r) => sum + r.payloadBytes, 0);
  
  console.log(`  Average Latency: ${avgLatency.toFixed(0)}ms`);
  console.log(`  Total Payload: ${(totalPayload / 1024).toFixed(2)} KB`);
  console.log(`  Max Single Payload: ${Math.max(...results.map(r => r.payloadBytes)) / 1024} KB`);

  console.log('\n🎯 Key Validations:');
  
  // Thresholds
  const slowThreshold = 1000; // 1 second
  const slowTests = results.filter(r => r.latencyMs > slowThreshold);
  
  if (slowTests.length > 0) {
    console.log(`  ⚠️  Slow endpoints (>${slowThreshold}ms):`);
    slowTests.forEach(t => {
      console.log(`    - ${t.name}: ${t.latencyMs}ms`);
    });
  } else {
    console.log(`  ✅ All endpoints < ${slowThreshold}ms`);
  }

  const largePayload = 5000000; // 5MB
  const largeTests = results.filter(r => r.payloadBytes > largePayload);
  
  if (largeTests.length > 0) {
    console.log(`  ⚠️  Large payloads (>${largePayload / 1024}MB):`);
    largeTests.forEach(t => {
      console.log(`    - ${t.name}: ${(t.payloadBytes / 1024).toFixed(2)}KB`);
    });
  } else {
    console.log(`  ✅ All payloads < 5MB`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Test completed at ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  // Exit with failure if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
