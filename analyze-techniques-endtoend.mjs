import { sql } from '@vercel/postgres';

/**
 * Script de análisis end-to-end de técnicas en el sistema
 * Verifica consistencia entre technique, product.name, y product.details
 */

async function analyzeBookingTechniques() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ANÁLISIS END-TO-END: TÉCNICAS EN SISTEMA DE RESERVAS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Obtener todas las reservas activas
  const { rows: allBookings } = await sql`
    SELECT 
      id,
      booking_code,
      user_info->>'name' as customer_name,
      user_info->>'firstName' as first_name,
      user_info->>'lastName' as last_name,
      product->>'name' as product_name,
      product->>'type' as product_type_from_product,
      product->'details'->>'technique' as product_details_technique,
      technique,
      product_type,
      participants,
      slots,
      created_at
    FROM bookings 
    WHERE status != 'expired'
    ORDER BY created_at DESC
  `;

  console.log(`📊 Total bookings activos: ${allBookings.length}\n`);

  // 2. Analizar consistencia de datos
  const inconsistentBookings = [];
  const byTechnique = {
    potters_wheel: { correct: 0, incorrect: 0, total: 0 },
    painting: { correct: 0, incorrect: 0, total: 0 },
    hand_modeling: { correct: 0, incorrect: 0, total: 0 },
    molding: { correct: 0, incorrect: 0, total: 0 },
    unknown: { correct: 0, incorrect: 0, total: 0 }
  };

  allBookings.forEach(row => {
    const productName = (row.product_name || '').toLowerCase();
    
    // Derivar técnica esperada del product.name
    let expectedTechnique = null;
    if (productName.includes('pintura')) {
      expectedTechnique = 'painting';
    } else if (productName.includes('torno')) {
      expectedTechnique = 'potters_wheel';
    } else if (productName.includes('modelado')) {
      expectedTechnique = 'hand_modeling';
    }

    // Comparar con technique real en BD
    const actualTechnique = row.technique;
    const isConsistent = !expectedTechnique || expectedTechnique === actualTechnique;

    // Registrar estadísticas
    const key = actualTechnique || 'unknown';
    if (byTechnique[key]) {
      byTechnique[key].total++;
      if (isConsistent) {
        byTechnique[key].correct++;
      } else {
        byTechnique[key].incorrect++;
      }
    }

    // Guardar inconsistencias
    if (!isConsistent) {
      inconsistentBookings.push({
        code: row.booking_code,
        customer: row.customer_name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        productName: row.product_name,
        expected: expectedTechnique,
        actual: actualTechnique,
        productDetailsTechnique: row.product_details_technique,
        createdAt: row.created_at
      });
    }
  });

  // 3. Reporte de estadísticas
  console.log('═══ ESTADÍSTICAS POR TÉCNICA ═══\n');
  Object.entries(byTechnique).forEach(([tech, stats]) => {
    if (stats.total > 0) {
      const percentage = ((stats.correct / stats.total) * 100).toFixed(1);
      console.log(`${tech}:`);
      console.log(`  Total: ${stats.total}`);
      console.log(`  Correctos: ${stats.correct} (${percentage}%)`);
      console.log(`  Incorrectos: ${stats.incorrect}`);
      console.log();
    }
  });

  // 4. Mostrar inconsistencias
  if (inconsistentBookings.length > 0) {
    console.log('\n⚠️  INCONSISTENCIAS DETECTADAS ⚠️\n');
    console.log(`Total: ${inconsistentBookings.length} reservas\n`);
    
    inconsistentBookings.slice(0, 20).forEach(b => {
      console.log(`📌 ${b.code} - ${b.customer}`);
      console.log(`   Producto: "${b.productName}"`);
      console.log(`   Técnica esperada: ${b.expected}`);
      console.log(`   Técnica en BD: ${b.actual}`);
      if (b.productDetailsTechnique) {
        console.log(`   Product.details.technique: ${b.productDetailsTechnique}`);
      }
      console.log();
    });

    if (inconsistentBookings.length > 20) {
      console.log(`... y ${inconsistentBookings.length - 20} más\n`);
    }
  } else {
    console.log('\n✅ NO HAY INCONSISTENCIAS - Todos los datos son correctos\n');
  }

  // 5. Análisis de impacto por fecha
  console.log('\n═══ ANÁLISIS DE IMPACTO POR FECHA ═══\n');
  
  const dateImpact = {};
  inconsistentBookings.forEach(b => {
    const date = new Date(b.createdAt).toISOString().split('T')[0];
    if (!dateImpact[date]) {
      dateImpact[date] = 0;
    }
    dateImpact[date]++;
  });

  const sortedDates = Object.entries(dateImpact).sort((a, b) => b[1] - a[1]);
  sortedDates.slice(0, 10).forEach(([date, count]) => {
    console.log(`${date}: ${count} reservas inconsistentes`);
  });

  // 6. Análisis de tipos de producto afectados
  console.log('\n═══ TIPOS DE PRODUCTO AFECTADOS ═══\n');
  
  const productTypeImpact = {};
  allBookings.forEach(row => {
    const productName = row.product_name || 'Sin nombre';
    const productType = row.product_type;
    const key = `${productType} - ${productName}`;
    
    if (!productTypeImpact[key]) {
      productTypeImpact[key] = { total: 0, inconsistent: 0 };
    }
    productTypeImpact[key].total++;
    
    if (inconsistentBookings.some(b => b.code === row.booking_code)) {
      productTypeImpact[key].inconsistent++;
    }
  });

  const sortedProducts = Object.entries(productTypeImpact)
    .filter(([, stats]) => stats.inconsistent > 0)
    .sort((a, b) => b[1].inconsistent - a[1].inconsistent);

  sortedProducts.forEach(([product, stats]) => {
    console.log(`${product}: ${stats.inconsistent}/${stats.total} inconsistentes`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  FIN DEL ANÁLISIS');
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(0);
}

analyzeBookingTechniques().catch(err => {
  console.error('Error en análisis:', err);
  process.exit(1);
});
