/**
 * TEST DE RENDIMIENTO: DeliveryListWithFilters Photo Loading
 * Objetivo: Medir y detectar problemas de rendimiento en carga de fotos
 * Fecha: 3 Febrero 2026
 */

interface TestMetrics {
    testName: string;
    totalRequests: number;
    uniqueRequests: number;
    duplicateRequests: number;
    totalTime: number;
    averageRequestTime: number;
    maxRequestTime: number;
    minRequestTime: number;
    dataTransferred: number;
    requestsPerSecond: number;
    errors: string[];
}

interface RequestLog {
    url: string;
    timestamp: number;
    duration: number;
    size: number;
    status: number;
}

const API_BASE = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';

class PerformanceMonitor {
    private requestLogs: RequestLog[] = [];
    private startTime: number = 0;
    private errors: string[] = [];

    start() {
        this.requestLogs = [];
        this.errors = [];
        this.startTime = Date.now();
        console.log('🚀 Performance Monitor iniciado');
    }

    logRequest(url: string, duration: number, size: number, status: number) {
        this.requestLogs.push({
            url,
            timestamp: Date.now(),
            duration,
            size,
            status
        });
    }

    logError(error: string) {
        this.errors.push(error);
    }

    getMetrics(testName: string): TestMetrics {
        const totalTime = Date.now() - this.startTime;
        const uniqueUrls = new Set(this.requestLogs.map(r => r.url));
        
        const durations = this.requestLogs.map(r => r.duration);
        const sizes = this.requestLogs.map(r => r.size);

        return {
            testName,
            totalRequests: this.requestLogs.length,
            uniqueRequests: uniqueUrls.size,
            duplicateRequests: this.requestLogs.length - uniqueUrls.size,
            totalTime,
            averageRequestTime: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
            maxRequestTime: Math.max(...durations, 0),
            minRequestTime: Math.min(...durations, Infinity),
            dataTransferred: sizes.reduce((a, b) => a + b, 0),
            requestsPerSecond: (this.requestLogs.length / totalTime) * 1000,
            errors: this.errors
        };
    }

    printReport(metrics: TestMetrics) {
        console.log('\n' + '='.repeat(70));
        console.log(`📊 REPORTE DE RENDIMIENTO: ${metrics.testName}`);
        console.log('='.repeat(70));
        console.log(`⏱️  Tiempo Total: ${metrics.totalTime}ms`);
        console.log(`📡 Total Requests: ${metrics.totalRequests}`);
        console.log(`✅ Requests Únicos: ${metrics.uniqueRequests}`);
        console.log(`❌ Requests Duplicados: ${metrics.duplicateRequests}`);
        console.log(`⚡ Requests/segundo: ${metrics.requestsPerSecond.toFixed(2)}`);
        console.log(`⏰ Tiempo Promedio por Request: ${metrics.averageRequestTime.toFixed(2)}ms`);
        console.log(`🔼 Tiempo Máximo: ${metrics.maxRequestTime.toFixed(2)}ms`);
        console.log(`🔽 Tiempo Mínimo: ${metrics.minRequestTime.toFixed(2)}ms`);
        console.log(`📦 Datos Transferidos: ${(metrics.dataTransferred / 1024).toFixed(2)} KB`);
        
        if (metrics.errors.length > 0) {
            console.log(`\n🚨 ERRORES (${metrics.errors.length}):`);
            metrics.errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
        }

        // Análisis de problemas
        console.log('\n' + '-'.repeat(70));
        console.log('🔍 ANÁLISIS DE PROBLEMAS:');
        console.log('-'.repeat(70));

        if (metrics.duplicateRequests > 0) {
            console.log(`❌ CRÍTICO: ${metrics.duplicateRequests} requests duplicados detectados`);
            console.log(`   → Indica problema de re-renders o falta de guards en useEffect`);
        }

        if (metrics.averageRequestTime > 500) {
            console.log(`⚠️  WARNING: Tiempo promedio alto (${metrics.averageRequestTime.toFixed(0)}ms)`);
            console.log(`   → Considerar compresión de imágenes o CDN`);
        }

        if (metrics.totalRequests > 100) {
            console.log(`⚠️  WARNING: Demasiados requests (${metrics.totalRequests})`);
            console.log(`   → Implementar pagination más agresiva o virtualización`);
        }

        if (metrics.dataTransferred > 5 * 1024 * 1024) {
            console.log(`❌ CRÍTICO: Transferencia excesiva (${(metrics.dataTransferred / 1024 / 1024).toFixed(2)} MB)`);
            console.log(`   → Imágenes deben ser comprimidas en servidor`);
        }

        console.log('='.repeat(70) + '\n');
    }
}

