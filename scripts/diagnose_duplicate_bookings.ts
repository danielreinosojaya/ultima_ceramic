/**
 * Script de diagnóstico: Detectar bookings con slots duplicados
 * 
 * Analiza la base de datos para encontrar bookings que tengan
 * el mismo slot repetido múltiples veces.
 */

import { sql } from '@vercel/postgres';

async function diagnoseDuplicateSlots() {
    console.log('🔍 DIAGNÓSTICO: Bookings con slots duplicados\n');
    console.log('='.repeat(70));
    
    try {
        // Obtener todos los bookings
        const { rows: bookings } = await sql`
            SELECT 
                id,
                booking_code,
                user_info,
                slots,
                created_at
            FROM bookings
            ORDER BY created_at DESC
            LIMIT 50
        `;
        
        console.log(`\n📊 Analizando ${bookings.length} bookings más recientes...\n`);
        
        let duplicatesFound = 0;
        
        for (const booking of bookings) {
            const slots = Array.isArray(booking.slots) 
                ? booking.slots 
                : JSON.parse(booking.slots || '[]');
            
            // Detectar duplicados
            const slotKeys = slots.map((s: any) => `${s.date}|${s.time}`);
            const uniqueSlotKeys = new Set(slotKeys);
            
            if (slotKeys.length !== uniqueSlotKeys.size) {
                duplicatesFound++;
                
                console.log(`❌ DUPLICADO ENCONTRADO:`);
                console.log(`   Booking ID: ${booking.id}`);
                console.log(`   Código: ${booking.booking_code}`);
                console.log(`   Usuario: ${JSON.parse(booking.user_info).firstName || 'N/A'}`);
                console.log(`   Total slots: ${slots.length}`);
                console.log(`   Slots únicos: ${uniqueSlotKeys.size}`);
                console.log(`   Slots duplicados:`);
                
                // Encontrar cuáles están duplicados
                const counts: { [key: string]: number } = {};
                slotKeys.forEach(key => {
                    counts[key] = (counts[key] || 0) + 1;
                });
                
                Object.entries(counts).forEach(([key, count]) => {
                    if (count > 1) {
                        const [date, time] = key.split('|');
                        console.log(`      - ${date} ${time} (aparece ${count} veces)`);
                    }
                });
                
                console.log(`   Slots raw:`, JSON.stringify(slots, null, 2));
                console.log('');
            }
        }
        
        console.log('='.repeat(70));
        console.log(`\n📈 RESUMEN:`);
        console.log(`   Bookings analizados: ${bookings.length}`);
        console.log(`   Duplicados encontrados: ${duplicatesFound}`);
        
        if (duplicatesFound === 0) {
            console.log(`   ✅ No se encontraron slots duplicados en la base de datos`);
        } else {
            console.log(`   ⚠️ Se encontraron ${duplicatesFound} bookings con slots duplicados`);
            console.log(`\n💡 SOLUCIÓN SUGERIDA:`);
            console.log(`   1. Ejecutar script de limpieza para deduplicar slots`);
            console.log(`   2. Verificar lógica de rescheduleBookingSlot en backend`);
            console.log(`   3. Confirmar que el filtro de oldSlot está funcionando correctamente`);
        }
        
        console.log('\n');
        
    } catch (error) {
        console.error('❌ ERROR durante diagnóstico:', error);
        throw error;
    }
}

// Ejecutar diagnóstico
diagnoseDuplicateSlots()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
