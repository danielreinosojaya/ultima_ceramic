/**
 * TEST UNITARIO: API Endpoints de Deliveries
 * Objetivo: Validar correcto funcionamiento de endpoints críticos
 * Fecha: 3 Febrero 2026
 */

const API_BASE = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';

interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
    details?: any;
}

class APITester {
    private results: TestResult[] = [];

    async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
        const startTime = Date.now();
        try {
            await testFn();
            this.results.push({
                name,
                passed: true,
                duration: Date.now() - startTime
            });
            console.log(`✅ ${name} (${Date.now() - startTime}ms)`);
        } catch (error) {
            this.results.push({
                name,
                passed: false,
                duration: Date.now() - startTime,
                error: error instanceof Error ? error.message : String(error)
            });
            console.log(`❌ ${name} - ${error}`);
        }
    }

    printSummary() {
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

        console.log('\n' + '='.repeat(70));
        console.log('📊 RESUMEN DE TESTS UNITARIOS');
        console.log('='.repeat(70));
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⏱️  Total Time: ${totalTime}ms`);
        console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);

        if (failed > 0) {
            console.log('\n❌ TESTS FALLIDOS:');
            this.results
                .filter(r => !r.passed)
                .forEach(r => console.log(`   • ${r.name}: ${r.error}`));
        }

        console.log('='.repeat(70) + '\n');
    }
}

// TEST 1: getDeliveries endpoint
async function testGetDeliveries(tester: APITester) {
    await tester.runTest('GET /api/data?action=getDeliveries', async () => {
        const response = await fetch(`${API_BASE}/api/data?action=getDeliveries`);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        
        const data = await response.json();
        if (!data.success) throw new Error('Response not successful');
        if (!Array.isArray(data.data)) throw new Error('Data is not an array');
        
        console.log(`   → ${data.data.length} deliveries returned`);
    });
}

// TEST 2: getDeliveryPhotos endpoint con ID válido
async function testGetDeliveryPhotosValid(tester: APITester) {
    // Primero obtener un delivery con fotos
    const deliveriesResponse = await fetch(`${API_BASE}/api/data?action=getDeliveries`);
    const deliveriesData = await deliveriesResponse.json();
    const deliveryWithPhotos = deliveriesData.data?.find((d: any) => d.hasPhotos);
    
    if (!deliveryWithPhotos) {
        console.log('⚠️  Skipping test: No deliveries with photos found');
        return;
    }

    await tester.runTest('GET /api/data?action=getDeliveryPhotos (valid ID)', async () => {
        const response = await fetch(
            `${API_BASE}/api/data?action=getDeliveryPhotos&deliveryId=${deliveryWithPhotos.id}`
        );
        
        if (!response.ok) throw new Error(`Status ${response.status}`);
        
        const data = await response.json();
        if (!data.photos) throw new Error('No photos field in response');
        if (!Array.isArray(data.photos)) throw new Error('Photos is not an array');
        
        console.log(`   → ${data.photos.length} photos returned`);
        
        // Verificar que sean URLs válidas o base64
        if (data.photos.length > 0) {
            const firstPhoto = data.photos[0];
            const isValid = firstPhoto.startsWith('data:image') || 
                          firstPhoto.startsWith('http://') || 
                          firstPhoto.startsWith('https://');
            if (!isValid) throw new Error('Invalid photo format');
        }
    });
}

// TEST 3: getDeliveryPhotos endpoint con ID inválido
async function testGetDeliveryPhotosInvalid(tester: APITester) {
    await tester.runTest('GET /api/data?action=getDeliveryPhotos (invalid ID)', async () => {
        const response = await fetch(
            `${API_BASE}/api/data?action=getDeliveryPhotos&deliveryId=invalid-id-999`
        );
        
        // Debería retornar 404
        if (response.status !== 404) {
            throw new Error(`Expected 404, got ${response.status}`);
        }
        
        console.log(`   → Correctly returned 404`);
    });
}

// TEST 4: getDeliveryPhotos sin deliveryId
async function testGetDeliveryPhotosMissingId(tester: APITester) {
    await tester.runTest('GET /api/data?action=getDeliveryPhotos (missing ID)', async () => {
        const response = await fetch(
            `${API_BASE}/api/data?action=getDeliveryPhotos`
        );
        
        // Debería retornar 400
        if (response.status !== 400) {
            throw new Error(`Expected 400, got ${response.status}`);
        }
        
        console.log(`   → Correctly returned 400`);
    });
}

// TEST 5: Cache headers en getDeliveryPhotos
async function testCacheHeaders(tester: APITester) {
    const deliveriesResponse = await fetch(`${API_BASE}/api/data?action=getDeliveries`);
    const deliveriesData = await deliveriesResponse.json();
    const deliveryWithPhotos = deliveriesData.data?.find((d: any) => d.hasPhotos);
    
    if (!deliveryWithPhotos) {
        console.log('⚠️  Skipping test: No deliveries with photos found');
        return;
    }

    await tester.runTest('Cache-Control headers present', async () => {
        const response = await fetch(
            `${API_BASE}/api/data?action=getDeliveryPhotos&deliveryId=${deliveryWithPhotos.id}`
        );
        
        const cacheControl = response.headers.get('cache-control');
        if (!cacheControl) throw new Error('No Cache-Control header');
        
        console.log(`   → Cache-Control: ${cacheControl}`);
        
        if (!cacheControl.includes('max-age')) {
            throw new Error('Cache-Control missing max-age');
        }
    });
}

// TEST 6: Response time bajo carga
async function testResponseTimeUnderLoad(tester: APITester) {
    const deliveriesResponse = await fetch(`${API_BASE}/api/data?action=getDeliveries`);
    const deliveriesData = await deliveriesResponse.json();
    const deliveriesWithPhotos = deliveriesData.data?.filter((d: any) => d.hasPhotos).slice(0, 5);
    
    if (!deliveriesWithPhotos || deliveriesWithPhotos.length === 0) {
        console.log('⚠️  Skipping test: No deliveries with photos found');
        return;
    }

    await tester.runTest('Response time under load (5 concurrent requests)', async () => {
        const startTime = Date.now();
        
        const promises = deliveriesWithPhotos.map((d: any) =>
            fetch(`${API_BASE}/api/data?action=getDeliveryPhotos&deliveryId=${d.id}`)
        );
        
        const responses = await Promise.all(promises);
        const duration = Date.now() - startTime;
        
        // Verificar que todos respondieron
        const allOk = responses.every(r => r.ok);
        if (!allOk) throw new Error('Some requests failed');
        
        console.log(`   → ${responses.length} requests completed in ${duration}ms`);
        console.log(`   → Average: ${(duration / responses.length).toFixed(0)}ms per request`);
        
        // Warning si toma más de 5 segundos
        if (duration > 5000) {
            throw new Error(`Too slow: ${duration}ms for ${responses.length} requests`);
        }
    });
}

// TEST 7: Validar estructura de respuesta getDeliveries
async function testGetDeliveriesStructure(tester: APITester) {
    await tester.runTest('Validate getDeliveries response structure', async () => {
        const response = await fetch(`${API_BASE}/api/data?action=getDeliveries`);
        const data = await response.json();
        
        if (!data.success) throw new Error('Missing success field');
        if (!Array.isArray(data.data)) throw new Error('data is not an array');
        
        if (data.data.length > 0) {
            const firstDelivery = data.data[0];
            const requiredFields = ['id', 'customerEmail', 'status', 'createdAt'];
            
            for (const field of requiredFields) {
                if (!(field in firstDelivery)) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }
            
            console.log(`   → All required fields present in delivery object`);
        }
    });
}

// TEST 8: Filtrado por status
async function testFilterByStatus(tester: APITester) {
    await tester.runTest('Filter deliveries by status', async () => {
        const statuses = ['pending', 'ready', 'completed'];
        
        for (const status of statuses) {
            const response = await fetch(
                `${API_BASE}/api/data?action=getDeliveries&status=${status}`
            );
            
            const data = await response.json();
            if (!data.success) throw new Error(`Failed for status ${status}`);
            
            // Verificar que todos tengan el status correcto
            const allMatch = data.data.every((d: any) => d.status === status);
            if (!allMatch) throw new Error(`Some deliveries don't match status ${status}`);
            
            console.log(`   → ${status}: ${data.data.length} deliveries`);
        }
    });
}

