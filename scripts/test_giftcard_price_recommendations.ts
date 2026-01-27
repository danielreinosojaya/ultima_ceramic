/**
 * TEST: Validación de Recomendaciones de Precio para Giftcards
 * 
 * Este script valida la lógica que recomienda productos según el monto de la giftcard
 */

interface Product {
  name: string;
  price: number;
  type: 'single' | 'package' | 'experience' | 'subscription';
  pricePerClass?: number;
}

const PRODUCTS: Product[] = [
  { name: "Clase de Modelado a Mano", price: 45, type: 'single' },
  { name: "Clase de Torno", price: 55, type: 'single' },
  { name: "Paquete 4 Clases", price: 180, type: 'package', pricePerClass: 45 },
  { name: "Paquete 8 Clases", price: 330, type: 'package', pricePerClass: 41.25 },
  { name: "Paquete 12 Clases", price: 470, type: 'package', pricePerClass: 39.17 },
];

/**
 * Función que genera recomendaciones basadas en el monto
 */
function getRecommendations(amount: number): {
  exactMatches: Product[];
  canAfford: Product[];
  contributions: Product[];
  message: string;
} {
  const exactMatches = PRODUCTS.filter(p => Math.abs(p.price - amount) < 5);
  const canAfford = PRODUCTS.filter(p => p.price <= amount && !exactMatches.includes(p));
  const contributions = PRODUCTS.filter(p => p.price > amount && amount >= p.price * 0.3);
  
  let message = "";
  
  if (exactMatches.length > 0) {
    message = `✨ Perfecto para: ${exactMatches[0].name}`;
  } else if (canAfford.length > 0) {
    const best = canAfford.sort((a, b) => b.price - a.price)[0];
    message = `✓ Puede elegir: ${best.name} ($${best.price})`;
  } else if (contributions.length > 0) {
    message = `💡 Puede contribuir a: ${contributions[0].name}`;
  } else {
    message = `💰 Monto disponible para experiencias grupales`;
  }
  
  return { exactMatches, canAfford, contributions, message };
}

/**
 * Función que genera sugerencias para los badges de los botones
 */
function getBadgeText(amount: number): string {
  const badges: Record<number, string> = {
    45: "🤚 Clase Modelado",
    55: "🎡 Clase Torno",
    180: "📦 Paquete 4",
    330: "📦 Paquete 8",
  };
  
  return badges[amount] || "";
}

// ============================================
// TESTS
// ============================================

console.log("🧪 INICIANDO TESTS DE RECOMENDACIONES DE PRECIO\n");

const testCases = [
  { amount: 25, expected: "contribuir" },
  { amount: 45, expected: "Clase de Modelado" },
  { amount: 55, expected: "Clase de Torno" },
  { amount: 100, expected: "Clase de Torno" },
  { amount: 180, expected: "Paquete 4 Clases" },
  { amount: 200, expected: "Paquete 4 Clases" },
  { amount: 330, expected: "Paquete 8 Clases" },
  { amount: 470, expected: "Paquete 12 Clases" },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = getRecommendations(test.amount);
  const success = result.message.includes(test.expected);
  
  console.log(`Test ${index + 1}: Monto $${test.amount}`);
  console.log(`  Mensaje: ${result.message}`);
  console.log(`  Badge: ${getBadgeText(test.amount)}`);
  console.log(`  ✓ Puede pagar: ${result.canAfford.map(p => p.name).join(", ") || "Ninguno completo"}`);
  console.log(`  💡 Puede contribuir: ${result.contributions.map(p => p.name).join(", ") || "Ninguno"}`);
  console.log(`  Status: ${success ? "✅ PASS" : "❌ FAIL"}`);
  console.log("");
  
  if (success) passed++;
  else failed++;
});

// Test de badges
console.log("\n📌 VALIDACIÓN DE BADGES:");
[45, 55, 180, 330].forEach(amount => {
  const badge = getBadgeText(amount);
  console.log(`  $${amount}: "${badge}" ${badge ? "✅" : "⚠️ Sin badge"}`);
});

// Test de edge cases
console.log("\n🔍 EDGE CASES:");

// Monto muy bajo
const lowAmount = getRecommendations(10);
console.log(`  $10: ${lowAmount.message} ${lowAmount.message.includes("grupal") ? "✅" : "❌"}`);

// Monto muy alto
const highAmount = getRecommendations(500);
console.log(`  $500: ${highAmount.message}`);
console.log(`    Puede elegir cualquiera: ${highAmount.canAfford.length === PRODUCTS.length ? "✅" : "❌"}`);

// Monto exacto
const exact = getRecommendations(180);
console.log(`  $180 (exacto): ${exact.exactMatches.length > 0 ? "✅ Coincidencia exacta" : "❌ Debería tener match exacto"}`);

console.log("\n" + "=".repeat(60));
console.log(`RESUMEN: ${passed}/${testCases.length} tests pasados`);
console.log(`Status: ${failed === 0 ? "✅ TODOS LOS TESTS PASARON" : `❌ ${failed} tests fallaron`}`);
console.log("=".repeat(60));

// Exportar para uso en React
export { getRecommendations, getBadgeText, PRODUCTS };
