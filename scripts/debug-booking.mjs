#!/usr/bin/env node

/**
 * Debug script to inspect a specific booking in the database
 * Usage: node scripts/debug-booking.mjs <booking_code>
 */

import { neon } from '@neondatabase/serverless';

const bookingCode = process.argv[2];

if (!bookingCode) {
  console.error('❌ Error: Please provide a booking code');
  console.log('Usage: node scripts/debug-booking.mjs C-ALMA-XXXXXXXX');
  process.exit(1);
}

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;

if (!dbUrl) {
  console.error('❌ Error: No database URL found in environment variables');
  process.exit(1);
}

const sql = neon(dbUrl);

console.log('🔍 Searching for booking:', bookingCode);
console.log('');

try {
  // Query the booking
  const { rows } = await sql`
    SELECT 
      id,
      booking_code,
      product_id,
      product_type,
      slots,
      user_info,
      created_at,
      is_paid,
      price,
      booking_mode,
      product,
      payment_details,
      attendance,
      booking_date
    FROM bookings 
    WHERE booking_code = ${bookingCode}
  `;

  if (rows.length === 0) {
    console.log('❌ Booking not found in database');
    process.exit(0);
  }

  const booking = rows[0];
  
  console.log('✅ Booking found!');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 BOOKING DETAILS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('ID:', booking.id);
  console.log('Booking Code:', booking.booking_code);
  console.log('Created At:', booking.created_at);
  console.log('Is Paid:', booking.is_paid);
  console.log('Price:', booking.price);
  console.log('Booking Mode:', booking.booking_mode);
  console.log('Booking Date:', booking.booking_date);
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📦 PRODUCT INFO');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Product ID:', booking.product_id);
  console.log('Product Type:', booking.product_type);
  
  if (booking.product) {
    const product = typeof booking.product === 'string' 
      ? JSON.parse(booking.product) 
      : booking.product;
    console.log('Product Name:', product.name || 'N/A');
    console.log('Product Full Data:', JSON.stringify(product, null, 2));
  } else {
    console.log('⚠️  No product data stored');
  }
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('👤 USER INFO');
  console.log('═══════════════════════════════════════════════════════════════');
  if (booking.user_info) {
    const userInfo = typeof booking.user_info === 'string'
      ? JSON.parse(booking.user_info)
      : booking.user_info;
    console.log('Name:', userInfo.firstName, userInfo.lastName);
    console.log('Email:', userInfo.email);
    console.log('Phone:', userInfo.countryCode, userInfo.phone);
  } else {
    console.log('⚠️  No user info stored');
  }
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📅 SLOTS INFO');
  console.log('═══════════════════════════════════════════════════════════════');
  if (booking.slots) {
    const slots = typeof booking.slots === 'string'
      ? JSON.parse(booking.slots)
      : booking.slots;
      
    if (Array.isArray(slots)) {
      console.log(`Total slots: ${slots.length}`);
      console.log('');
      slots.forEach((slot, index) => {
        console.log(`  Slot ${index + 1}:`);
        console.log(`    Date: ${slot.date || 'N/A'}`);
        console.log(`    Time: ${slot.time || 'N/A'}`);
        console.log(`    Instructor ID: ${slot.instructorId !== undefined ? slot.instructorId : 'N/A'}`);
      });
    } else {
      console.log('⚠️  Slots is not an array:', slots);
    }
  } else {
    console.log('⚠️  No slots stored');
  }
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('💰 PAYMENT DETAILS');
  console.log('═══════════════════════════════════════════════════════════════');
  if (booking.payment_details) {
    const paymentDetails = typeof booking.payment_details === 'string'
      ? JSON.parse(booking.payment_details)
      : booking.payment_details;
      
    if (Array.isArray(paymentDetails)) {
      console.log(`Total payments: ${paymentDetails.length}`);
      
      if (paymentDetails.length === 0) {
        console.log('⚠️  No payments recorded');
      } else {
        console.log('');
        paymentDetails.forEach((payment, index) => {
          console.log(`  Payment ${index + 1}:`);
          console.log(`    Amount: $${payment.amount || 0}`);
          console.log(`    Method: ${payment.method || 'N/A'}`);
          console.log(`    Received At: ${payment.receivedAt || 'N/A'}`);
          if (payment.giftcardId) {
            console.log(`    Giftcard ID: ${payment.giftcardId}`);
            console.log(`    Giftcard Amount: $${payment.giftcardAmount || 0}`);
          }
        });
      }
      
      const totalPaid = paymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0);
      console.log('');
      console.log(`  💵 Total Paid: $${totalPaid.toFixed(2)}`);
      console.log(`  💵 Price: $${booking.price}`);
      console.log(`  💵 Pending Balance: $${(booking.price - totalPaid).toFixed(2)}`);
      console.log(`  ✓ Should be marked as paid: ${totalPaid >= booking.price ? 'YES' : 'NO'}`);
    } else {
      console.log('⚠️  Payment details is not an array:', paymentDetails);
    }
  } else {
    console.log('⚠️  No payment details stored');
  }
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 DIAGNOSTIC SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const slots = booking.slots ? (typeof booking.slots === 'string' ? JSON.parse(booking.slots) : booking.slots) : [];
  const hasSlots = Array.isArray(slots) && slots.length > 0;
  const hasValidSlots = hasSlots && slots.every(s => s.date && s.time);
  
  console.log('✓ Has slots:', hasSlots ? 'YES' : 'NO');
  console.log('✓ Slots are valid (date & time):', hasValidSlots ? 'YES' : 'NO');
  console.log('✓ Is paid:', booking.is_paid ? 'YES' : 'NO');
  console.log('✓ Product type:', booking.product_type);
  
  console.log('');
  console.log('📊 VISIBILITY ANALYSIS:');
  console.log('');
  
  // Análisis para calendario semanal
  if (hasValidSlots) {
    console.log('  ✅ Should appear in weekly calendar: YES');
    console.log('     → Has valid slots with date and time');
  } else {
    console.log('  ❌ Should appear in weekly calendar: NO');
    console.log('     → Missing valid slots or incomplete slot data');
  }
  
  // Análisis para búsqueda
  if (booking.booking_code) {
    console.log('  ✅ Should be searchable by code: YES');
    console.log('     → Has booking code:', booking.booking_code);
  } else {
    console.log('  ❌ Should be searchable by code: NO');
    console.log('     → Missing booking code');
  }
  
  // Análisis para pendientes de pago
  const isOpenStudio = booking.product_type === 'OPEN_STUDIO_SUBSCRIPTION';
  const shouldShowInPending = !booking.is_paid && (isOpenStudio || hasSlots);
  
  console.log(`  ${shouldShowInPending ? '✅' : '❌'} Should appear in pending payments: ${shouldShowInPending ? 'YES' : 'NO'}`);
  if (!booking.is_paid) {
    if (isOpenStudio) {
      console.log('     → Is unpaid Open Studio subscription');
    } else if (hasSlots) {
      console.log('     → Is unpaid package/class with slots');
    } else {
      console.log('     → Is unpaid but has no slots (filtered out for non-Open Studio)');
    }
  } else {
    console.log('     → Is already marked as paid');
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');

} catch (error) {
  console.error('❌ Error querying database:', error.message);
  console.error(error);
  process.exit(1);
}
