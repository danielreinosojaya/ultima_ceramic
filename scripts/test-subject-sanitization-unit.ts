#!/usr/bin/env tsx

/**
 * Unit test para validar sanitización de subjects
 * Ejecutar: npx tsx scripts/test-subject-sanitization-unit.ts
 */

// Función de sanitización (misma lógica que en emailService.ts)
function sanitizeSubject(input: string): string {
    return input.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
}

interface TestCase {
    name: string;
    input: string;
    expected: string;
}

const testCases: TestCase[] = [
    {
        name: "Salto de línea simple (\\n)",
        input: "Una taza hecha a mano\nCon diseño personalizado",
        expected: "Una taza hecha a mano Con diseño personalizado"
    },
    {
        name: "Múltiples saltos de línea",
        input: "Pieza 1: Taza\nPieza 2: Bowl\nPieza 3: Plato",
        expected: "Pieza 1: Taza Pieza 2: Bowl Pieza 3: Plato"
    },
    {
        name: "Windows line endings (\\r\\n)",
        input: "Primera línea\r\nSegunda línea\r\nTercera línea",
        expected: "Primera línea Segunda línea Tercera línea"
    },
    {
        name: "Múltiples espacios",
        input: "Taza    con    muchos    espacios",
        expected: "Taza con muchos espacios"
    },
    {
        name: "Mix de saltos de línea y espacios",
        input: "Taza\n\n   con   \n  espacios  raros",
        expected: "Taza con espacios raros"
    },
    {
        name: "Caso real del error reportado",
        input: "Una taza hecha a mano! Tiene una huella, un perrito y adentro dice ENZO\nPueden pintar",
        expected: "Una taza hecha a mano! Tiene una huella, un perrito y adentro dice ENZO Pueden pintar"
    },
    {
        name: "String normal sin caracteres especiales",
        input: "Una descripción normal sin problemas",
        expected: "Una descripción normal sin problemas"
    },
    {
        name: "Solo saltos de línea",
        input: "\n\n\n",
        expected: ""
    },
    {
        name: "Espacios al inicio y final",
        input: "   Taza con espacios   ",
        expected: "Taza con espacios"
    },
    {
        name: "Emojis y caracteres especiales válidos",
        input: "✨ ¡Taza hermosa!\n🎨 Pintada a mano",
        expected: "✨ ¡Taza hermosa! 🎨 Pintada a mano"
    }
];

// Ejecutar tests
console.log("=========================================");
console.log("TEST: Subject Sanitization Unit Tests");
console.log("=========================================\n");

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
    const result = sanitizeSubject(testCase.input);
    const success = result === testCase.expected;
    
    if (success) {
        console.log(`✅ TEST ${index + 1} PASSED: ${testCase.name}`);
        passed++;
    } else {
        console.log(`❌ TEST ${index + 1} FAILED: ${testCase.name}`);
        console.log(`   Input:    "${testCase.input.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`);
        console.log(`   Expected: "${testCase.expected}"`);
        console.log(`   Got:      "${result}"`);
        failed++;
    }
});

console.log("\n=========================================");
console.log("RESULTADOS");
console.log("=========================================");
console.log(`Total tests: ${testCases.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed === 0) {
    console.log("\n🎉 TODOS LOS TESTS PASARON");
    process.exit(0);
} else {
    console.log("\n⚠️  ALGUNOS TESTS FALLARON");
    process.exit(1);
}
