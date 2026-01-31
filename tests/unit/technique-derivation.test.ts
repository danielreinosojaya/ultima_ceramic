/**
 * Unit Tests: Technique Derivation Logic
 * 
 * Tests para validar la lógica de derivación de técnica desde product.name
 * 
 * @file tests/unit/technique-derivation.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Simulación de la función deriveTechniqueFromProduct de api/data.ts
function deriveTechniqueFromProduct(productName: string | null): string {
  if (!productName) return 'potters_wheel';
  
  const normalizedProductName = productName.toLowerCase();
  
  const productToTechnique: Record<string, string> = {
    'pintura de piezas': 'painting',
    'torno alfarero': 'potters_wheel',
    'modelado a mano': 'hand_modeling',
    'clase grupal': 'potters_wheel',
    'clase grupal (mixto)': 'potters_wheel',
    'experiencia parejas': 'potters_wheel',
    'experiencia personal': 'potters_wheel',
  };
  
  for (const [name, tech] of Object.entries(productToTechnique)) {
    if (normalizedProductName.includes(name)) {
      return tech;
    }
  }
  
  return 'potters_wheel'; // Fallback
}

// Función de validación similar a validateBookingTechnique
function validateBookingTechnique(productName: string | null, technique: string | null): {
  valid: boolean;
  error?: string;
} {
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

describe('Technique Derivation Logic', () => {
  describe('Valid Product Names', () => {
    it('should derive painting for Pintura de piezas', () => {
      expect(deriveTechniqueFromProduct('Pintura de piezas')).toBe('painting');
    });

    it('should derive potters_wheel for Torno Alfarero', () => {
      expect(deriveTechniqueFromProduct('Torno Alfarero')).toBe('potters_wheel');
    });

    it('should derive hand_modeling for Modelado a Mano', () => {
      expect(deriveTechniqueFromProduct('Modelado a Mano')).toBe('hand_modeling');
    });

    it('should derive potters_wheel for Clase Grupal (mixto)', () => {
      expect(deriveTechniqueFromProduct('Clase Grupal (mixto)')).toBe('potters_wheel');
    });

    it('should derive potters_wheel for Experiencia Personalizada', () => {
      expect(deriveTechniqueFromProduct('Experiencia Personalizada')).toBe('potters_wheel');
    });
  });

  describe('Case Insensitivity', () => {
    it('should handle lowercase product names', () => {
      expect(deriveTechniqueFromProduct('pintura de piezas')).toBe('painting');
      expect(deriveTechniqueFromProduct('torno alfarero')).toBe('potters_wheel');
      expect(deriveTechniqueFromProduct('modelado a mano')).toBe('hand_modeling');
    });

    it('should handle uppercase product names', () => {
      expect(deriveTechniqueFromProduct('PINTURA DE PIEZAS')).toBe('painting');
      expect(deriveTechniqueFromProduct('TORNO ALFARERO')).toBe('potters_wheel');
    });

    it('should handle mixed case product names', () => {
      expect(deriveTechniqueFromProduct('Pintura DE Piezas')).toBe('painting');
      expect(deriveTechniqueFromProduct('ToRnO AlfArErO')).toBe('potters_wheel');
    });
  });

  describe('Partial Match', () => {
    it('should match if product name contains técnica keyword', () => {
      expect(deriveTechniqueFromProduct('Intro to Torno Alfarero Class')).toBe('potters_wheel');
      expect(deriveTechniqueFromProduct('Advanced Pintura Workshop')).toBe('painting');
      expect(deriveTechniqueFromProduct('Masterclass de Modelado')).toBe('hand_modeling');
    });

    it('should match clase suelta variants', () => {
      expect(deriveTechniqueFromProduct('Clase suelta torno')).toBe('potters_wheel');
      expect(deriveTechniqueFromProduct('Clase Suelta Modelado')).toBe('hand_modeling');
      expect(deriveTechniqueFromProduct('CLASE SUELTA PINTURA')).toBe('painting');
    });
  });

  describe('Fallback Behavior', () => {
    it('should return potters_wheel for unknown products', () => {
      expect(deriveTechniqueFromProduct('Unknown Product')).toBe('potters_wheel');
      expect(deriveTechniqueFromProduct('Something Completely Different')).toBe('potters_wheel');
    });

    it('should return potters_wheel for empty string', () => {
      expect(deriveTechniqueFromProduct('')).toBe('potters_wheel');
    });

    it('should return potters_wheel for null', () => {
      expect(deriveTechniqueFromProduct(null as any)).toBe('potters_wheel');
    });

    it('should return potters_wheel for undefined', () => {
      expect(deriveTechniqueFromProduct(undefined as any)).toBe('potters_wheel');
    });
  });

  describe('Special Characters', () => {
    it('should handle product names with accents', () => {
      expect(deriveTechniqueFromProduct('Torno Alfarero')).toBe('potters_wheel');
      expect(deriveTechniqueFromProduct('Modelado a Mano')).toBe('hand_modeling');
    });

    it('should handle product names with numbers', () => {
      expect(deriveTechniqueFromProduct('Torno Alfarero 2')).toBe('potters_wheel');
      expect(deriveTechniqueFromProduct('Pack 4 Clases de Pintura')).toBe('painting');
    });
  });
});

describe('Booking Technique Validation', () => {
  describe('Consistent Booking', () => {
    it('should accept booking with matching technique and product', () => {
      const result = validateBookingTechnique('Pintura de piezas', 'painting');
      expect(result.valid).toBe(true);
    });

    it('should accept booking with matching technique for Torno', () => {
      const result = validateBookingTechnique('Torno Alfarero', 'potters_wheel');
      expect(result.valid).toBe(true);
    });

    it('should accept booking with matching technique for Modelado', () => {
      const result = validateBookingTechnique('Modelado a Mano', 'hand_modeling');
      expect(result.valid).toBe(true);
    });

    it('should accept booking with null technique for any product', () => {
      expect(validateBookingTechnique('Pintura de piezas', null).valid).toBe(true);
      expect(validateBookingTechnique('Unknown Product', null).valid).toBe(true);
    });

    it('should accept booking with null product for any technique', () => {
      expect(validateBookingTechnique(null, 'painting').valid).toBe(true);
      expect(validateBookingTechnique(null, 'potters_wheel').valid).toBe(true);
    });
  });

  describe('Inconsistent Booking', () => {
    it('should reject Pintura with potters_wheel technique', () => {
      const result = validateBookingTechnique('Pintura de piezas', 'potters_wheel');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('painting');
    });

    it('should reject Torno with painting technique', () => {
      const result = validateBookingTechnique('Torno Alfarero', 'painting');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('potters_wheel');
    });

    it('should reject Modelado with potters_wheel technique', () => {
      const result = validateBookingTechnique('Modelado a Mano', 'potters_wheel');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hand_modeling');
    });

    it('should reject Pintura with hand_modeling technique', () => {
      const result = validateBookingTechnique('Pintura de piezas', 'hand_modeling');
      expect(result.valid).toBe(false);
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error message for mismatch', () => {
      const result = validateBookingTechnique('Pintura de piezas', 'potters_wheel');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Pintura de piezas');
      expect(result.error).toContain('painting');
    });
  });
});

// Exportar para uso en otros tests
export { deriveTechniqueFromProduct, validateBookingTechnique };
