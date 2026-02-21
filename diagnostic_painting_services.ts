/**
 * DIAGNÓSTICO: Servicios de Pintura 
 * Objetivo: Verificar por qué UI muestra 2 en lugar de 41
 */

import { sql } from '@vercel/postgres';

async function diagnosePaintingServices() {
    console.log('🎨 DIAGNÓSTICO: Servicios de Pintura\n');

    try {
        // 1️⃣ Verificar bookings con technique='painting'
        console.log('1️⃣ Bookings con technique="painting":');
        const { rows: paintingBookings } = await sql`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN is_paid = true THEN 1 END) as paid,
                COUNT(CASE WHEN is_paid = false THEN 1 END) as unpaid,
                product_type,
                COUNT(*) as count_by_type
            FROM bookings 
            WHERE LOWER(technique) = 'painting'
            GROUP BY product_type
            ORDER BY count_by_type DESC
        `;
        console.log('Resultados:', paintingBookings);

        // 2️⃣ Verificar deliveries con wants_painting=true
        console.log('\n2️⃣ Deliveries con wants_painting=true:');
        const { rows: wantsPaintingDeliveries } = await sql`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN painting_status = 'pending_payment' THEN 1 END) as pending_payment,
                COUNT(CASE WHEN painting_status = 'paid' THEN 1 END) as paid,
                COUNT(CASE WHEN painting_status = 'scheduled' THEN 1 END) as scheduled,
                COUNT(CASE WHEN painting_status = 'completed' THEN 1 END) as completed
            FROM deliveries 
            WHERE wants_painting = true
        `;
        console.log('Resultados:', wantsPaintingDeliveries);

        // 3️⃣ Total de bookings (verificación)
        console.log('\n3️⃣ Total de Bookings:');
        const { rows: totalBookings } = await sql`
            SELECT COUNT(*) as total FROM bookings
        `;
        console.log('Total:', totalBookings);

        // 4️⃣ Total de deliveries (verificación)
        console.log('\n4️⃣ Total de Deliveries:');
        const { rows: totalDeliveries } = await sql`
            SELECT COUNT(*) as total FROM deliveries
        `;
        console.log('Total:', totalDeliveries);

        // 5️⃣ Distribución de técnicas en bookings
        console.log('\n5️⃣ Distribución de técnicas en bookings:');
        const { rows: techniqueDistribution } = await sql`
            SELECT 
                technique,
                COUNT(*) as count
            FROM bookings 
            WHERE technique IS NOT NULL AND technique != ''
            GROUP BY technique
            ORDER BY count DESC
        `;
        console.log('Resultados:', techniqueDistribution);

        // 6️⃣ Verificar si hay deliveries cuyo customer_email tiene bookings con painting
        console.log('\n6️⃣ Entregas de clientes que tienen bookings con painting:');
        const { rows: crossCheck } = await sql`
            SELECT 
                d.id as delivery_id,
                d.customer_email,
                d.wants_painting,
                COUNT(DISTINCT b.id) as painting_bookings_count
            FROM deliveries d
            LEFT JOIN bookings b ON LOWER(b.user_info->>'email') = LOWER(d.customer_email) AND LOWER(b.technique) = 'painting'
            GROUP BY d.id, d.customer_email, d.wants_painting
            HAVING COUNT(DISTINCT b.id) > 0
            ORDER BY painting_bookings_count DESC
            LIMIT 10
        `;
        console.log('Resultados (top 10):', crossCheck);

        console.log('\n📊 CONCLUSIONES:');
        if (paintingBookings[0]?.total > wantsPaintingDeliveries[0]?.total) {
            console.log(`⚠️  Hay ${paintingBookings[0]?.total} bookings con painting pero solo ${wantsPaintingDeliveries[0]?.total} deliveries con wants_painting=true`);
            console.log('💡 Probable causa: Los 41 servicios de pintura están como bookings, no como entregas');
        } else {
            console.log('✅ Números coinciden');
        }

    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
    }
}

// Ejecutar diagnóstico
diagnosePaintingServices();
