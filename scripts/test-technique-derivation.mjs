#!/usr/bin/env node
/**
 * Unit Tests: Technique Derivation Logic (Standalone)
 * 
 * Tests para validar la lógica de derivación de técnica desde product.name
 * No requiere dependencias externas - usa assert nativo de Node.js
 * 
 * @file scripts/test-technique-derivation.mjs
 */

import assert from 'assert';

// ============================================
// FUNCIÓN BAJO TEST: deriveTechniqueFromProduct
// Copiada de api/data.ts para validación
// ============================================
function deriveTechniqueFromProduct(productName) {
  if (!productName) return 'potters_wheel';
  
  const normalizedProductName = productName.toLowerCase();
  
  const productToTechnique = {
    'pintura de piezas': 'painting',
    'torno alfarero': 'potters_wheel',
    'modelado a mano': 'hand_modeling',
    'clase grupal': 'potters_wheel',
    'clase grupal (mixto)': 'potters_wheel',
    'experiencia parejas': 'potters_wheel',
    'experiencia personal': 'potters_wheel',
    'clase suelta pintura': 'painting',
    'clase suelta torno': 'potters_wheel',
    'clase suelta modelado': 'hand_modeling',
    'clase individual': 'potters_wheel',
    'clase introducción': 'potters_wheel',
    'clase de introducción': 'potters_wheel',
  };
  
  for (const [name, tech] of Object.entries(productToTechnique)) {
    if (normalizedProductName.includes(name)) {
      return tech;
    }
  }
  
  return 'potters_wheel'; // Fallback
}

// ============================================
// FUNCIÓN BAJO TEST: validateBookingTechnique
// ============================================
function validateBookingTechnique(productName, technique) {
  if (!productName || !technique) {
    return { valid: true };
  }
  
  const expectedTechnique = deriveTechniqueFromProduct(productName);
  
  if (technique !== expectedTechnique) {
    return {
      valid: false,
      error: `Técnica '${technique}' incompatible con producto '${productName}'. Técnica esperada: ${expectedTechnique}`
    };
  }
  
  return { valid: true };
}

