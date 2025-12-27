/**
 * FEATURE FLAGS - Control centralizado de funcionalidades
 * 
 * Este archivo permite habilitar/deshabilitar features de manera temporal.
 * Para activar una feature, cambia su valor de `false` a `true`.
 * 
 * Última actualización: 27 de diciembre, 2025
 */

export const FEATURE_FLAGS = {
  // ===== EXPERIENCIAS Y RESERVAS =====
  
  /**
   * Experiencia Personalizada
   * Permite crear experiencias grupales personalizadas donde cada persona elige su técnica
   */
  EXPERIENCIA_PERSONALIZADA: false,
  
  /**
   * Clases Sueltas
   * Permite reservar clases individuales o grupales (Torno, Modelado, Pintura)
   */
  CLASES_SUELTAS: false,
  
  /**
   * Curso de Torno desde Cero
   * Curso completo de 6 horas con certificado incluido
   */
  CURSO_TORNO: false,
  
  /**
   * Experiencias para Parejas
   * Cita creativa donde moldean piezas juntos o individuales
   */
  EXPERIENCIAS_PAREJAS: false,
  
  // ===== OTRAS FUNCIONALIDADES =====
  // Agregar más feature flags aquí según se necesite
};

/**
 * Helper function para verificar si una feature está habilitada
 * @param featureName - Nombre de la feature del objeto FEATURE_FLAGS
 * @returns boolean - true si está habilitada, false si no
 */
export const isFeatureEnabled = (featureName: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[featureName] === true;
};

/**
 * INSTRUCCIONES DE USO:
 * 
 * 1. Para HABILITAR una feature:
 *    - Busca la feature en el objeto FEATURE_FLAGS arriba
 *    - Cambia su valor de `false` a `true`
 *    - Ejemplo: EXPERIENCIA_PERSONALIZADA: true,
 * 
 * 2. Para DESHABILITAR una feature:
 *    - Cambia su valor de `true` a `false`
 * 
 * 3. Para usar en componentes:
 *    import { FEATURE_FLAGS, isFeatureEnabled } from '../featureFlags';
 *    
 *    // Opción 1:
 *    if (FEATURE_FLAGS.EXPERIENCIA_PERSONALIZADA) { ... }
 *    
 *    // Opción 2:
 *    if (isFeatureEnabled('EXPERIENCIA_PERSONALIZADA')) { ... }
 * 
 * 4. Rebuild después de cambios:
 *    npm run build
 */
