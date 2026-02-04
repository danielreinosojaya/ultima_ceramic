/**
 * TEST LOCAL AUTOMÁTICO: Performance de Delivery Photos
 * Inicia servidor, ejecuta tests, detiene servidor
 * Fecha: 3 Febrero 2026
 */

import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import type { ChildProcess } from 'child_process';

const API_BASE = 'http://localhost:3000';

interface TestResults {
    totalRequests: number;
    duplicates: number;
    avgTime: number;
    maxTime: number;
    totalData: number;
    errors: number;
    details: string[];
}

let serverProcess: ChildProcess | null = null;

async function startServer(): Promise<boolean> {
    console.log('🚀 Iniciando servidor de desarrollo...\n');
    
    return new Promise((resolve) => {
        serverProcess = spawn('npm', ['run', 'dev'], {
            cwd: process.cwd(),
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let output = '';
        
        serverProcess.stdout.on('data', (data) => {
            output += data.toString();
            if (output.includes('Local:') || output.includes('localhost:3000')) {
                console.log('✅ Servidor iniciado en http://localhost:3000\n');
                setTimeout(() => resolve(true), 2000); // Esperar 2s adicionales
            }
        });

        serverProcess.stderr.on('data', (data) => {
            const text = data.toString();
            if (text.includes('EADDRINUSE')) {
                console.log('✅ Servidor ya estaba corriendo\n');
                resolve(true);
            }
        });

        // Timeout de 30 segundos
        setTimeout(() => {
            if (!output.includes('localhost:3000')) {
                console.log('⚠️  Timeout esperando servidor, intentando continuar...\n');
                resolve(false);
            }
        }, 30000);
    });
}

function stopServer() {
    if (serverProcess) {
        console.log('\n🛑 Deteniendo servidor...');
        serverProcess.kill('SIGTERM');
        serverProcess = null;
    }
}

async function waitForServer(maxAttempts: number = 10): Promise<boolean> {
    console.log('⏳ Esperando que servidor esté listo...');
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(`${API_BASE}/api/data?action=getDeliveries`);
            if (response.ok || response.status === 500) { // 500 también cuenta (servidor responde)
                console.log('✅ Servidor respondiendo\n');
                return true;
            }
        } catch (e) {
            // Servidor aún no responde
        }
        await sleep(1000);
        process.stdout.write('.');
    }
    
    console.log('\n❌ Servidor no responde después de 10 intentos\n');
    return false;
}

async function runPerformanceTest(): Promise<TestResults> {
    const requestLog: Map<string, number> = new Map();
    const times: number[] = [];
    const details: string[] = [];
    let totalData = 0;
    let errors = 0;

    console.log('🧪 Ejecutando tests de rendimiento...\n');

    try {
        // 1. Obtener deliveries
        console.log('📦 Test 1: Obtener deliveries');
        const start1 = Date.now();
        const res1 = await fetch(`${API_BASE}/api/data?action=getDeliveries`);
        const time1 = Date.now() - start1;
        times.push(time1);
        
        const text1 = await res1.text();
        totalData += new Blob([text1]).size;
        const data1 = JSON.parse(text1);
        
        const deliveries = data1.data || [];
        const withPhotos = deliveries.filter((d: any) => d.hasPhotos).slice(0, 20);
        
        console.log(`   ✅ ${deliveries.length} deliveries, ${withPhotos.length} con fotos - ${time1}ms\n`);
        details.push(`Initial load: ${time1}ms, ${deliveries.length} deliveries`);

        if (withPhotos.length === 0) {
            console.log('⚠️  No hay deliveries con fotos para probar\n');
            return {
                totalRequests: times.length,
                duplicates: 0,
                avgTime: time1,
                maxTime: time1,
                totalData,
                errors: 0,
                details
            };
        }

        // 2. Cargar fotos de primeras 10
        console.log('📷 Test 2: Carga inicial de 10 deliveries');
        const first10 = withPhotos.slice(0, Math.min(10, withPhotos.length));
        
        for (let i = 0; i < first10.length; i++) {
            const delivery = first10[i];
            const url = `${API_BASE}/api/data?action=getDeliveryPhotos&deliveryId=${delivery.id}`;
            
            requestLog.set(url, (requestLog.get(url) || 0) + 1);
            
            const start = Date.now();
            try {
                const photoRes = await fetch(url);
                const photoTime = Date.now() - start;
                times.push(photoTime);
                
                const photoText = await photoRes.text();
                totalData += new Blob([photoText]).size;
                const photoData = JSON.parse(photoText);
                
                const count = requestLog.get(url) || 1;
                const isDup = count > 1 ? ' (DUPLICADO)' : '';
                console.log(`   ${i + 1}. ${delivery.id.substring(0, 8)}... ${photoData.photos?.length || 0} fotos - ${photoTime}ms${isDup}`);
            } catch (e) {
                errors++;
                console.log(`   ${i + 1}. ❌ Error: ${e}`);
            }
            
            await sleep(150);
        }

        console.log('');
        details.push(`Loaded ${first10.length} photo sets`);

        // 3. Re-cargar las primeras 3 (simular re-render)
        console.log('🔄 Test 3: Re-render (re-cargar primeras 3)');
        const rerender = first10.slice(0, Math.min(3, first10.length));
        
        for (let i = 0; i < rerender.length; i++) {
            const delivery = rerender[i];
            const url = `${API_BASE}/api/data?action=getDeliveryPhotos&deliveryId=${delivery.id}`;
            
            requestLog.set(url, (requestLog.get(url) || 0) + 1);
            
            const start = Date.now();
            try {
                const photoRes = await fetch(url);
                const photoTime = Date.now() - start;
                times.push(photoTime);
                
                const photoText = await photoRes.text();
                totalData += new Blob([photoText]).size;
                
                const count = requestLog.get(url) || 1;
                console.log(`   ${i + 1}. ${delivery.id.substring(0, 8)}... ${photoTime}ms (cargado ${count} veces)`);
            } catch (e) {
                errors++;
                console.log(`   ${i + 1}. ❌ Error: ${e}`);
            }
        }

        console.log('');
        details.push(`Re-render test: ${rerender.length} deliveries`);

    } catch (e) {
        console.error('❌ Error en tests:', e);
        errors++;
    }

    // Calcular duplicados
    const duplicates = Array.from(requestLog.values()).reduce(
        (sum, count) => sum + (count > 1 ? count - 1 : 0), 
        0
    );

    return {
        totalRequests: times.length,
        duplicates,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length || 0,
        maxTime: Math.max(...times, 0),
        totalData,
        errors,
        details
    };
}

