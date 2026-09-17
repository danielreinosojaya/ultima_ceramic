import { 
  daysUntilDate, 
  calculateReadyExpiration, 
  getScheduledDateStatus,
  getReadyExpirationStatus,
  isCriticallyUrgent,
  PIECE_HOLD_MONTHS,
  getPieceHoldDeadlineYmd,
} from './deliveryDateCalculator';

// Test: daysUntilDate
console.log('=== Testing daysUntilDate ===');
const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

console.log(`Today (${today}):`, daysUntilDate(today), '(expected: 0)');
console.log(`Tomorrow (${tomorrow}):`, daysUntilDate(tomorrow), '(expected: 1)');
console.log(`Yesterday (${yesterday}):`, daysUntilDate(yesterday), '(expected: -1)');

// Test: calculateReadyExpiration (3 calendar months)
console.log('\n=== Testing calculateReadyExpiration ===');
const readyDate = today;
const expiration = calculateReadyExpiration(readyDate);
const daysUntilExp = daysUntilDate(expiration);
console.log(`Ready: ${readyDate}, Expires: ${expiration}`);
console.log(`Days until expiration: ${daysUntilExp} (expected: ~${PIECE_HOLD_MONTHS * 30}, 3 calendar months)`);
console.log(`Deadline YMD: ${getPieceHoldDeadlineYmd(readyDate)}`);

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

const readyToday = {
  scheduledDate: tomorrow,
  readyAt: today,
  status: 'ready'
};
console.log('Ready today (3 months left):', isCriticallyUrgent(readyToday), '(expected: false)');

const almostExpiredReady = new Date();
almostExpiredReady.setMonth(almostExpiredReady.getMonth() - 3);
almostExpiredReady.setDate(almostExpiredReady.getDate() + 10);
const criticalReady = {
  scheduledDate: tomorrow,
  readyAt: almostExpiredReady.toISOString(),
  status: 'ready'
};
console.log('Ready ~3 months ago minus 10 days:', isCriticallyUrgent(criticalReady), '(expected: true)');

const normal = {
  scheduledDate: tomorrow,
  status: 'pending'
};
console.log('Normal (future scheduled):', isCriticallyUrgent(normal), '(expected: false)');

console.log('\n✅ All utility tests completed!');
