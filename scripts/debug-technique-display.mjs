/**
 * Debug Script: Technique Display Issue
 * 
 * Simulates the scenario where "Torno Alfarero" is shown at 11:30 AM
 * instead of "Pintura de piezas"
 * 
 * Run with: node scripts/debug-technique-display.mjs
 */

// Mock data simulating the booking scenario
const mockBookingPainting = {
  id: 'booking-001',
  productType: 'GROUP_CLASS',
  technique: 'painting', // Should be painting
  product: {
    name: 'Pintura de piezas',
    type: 'GROUP_CLASS',
    details: { technique: 'painting' }
  },
  groupClassMetadata: {
    techniqueAssignments: [
      { technique: 'painting', displayName: 'Pintura de piezas' }
    ]
  },
  slots: [
    { date: '2026-01-31', time: '11:30', instructorId: 1 }
  ]
};

const mockBookingWrongTechnique = {
  id: 'booking-002',
  productType: 'GROUP_CLASS',
  technique: 'potters_wheel', // WRONG - should be painting!
  product: {
    name: 'Pintura de piezas',
    type: 'GROUP_CLASS',
    details: { technique: 'painting' }
  },
  groupClassMetadata: {
    techniqueAssignments: [
      { technique: 'potters_wheel', displayName: 'Torno Alfarero' } // WRONG assignment
    ]
  },
  slots: [
    { date: '2026-01-31', time: '11:30', instructorId: 1 }
  ]
};

// Technique names mapping (from ScheduleManager.tsx)
const techniqueNames = {
  'potters_wheel': 'Torno Alfarero',
  'hand_modeling': 'Modelado a Mano',
  'painting': 'Pintura de piezas',
  'molding': 'Modelado',
  'mixed': 'Clase Grupal (mixto)'
};

// getUnderlyingTechnique from ScheduleManager.tsx
function getUnderlyingTechnique(booking) {
  // 1. Check groupClassMetadata (GROUP_CLASS)
  if (booking.groupClassMetadata?.techniqueAssignments && booking.groupClassMetadata.techniqueAssignments.length > 0) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map(a => a.technique);
    const uniqueTechniques = [...new Set(techniques)];
    if (uniqueTechniques.length === 1) {
      return uniqueTechniques[0];
    }
    return 'mixed';
  }
  
  // 2. Check product.details.technique (CLASS_PACKAGE, SINGLE_CLASS)
  if (booking.product?.details?.technique) {
    return booking.product.details.technique;
  }
  
  // 3. Fallback to direct technique field
  return booking.technique || 'unknown';
}

// getBookingDisplayName from ScheduleManager.tsx
function getBookingDisplayName(booking) {
  // 1. Check groupClassMetadata (GROUP_CLASS)
  if (booking.groupClassMetadata?.techniqueAssignments && booking.groupClassMetadata.techniqueAssignments.length > 0) {
    const techniques = booking.groupClassMetadata.techniqueAssignments.map(a => a.technique);
    const uniqueTechniques = [...new Set(techniques)];
    if (uniqueTechniques.length === 1) {
      return techniqueNames[uniqueTechniques[0]] || 'Clase Grupal';
    }
    return 'Clase Grupal (mixto)';
  }
  
  // 2. Prioritize product.name (most reliable source)
  const productName = booking.product?.name;
  if (productName && productName !== 'Unknown Product' && productName !== 'Unknown' && productName !== null) {
    return productName;
  }
  
  // 3. Fallback to technique directly
  if (booking.technique) {
    return techniqueNames[booking.technique] || 'Clase';
  }
  
  // 4. Last fallback: productType
  return booking.productType || 'Clase';
}

console.log('='.repeat(60));
console.log('DEBUG: Technique Display Issue - Calendar at 11:30 AM='.repeat(60));

console.log('\n📋 SCENARIO: Booking should show "');
console.log('Pintura de piezas" at 11:30 AM');
console.log('   but is showing "Torno Alfarero" instead\n');

console.log('-'.repeat(60));
console.log('TEST 1: Correct booking data (technique = painting)');
console.log('-'.repeat(60));
const technique1 = getUnderlyingTechnique(mockBookingPainting);
const displayName1 = getBookingDisplayName(mockBookingPainting);
console.log(`   Derived technique: ${technique1}`);
console.log(`   Display name: ${displayName1}`);
console.log(`   ✅ CORRECT: ${displayName1 === 'Pintura de piezas' ? 'PASS' : 'FAIL'}`);

console.log('\n-'.repeat(60));
console.log('TEST 2: Wrong booking data (technique = potters_wheel)');
console.log('-'.repeat(60));
const technique2 = getUnderlyingTechnique(mockBookingWrongTechnique);
const displayName2 = getBookingDisplayName(mockBookingWrongTechnique);
console.log(`   Derived technique: ${technique2}`);
console.log(`   Display name: ${displayName2}`);
console.log(`   ❌ PROBLEM: ${displayName2 === 'Torno Alfarero' ? 'ISSUE CONFIRMED - Shows wrong technique' : 'PASS'}`);

console.log('\n' + '='.repeat(60));
console.log('DIAGNOSIS');
console.log('='.repeat(60));

if (displayName2 === 'Torno Alfarero') {
  console.log('\n🚨 ROOT CAUSE IDENTIFIED:');
  console.log('   The booking has incorrect technique stored in the database.');
  console.log('   - groupClassMetadata.techniqueAssignments has "potters_wheel"');
  console.log('   - This overrides the product.name which says "Pintura de piezas"');
  console.log('   - The getUnderlyingTechnique() function correctly reads the wrong value');
  console.log('   - Result: "Torno Alfarero" is displayed instead of "Pintura de piezas"\n');
  
  console.log('📌 POSSIBLE SOLUTIONS:');
  console.log('   1. Fix the data in the database - update techniqueAssignments to "painting"');
  console.log('   2. OR prioritize product.name over techniqueAssignments in getBookingDisplayName()');
  console.log('   3. OR add validation when creating bookings to ensure consistency\n');
  
  console.log('📊 RECOMMENDED: Run SQL query to find and fix all inconsistent bookings:');
  console.log(`
    -- Find all bookings with inconsistent technique
    SELECT id, booking_code, product->>'name' as product_name, technique, group_metadata
    FROM bookings 
    WHERE product_type = 'GROUP_CLASS'
    AND group_metadata IS NOT NULL
    AND (
      (group_metadata::text LIKE '%potters_wheel%' AND product->>'name' LIKE '%pintura%')
      OR (group_metadata::text LIKE '%painting%' AND product->>'name' LIKE '%torno%')
    );
  `);
}

console.log('\n' + '='.repeat(60));