function printReport(results: TestResults) {
    console.log('═'.repeat(70));
    console.log('📊 RESULTADOS FINALES');
    console.log('═'.repeat(70));
    console.log(`📡 Total Requests: ${results.totalRequests}`);
    console.log(`❌ Requests Duplicados: ${results.duplicates}`);
    console.log(`⏰ Tiempo Promedio: ${results.avgTime.toFixed(0)}ms`);
    console.log(`🔼 Tiempo Máximo: ${results.maxTime.toFixed(0)}ms`);
    console.log(`📦 Datos Transferidos: ${(results.totalData / 1024).toFixed(0)} KB`);
    console.log(`🚨 Errores: ${results.errors}`);

    console.log('\n' + '═'.repeat(70));
    console.log('🔍 ANÁLISIS DE PROBLEMAS');
    console.log('═'.repeat(70));

    let issues = 0;

    if (results.duplicates > 0) {
        console.log(`❌ CRÍTICO: ${results.duplicates} requests duplicados`);
        console.log(`   → Problema en guards de useEffect o IntersectionObserver`);
        issues++;
    } else {
        console.log(`✅ Sin requests duplicados`);
    }

    if (results.avgTime > 500) {
        console.log(`⚠️  WARNING: Tiempo promedio alto (${results.avgTime.toFixed(0)}ms)`);
        issues++;
    } else {
        console.log(`✅ Tiempo promedio aceptable (${results.avgTime.toFixed(0)}ms)`);
    }

    if (results.totalData > 2 * 1024 * 1024) {
        console.log(`⚠️  WARNING: Transferencia alta (${(results.totalData / 1024 / 1024).toFixed(2)} MB)`);
        issues++;
    } else {
        console.log(`✅ Transferencia aceptable (${(results.totalData / 1024).toFixed(0)} KB)`);
    }

    if (results.errors > 0) {
        console.log(`❌ ${results.errors} errores encontrados`);
        issues++;
    } else {
        console.log(`✅ Sin errores`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`\n${issues === 0 ? '✅' : '⚠️'}  ${issues} problemas identificados`);
    console.log(`${issues === 0 ? '🎉' : '🔧'} ${issues === 0 ? 'Performance óptimo!' : 'Optimización necesaria'}\n`);

    return issues;
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     TEST AUTOMÁTICO DE RENDIMIENTO - DELIVERY PHOTOS          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Verificar si servidor ya está corriendo
    let serverStarted = false;
    try {
        await fetch(API_BASE);
        console.log('✅ Servidor ya está corriendo\n');
        serverStarted = false; // No lo iniciamos nosotros
    } catch (e) {
        // Servidor no está corriendo, iniciarlo
        const started = await startServer();
        if (!started) {
            console.log('❌ No se pudo iniciar el servidor');
            process.exit(1);
        }
        serverStarted = true;
        
        // Esperar que responda
        const ready = await waitForServer();
        if (!ready) {
            stopServer();
            process.exit(1);
        }
    }

    // Ejecutar tests
    const results = await runPerformanceTest();

    // Mostrar resultados
    const issues = printReport(results);

    // Detener servidor si lo iniciamos
    if (serverStarted) {
        stopServer();
    }

    // Exit code basado en resultados
    process.exit(issues > 0 ? 1 : 0);
}

// Manejar Ctrl+C
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Test interrumpido por usuario');
    stopServer();
    process.exit(130);
});

main().catch((error) => {
    console.error('❌ Error fatal:', error);
    stopServer();
    process.exit(1);
});