// Simular fetch con monitoreo
async function monitoredFetch(monitor: PerformanceMonitor, url: string): Promise<Response> {
    const startTime = Date.now();
    try {
        const response = await fetch(url);
        const duration = Date.now() - startTime;
        const clone = response.clone();
        const text = await clone.text();
        const size = new Blob([text]).size;
        
        monitor.logRequest(url, duration, size, response.status);
        
        if (!response.ok) {
            monitor.logError(`Request failed: ${url} - Status ${response.status}`);
        }
        
        return response;
    } catch (error) {
        const duration = Date.now() - startTime;
        monitor.logRequest(url, duration, 0, 0);
        monitor.logError(`Network error: ${url} - ${error}`);
        throw error;
    }
}

// TEST 1: Carga inicial de deliveries con fotos
async function testInitialLoad(monitor: PerformanceMonitor) {
    console.log('\n🧪 TEST 1: Carga inicial de deliveries');
    
    // Simular getDeliveries
    const deliveriesUrl = `${API_BASE}/api/data?action=getDeliveries`;
    const deliveriesResponse = await monitoredFetch(monitor, deliveriesUrl);
    const deliveriesData = await deliveriesResponse.json();
    
    const deliveries = deliveriesData.data || [];
    console.log(`   📦 ${deliveries.length} deliveries cargadas`);
    
    // Filtrar solo las que tienen fotos
    const deliveriesWithPhotos = deliveries.filter((d: any) => d.hasPhotos);
    console.log(`   📷 ${deliveriesWithPhotos.length} deliveries con fotos`);
    
    // Simular carga de fotos para las primeras 10 (como hace el componente)
    const first10 = deliveriesWithPhotos.slice(0, 10);
    console.log(`   🎯 Cargando fotos para primeras ${first10.length} deliveries...`);
    
    for (const delivery of first10) {
        const photoUrl = `${API_BASE}/api/data?action=getDeliveryPhotos&deliveryId=${delivery.id}`;
        await monitoredFetch(monitor, photoUrl);
        // Simular delay del componente
        await new Promise(resolve => setTimeout(resolve, 150));
    }
}