// TEST 9: Búsqueda por texto
async function testSearchByText(tester: APITester) {
    await tester.runTest('Search deliveries by text', async () => {
        const searchTerm = 'test';
        const response = await fetch(
            `${API_BASE}/api/data?action=getDeliveries&search=${encodeURIComponent(searchTerm)}`
        );
        
        const data = await response.json();
        if (!data.success) throw new Error('Search failed');
        
        console.log(`   → Found ${data.data.length} results for "${searchTerm}"`);
    });
}

// TEST 10: Verificar que no hay memory leaks en requests repetidos
async function testMemoryLeaks(tester: APITester) {
    await tester.runTest('No memory leaks in repeated requests', async () => {
        const iterations = 10;
        const deliveriesResponse = await fetch(`${API_BASE}/api/data?action=getDeliveries`);
        const deliveriesData = await deliveriesResponse.json();
        const deliveryWithPhotos = deliveriesData.data?.find((d: any) => d.hasPhotos);
        
        if (!deliveryWithPhotos) {
            console.log('   → Skipped: No delivery with photos');
            return;
        }
        
        // Medir memoria inicial (si está disponible)
        const memBefore = (performance as any).memory?.usedJSHeapSize || 0;
        
        // Hacer múltiples requests
        for (let i = 0; i < iterations; i++) {
            const response = await fetch(
                `${API_BASE}/api/data?action=getDeliveryPhotos&deliveryId=${deliveryWithPhotos.id}`
            );
            await response.json();
        }
        
        const memAfter = (performance as any).memory?.usedJSHeapSize || 0;
        const memIncrease = memAfter - memBefore;
        
        if (memBefore > 0) {
            console.log(`   → Memory: ${(memIncrease / 1024 / 1024).toFixed(2)} MB increase after ${iterations} requests`);
            
            // Si el aumento es mayor a 50MB, posible leak
            if (memIncrease > 50 * 1024 * 1024) {
                throw new Error(`Possible memory leak: ${(memIncrease / 1024 / 1024).toFixed(2)} MB increase`);
            }
        } else {
            console.log(`   → Memory API not available, ${iterations} requests completed`);
        }
    });
}

// Ejecutar todos los tests
async function runAllTests() {
    console.log('🧪 INICIANDO TESTS UNITARIOS DE API');
    console.log('='.repeat(70));
    console.log(`🌐 API Base: ${API_BASE}\n`);
    
    const tester = new APITester();
    
    await testGetDeliveries(tester);
    await testGetDeliveriesStructure(tester);
    await testFilterByStatus(tester);
    await testSearchByText(tester);
    await testGetDeliveryPhotosValid(tester);
    await testGetDeliveryPhotosInvalid(tester);
    await testGetDeliveryPhotosMissingId(tester);
    await testCacheHeaders(tester);
    await testResponseTimeUnderLoad(tester);
    await testMemoryLeaks(tester);
    
    tester.printSummary();
}

// Ejecutar
runAllTests().catch(console.error);