// ============================================
// TEST RUNNER
// ============================================
let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`✅ PASS: ${description}`);
  } catch (error) {
    testsFailed++;
    console.log(`❌ FAIL: ${description}`);
    console.log(`   Error: ${error.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (actual > expected) {
        throw new Error(`Expected ${actual} to be less than or equal to ${expected}`);
      }
    }
  };
}

// ============================================
// TESTS SUITE
// ============================================
console.log('\n🧪 TECHNIQUE DERIVATION TESTS\n');
console.log('='.repeat(60));

// --- Test Group: Valid Product Names ---
console.log('\n📁 Valid Product Names\n');

test('should derive painting for Pintura de piezas', () => {
  expect(deriveTechniqueFromProduct('Pintura de piezas')).toBe('painting');
});

test('should derive potters_wheel for Torno Alfarero', () => {
  expect(deriveTechniqueFromProduct('Torno Alfarero')).toBe('potters_wheel');
});

test('should derive hand_modeling for Modelado a Mano', () => {
  expect(deriveTechniqueFromProduct('Modelado a Mano')).toBe('hand_modeling');
});

test('should derive potters_wheel for Clase Grupal (mixto)', () => {
  expect(deriveTechniqueFromProduct('Clase Grupal (mixto)')).toBe('potters_wheel');
});

test('should derive potters_wheel for Experiencia Personalizada', () => {
  expect(deriveTechniqueFromProduct('Experiencia Personalizada')).toBe('potters_wheel');
});

// --- Test Group: Case Insensitivity ---
console.log('\n📁 Case Insensitivity\n');

test('should handle lowercase product names', () => {
  expect(deriveTechniqueFromProduct('pintura de piezas')).toBe('painting');
  expect(deriveTechniqueFromProduct('torno alfarero')).toBe('potters_wheel');
  expect(deriveTechniqueFromProduct('modelado a mano')).toBe('hand_modeling');
});

test('should handle uppercase product names', () => {
  expect(deriveTechniqueFromProduct('PINTURA DE PIEZAS')).toBe('painting');
  expect(deriveTechniqueFromProduct('TORNO ALFARERO')).toBe('potters_wheel');
});

test('should handle mixed case product names', () => {
  expect(deriveTechniqueFromProduct('Pintura DE Piezas')).toBe('painting');
  expect(deriveTechniqueFromProduct('ToRnO AlfArErO')).toBe('potters_wheel');
});

// --- Test Group: Partial Match ---
console.log('\n📁 Partial Match\n');

test('should match producto real con torno', () => {
  expect(deriveTechniqueFromProduct('Clase de introducción al torno alfarero')).toBe('potters_wheel');
});

test('should match clase suelta variants', () => {
  expect(deriveTechniqueFromProduct('Clase suelta torno')).toBe('potters_wheel');
  expect(deriveTechniqueFromProduct('Clase Suelta Modelado')).toBe('hand_modeling');
  expect(deriveTechniqueFromProduct('CLASE SUELTA PINTURA')).toBe('painting');
});

// --- Test Group: Fallback Behavior ---
console.log('\n📁 Fallback Behavior\n');

test('should return potters_wheel for unknown products', () => {
  expect(deriveTechniqueFromProduct('Unknown Product')).toBe('potters_wheel');
  expect(deriveTechniqueFromProduct('Something Completely Different')).toBe('potters_wheel');
});

test('should return potters_wheel for empty string', () => {
  expect(deriveTechniqueFromProduct('')).toBe('potters_wheel');
});

test('should return potters_wheel for null', () => {
  expect(deriveTechniqueFromProduct(null)).toBe('potters_wheel');
});

test('should return potters_wheel for undefined', () => {
  expect(deriveTechniqueFromProduct(undefined)).toBe('potters_wheel');
});

// --- Test Group: Booking Validation ---
console.log('\n📁 Booking Validation\n');

test('should accept booking with matching technique for Pintura', () => {
  const result = validateBookingTechnique('Pintura de piezas', 'painting');
  expect(result.valid).toBe(true);
});

test('should accept booking with matching technique for Torno', () => {
  const result = validateBookingTechnique('Torno Alfarero', 'potters_wheel');
  expect(result.valid).toBe(true);
});

test('should accept booking with matching technique for Modelado', () => {
  const result = validateBookingTechnique('Modelado a Mano', 'hand_modeling');
  expect(result.valid).toBe(true);
});

test('should accept booking with null technique for any product', () => {
  expect(validateBookingTechnique('Pintura de piezas', null).valid).toBe(true);
  expect(validateBookingTechnique('Unknown Product', null).valid).toBe(true);
});

test('should reject Pintura with potters_wheel technique', () => {
  const result = validateBookingTechnique('Pintura de piezas', 'potters_wheel');
  expect(result.valid).toBe(false);
  expect(result.error).toContain('painting');
});

test('should reject Torno with painting technique', () => {
  const result = validateBookingTechnique('Torno Alfarero', 'painting');
  expect(result.valid).toBe(false);
  expect(result.error).toContain('potters_wheel');
});

test('should reject Modelado with potters_wheel technique', () => {
  const result = validateBookingTechnique('Modelado a Mano', 'potters_wheel');
  expect(result.valid).toBe(false);
  expect(result.error).toContain('hand_modeling');
});

// --- Test Group: Special Characters ---
console.log('\n📁 Special Characters\n');

test('should handle product names with numbers', () => {
  expect(deriveTechniqueFromProduct('Torno Alfarero 2')).toBe('potters_wheel');
});

// ============================================
// SUMMARY
// ============================================
console.log('\n' + '='.repeat(60));
console.log(`\n📊 TEST SUMMARY\n`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📈 Pass Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

if (testsFailed > 0) {
  console.log('\n🔴 TESTS FAILED - Please review errors above');
  process.exit(1);
} else {
  console.log('\n🟢 ALL TESTS PASSED');
  process.exit(0);
}