// TEST 2: Scroll y lazy loading
async function testScrollLazyLoad(monitor: PerformanceMonitor) {
    console.log('\n🧪 TEST 2: Scroll y lazy loading de fotos');
    
    const deliveriesUrl = `${API_BASE}/api/data?action=getDeliveries`;
    const deliveriesResponse = await monitoredFetch(monitor, deliveriesUrl);
    const deliveriesData = await deliveriesResponse.json();
    
    const deliveries = deliveriesData.data || [];
    const deliveriesWithPhotos = deliveries.filter((d: any) => d.hasPhotos);
    
    // Simular scroll progresivo: cargar de 5 en 5
    const batchSize = 5;
    const batches = Math.ceil(Math.min(deliveriesWithPhotos.length, 20) / batchSize);
    
    console.log(`   📜 Simulando ${batches} batches de scroll...`);
    
    for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = start + batchSize;
        const batch = deliveriesWithPhotos.slice(start, end);
        
        console.log(`   → Batch ${i + 1}: Cargando ${batch.length} fotos`);
        
        // Cargar fotos del batch en paralelo (simula IntersectionObserver)
        await Promise.all(
            batch.map(async (delivery: any) => {
                const photoUrl = `${API_BASE}/api/data?action=getDeliveryPhotos&deliveryId=${delivery.id}`;
                await monitoredFetch(monitor, photoUrl);
            })
        );
        
        // Simular tiempo de scroll
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

// TEST 3: Búsqueda con filtros
async function testSearchAndFilter(monitor: PerformanceMonitor) {
    console.log('\n🧪 TEST 3: Búsqueda y filtros');
    
    // Test diferentes filtros
    const filters = [
        { status: 'pending' },
        { status: 'ready' },
        { search: 'test' },
        { dateFrom: '2026-01-01', dateTo: '2026-02-03' }
    ];
    
    for (const filter of filters) {
        console.log(`   🔍 Aplicando filtro: ${JSON.stringify(filter)}`);
        
        const params = new URLSearchParams({ action: 'getDeliveries', ...filter });
        const url = `${API_BASE}/api/data?${params}`;
        await monitoredFetch(monitor, url);
        
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

// TEST 4: Cambio de páginas
async function testPagination(monitor: PerformanceMonitor) {
    console.log('\n🧪 TEST 4: Paginación');
    
    const deliveriesUrl = `${API_BASE}/api/data?action=getDeliveries`;
    const deliveriesResponse = await monitoredFetch(monitor, deliveriesUrl);
    const deliveriesData = await deliveriesResponse.json();
    
    const deliveries = deliveriesData.data || [];
    const deliveriesWithPhotos = deliveries.filter((d: any) => d.hasPhotos);
    
    const itemsPerPage = 15;
    const totalPages = Math.ceil(deliveriesWithPhotos.length / itemsPerPage);
    const pagesToTest = Math.min(totalPages, 5); // Probar hasta 5 páginas
    
    console.log(`   📄 Probando ${pagesToTest} páginas (${itemsPerPage} items/página)`);
    
    for (let page = 1; page <= pagesToTest; page++) {
        console.log(`   → Página ${page}`);
        
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageDeliveries = deliveriesWithPhotos.slice(start, end);
        
        // Cargar fotos de la página
        for (const delivery of pageDeliveries) {
            const photoUrl = `${API_BASE}/api/data?action=getDeliveryPhotos&deliveryId=${delivery.id}`;
            await monitoredFetch(monitor, photoUrl);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

// TEST 5: Re-renders y re-fetching
async function testReRenders(monitor: PerformanceMonitor) {
    console.log('\n🧪 TEST 5: Re-renders y re-fetching (stress test)');
    
    const deliveriesUrl = `${API_BASE}/api/data?action=getDeliveries`;
    const deliveriesResponse = await monitoredFetch(monitor, deliveriesUrl);
    const deliveriesData = await deliveriesResponse.json();
    
    const deliveries = deliveriesData.data || [];
    const deliveriesWithPhotos = deliveries.filter((d: any) => d.hasPhotos).slice(0, 5);
    
    console.log(`   🔄 Simulando 3 re-renders con las mismas ${deliveriesWithPhotos.length} deliveries`);
    
    for (let render = 1; render <= 3; render++) {
        console.log(`   → Re-render ${render}`);
        
        // Cargar las mismas fotos (debería usar cache)
        for (const delivery of deliveriesWithPhotos) {
            const photoUrl = `${API_BASE}/api/data?action=getDeliveryPhotos&deliveryId=${delivery.id}`;
            await monitoredFetch(monitor, photoUrl);
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

// Ejecutar todos los tests
async function runAllTests() {
    console.log('🔬 INICIANDO SUITE DE TESTS DE RENDIMIENTO');
    console.log('='.repeat(70));
    
    const allMetrics: TestMetrics[] = [];
    
    // Test 1: Carga inicial
    const monitor1 = new PerformanceMonitor();
    monitor1.start();
    await testInitialLoad(monitor1);
    const metrics1 = monitor1.getMetrics('Carga Inicial');
    allMetrics.push(metrics1);
    monitor1.printReport(metrics1);
    
    // Test 2: Scroll lazy loading
    const monitor2 = new PerformanceMonitor();
    monitor2.start();
    await testScrollLazyLoad(monitor2);
    const metrics2 = monitor2.getMetrics('Scroll y Lazy Loading');
    allMetrics.push(metrics2);
    monitor2.printReport(metrics2);
    
    // Test 3: Búsqueda y filtros
    const monitor3 = new PerformanceMonitor();
    monitor3.start();
    await testSearchAndFilter(monitor3);
    const metrics3 = monitor3.getMetrics('Búsqueda y Filtros');
    allMetrics.push(metrics3);
    monitor3.printReport(metrics3);
    
    // Test 4: Paginación
    const monitor4 = new PerformanceMonitor();
    monitor4.start();
    await testPagination(monitor4);
    const metrics4 = monitor4.getMetrics('Paginación');
    allMetrics.push(metrics4);
    monitor4.printReport(metrics4);
    
    // Test 5: Re-renders
    const monitor5 = new PerformanceMonitor();
    monitor5.start();
    await testReRenders(monitor5);
    const metrics5 = monitor5.getMetrics('Re-renders y Cache');
    allMetrics.push(metrics5);
    monitor5.printReport(metrics5);
    
    // Resumen final
    printFinalSummary(allMetrics);
}

function printFinalSummary(allMetrics: TestMetrics[]) {
    console.log('\n' + '█'.repeat(70));
    console.log('📋 RESUMEN EJECUTIVO - TODOS LOS TESTS');
    console.log('█'.repeat(70));
    
    const totalRequests = allMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalDuplicates = allMetrics.reduce((sum, m) => sum + m.duplicateRequests, 0);
    const totalData = allMetrics.reduce((sum, m) => sum + m.dataTransferred, 0);
    const totalTime = allMetrics.reduce((sum, m) => sum + m.totalTime, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errors.length, 0);
    
    console.log(`\n📊 ESTADÍSTICAS GLOBALES:`);
    console.log(`   • Total Requests: ${totalRequests}`);
    console.log(`   • Total Duplicados: ${totalDuplicates} (${((totalDuplicates/totalRequests)*100).toFixed(1)}%)`);
    console.log(`   • Total Datos: ${(totalData / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   • Tiempo Total: ${(totalTime / 1000).toFixed(2)} segundos`);
    console.log(`   • Total Errores: ${totalErrors}`);
    
    console.log(`\n🎯 PROBLEMAS CRÍTICOS IDENTIFICADOS:`);
    let issuesFound = 0;
    
    if (totalDuplicates > 0) {
        console.log(`   ❌ ${totalDuplicates} requests duplicados - OPTIMIZACIÓN NECESARIA`);
        issuesFound++;
    }
    
    if (totalRequests > 200) {
        console.log(`   ⚠️  ${totalRequests} requests totales - CONSIDERAR VIRTUALIZACIÓN`);
        issuesFound++;
    }
    
    if (totalData > 10 * 1024 * 1024) {
        console.log(`   ❌ ${(totalData / 1024 / 1024).toFixed(2)} MB transferidos - COMPRESIÓN NECESARIA`);
        issuesFound++;
    }
    
    const avgRequestTime = allMetrics.reduce((sum, m) => sum + m.averageRequestTime, 0) / allMetrics.length;
    if (avgRequestTime > 500) {
        console.log(`   ⚠️  Tiempo promedio ${avgRequestTime.toFixed(0)}ms - MEJORAR PERFORMANCE`);
        issuesFound++;
    }
    
    if (issuesFound === 0) {
        console.log(`   ✅ No se detectaron problemas críticos`);
    }
    
    console.log('\n' + '█'.repeat(70));
    console.log(`\n✅ Suite de tests completada - ${issuesFound} problemas encontrados\n`);
}

// Ejecutar
runAllTests().catch(console.error);
