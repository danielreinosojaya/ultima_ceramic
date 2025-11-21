import { 
  daysUntilDate, 
  calculateReadyExpiration, 
  getScheduledDateStatus,
  getReadyExpirationStatus,
  isCriticallyUrgent 
} from './deliveryDateCalculator';

// Test: daysUntilDate
console.log('=== Testing daysUntilDate ===');
const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

console.log(`Today (${today}):`, daysUntilDate(today), '(expected: 0)');
console.log(`Tomorrow (${tomorrow}):`, daysUntilDate(tomorrow), '(expected: 1)');
console.log(`Yesterday (${yesterday}):`, daysUntilDate(yesterday), '(expected: -1)');

// Test: calculateReadyExpiration
console.log('\n=== Testing calculateReadyExpiration ===');
const readyDate = today;
const expiration = calculateReadyExpiration(readyDate);
const daysUntilExp = daysUntilDate(expiration);
console.log(`Ready: ${readyDate}, Expires: ${expiration}`);
console.log(`Days until expiration: ${daysUntilExp} (expected: 60)`);

// Test: getScheduledDateStatus
console.log('\n=== Testing getScheduledDateStatus ===');
console.log('10 days:', getScheduledDateStatus(10));
console.log('1 day:', getScheduledDateStatus(1));
console.log('0 days:', getScheduledDateStatus(0));
console.log('-5 days:', getScheduledDateStatus(-5));

// Test: getReadyExpirationStatus
console.log('\n=== Testing getReadyExpirationStatus ===');
console.log('50 days:', getReadyExpirationStatus(50));
console.log('30 days:', getReadyExpirationStatus(30));
console.log('10 days:', getReadyExpirationStatus(10));
console.log('0 days:', getReadyExpirationStatus(0));
console.log('-5 days:', getReadyExpirationStatus(-5));

// Test: isCriticallyUrgent
console.log('\n=== Testing isCriticallyUrgent ===');
const criticalScheduled = {
  scheduledDate: yesterday,
  status: 'pending'
};
console.log('Past scheduled date (pending):', isCriticallyUrgent(criticalScheduled), '(expected: true)');

const criticalReady = {
  scheduledDate: tomorrow,
  readyAt: today,
  status: 'ready'
};
console.log('Ready + 60 days expiring soon:', isCriticallyUrgent(criticalReady), '(expected: true since expires in 60 days)');

const normal = {
  scheduledDate: tomorrow,
  status: 'pending'
};
console.log('Normal (future scheduled):', isCriticallyUrgent(normal), '(expected: false)');

console.log('\n✅ All utility tests completed!');
