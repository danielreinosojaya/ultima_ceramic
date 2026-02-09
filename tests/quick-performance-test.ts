/**
 * TEST SIMPLIFICADO: Medición de performance en producción
 * Ejecuta contra el ambiente de Vercel
 * Fecha: 3 Febrero 2026
 */

// Usar la URL de producción de Vercel
const PRODUCTION_URL = process.env.TEST_URL || 'https://ceramicalma.vercel.app';

interface Metrics {
    totalRequests: number;
    duplicates: number;
    avgTime: number;
    maxTime: number;
    totalData: number;
    errors: number;
}

async function measurePerformance(): Promise<Metrics> {
    const requestLog: Map<string, number> = new Map();
    const times: number[] = [];
    let totalData = 0;
    let errors = 0;

    console.log('🔬 Iniciando medición de performance...\n');

    // 1. Obtener lista de deliveries
    console.log('📦 Step 1: Obteniendo deliveries...');
    const start1 = Date.now();
    try {
        const response = await fetch(`${PRODUCTION_URL}/api/data?action=getDeliveries`);
        const time1 = Date.now() - start1;
        times.push(time1);
        
        const text = await response.text();
        totalData += new Blob([text]).size;
        
        // Verificar si es JSON válido
        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.log(`   ❌ Respuesta no es JSON válido`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Respuesta (primeros 200 chars): ${text.substring(0, 200)}`);
            throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
        }
        
        const deliveries = data.data || [];
        const withPhotos = deliveries.filter((d: any) => d.hasPhotos);
        
        console.log(`   ✅ ${deliveries.length} deliveries (${withPhotos.length} con fotos) - ${time1}ms`);
        
        // 2. Cargar fotos de las primeras 10
        console.log('\n📷 Step 2: Cargando fotos de primeras 10 deliveries...');
        const first10 = withPhotos.slice(0, 10);
        
        for (let i = 0; i < first10.length; i++) {
            const delivery = first10[i];
            const url = `${PRODUCTION_URL}/api/data?action=getDeliveryPhotos&deliveryId=${delivery.id}`;
            
            // Contar duplicados
            requestLog.set(url, (requestLog.get(url) || 0) + 1);
            
            const start = Date.now();
            try {
                const photoResponse = await fetch(url);
                const photoTime = Date.now() - start;
                times.push(photoTime);
                
                const photoText = await photoResponse.text();
                totalData += new Blob([photoText]).size;
                
                console.log(`   ${i + 1}. Delivery ${delivery.id.substring(0, 8)}... - ${photoTime}ms`);
            } catch (e) {
                errors++;
                console.log(`   ${i + 1}. ❌ Error: ${e}`);
            }
            
            await new Promise(r => setTimeout(r, 150)); // Simular delay del componente
        }
        
        // 3. Simular scroll (cargar 5 más)
        console.log('\n📜 Step 3: Simulando scroll (5 deliveries más)...');
        const next5 = withPhotos.slice(10, 15);
        
        for (let i = 0; i < next5.length; i++) {
            const delivery = next5[i];
            const url = `${PRODUCTION_URL}/api/data?action=getDeliveryPhotos&deliveryId=${delivery.id}`;
            
            requestLog.set(url, (requestLog.get(url) || 0) + 1);
            
            const start = Date.now();
            try {
                const photoResponse = await fetch(url);
                const photoTime = Date.now() - start;
                times.push(photoTime);
                
                const photoText = await photoResponse.text();
                totalData += new Blob([photoText]).size;
                
                console.log(`   ${i + 1}. Delivery ${delivery.id.substring(0, 8)}... - ${photoTime}ms`);
            } catch (e) {
                errors++;
                console.log(`   ${i + 1}. ❌ Error: ${e}`);
            }
        }
        
        // 4. Re-cargar las primeras 3 (simular re-render)
        console.log('\n🔄 Step 4: Simulando re-render (re-cargar primeras 3)...');
        const rerender = first10.slice(0, 3);
        
        for (let i = 0; i < rerender.length; i++) {
            const delivery = rerender[i];
            const url = `${PRODUCTION_URL}/api/data?action=getDeliveryPhotos&deliveryId=${delivery.id}`;
            
            requestLog.set(url, (requestLog.get(url) || 0) + 1);
            
            const start = Date.now();
            try {
                const photoResponse = await fetch(url);
                const photoTime = Date.now() - start;
                times.push(photoTime);
                
                const photoText = await photoResponse.text();
                totalData += new Blob([photoText]).size;
                
                console.log(`   ${i + 1}. Delivery ${delivery.id.substring(0, 8)}... - ${photoTime}ms (${requestLog.get(url)} veces cargado)`);
            } catch (e) {
                errors++;
                console.log(`   ${i + 1}. ❌ Error: ${e}`);
            }
        }
        
    } catch (e) {
        console.error('❌ Error en test:', e);
        errors++;
    }

    // Calcular métricas
    const totalRequests = times.length;
    const duplicates = Array.from(requestLog.values()).reduce((sum, count) => sum + (count > 1 ? count - 1 : 0), 0);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    return {
        totalRequests,
        duplicates,
        avgTime,
        maxTime,
        totalData,
        errors
    };
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║       TEST DE RENDIMIENTO - DELIVERY PHOTOS (PRODUCCIÓN)      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`\n🌐 URL: ${PRODUCTION_URL}\n`);

    const metrics = await measurePerformance();

    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESULTADOS');
    console.log('═'.repeat(70));
    console.log(`📡 Total Requests: ${metrics.totalRequests}`);
    console.log(`❌ Requests Duplicados: ${metrics.duplicates}`);
    console.log(`⏰ Tiempo Promedio: ${metrics.avgTime.toFixed(0)}ms`);
    console.log(`🔼 Tiempo Máximo: ${metrics.maxTime.toFixed(0)}ms`);
    console.log(`📦 Datos Transferidos: ${(metrics.totalData / 1024).toFixed(0)} KB`);
    console.log(`🚨 Errores: ${metrics.errors}`);

    console.log('\n' + '═'.repeat(70));
    console.log('🔍 ANÁLISIS');
    console.log('═'.repeat(70));

    let issues = 0;

    if (metrics.duplicates > 0) {
        console.log(`❌ CRÍTICO: ${metrics.duplicates} requests duplicados detectados`);
        console.log(`   → Optimización necesaria en guards de useEffect`);
        issues++;
    } else {
        console.log(`✅ Sin requests duplicados`);
    }

    if (metrics.avgTime > 500) {
        console.log(`⚠️  WARNING: Tiempo promedio alto (${metrics.avgTime.toFixed(0)}ms)`);
        console.log(`   → Considerar compresión de imágenes`);
        issues++;
    } else {
        console.log(`✅ Tiempo promedio aceptable (${metrics.avgTime.toFixed(0)}ms)`);
    }

    if (metrics.totalData > 2 * 1024 * 1024) {
        console.log(`⚠️  WARNING: Transferencia alta (${(metrics.totalData / 1024 / 1024).toFixed(2)} MB)`);
        console.log(`   → Implementar compresión server-side`);
        issues++;
    } else {
        console.log(`✅ Transferencia de datos aceptable (${(metrics.totalData / 1024).toFixed(0)} KB)`);
    }

    if (metrics.errors > 0) {
        console.log(`❌ ${metrics.errors} errores encontrados`);
        issues++;
    } else {
        console.log(`✅ Sin errores`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`\n${issues === 0 ? '✅' : '⚠️'}  ${issues} problemas identificados\n`);
}

main().catch(console.error);
