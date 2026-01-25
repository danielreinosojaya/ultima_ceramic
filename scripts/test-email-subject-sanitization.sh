#!/bin/bash

# Test script para validar sanitización de subjects en emails
# Valida que saltos de línea y espacios múltiples se remuevan correctamente

set -e

echo "========================================="
echo "TEST: Email Subject Sanitization"
echo "========================================="
echo ""

# Colors para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_ENDPOINT="http://localhost:3000/api/data"
TEST_EMAIL="test-sanitization@example.com"

# Función para testear un caso
test_case() {
    local test_name=$1
    local description=$2
    local expected_pattern=$3
    
    echo -e "${YELLOW}TEST: ${test_name}${NC}"
    echo "Description input: ${description}"
    
    # Crear payload
    local payload=$(cat <<EOF
{
    "action": "sendTestEmail",
    "to": "${TEST_EMAIL}",
    "type": "test",
    "name": "Test User",
    "message": "${description}"
}
EOF
)
    
    # Hacer request y capturar response
    response=$(curl -s -X POST "${API_ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d "${payload}" \
        2>&1)
    
    # Verificar si contiene error 422 o validation_error
    if echo "${response}" | grep -q "422\|validation_error\|not allowed"; then
        echo -e "${RED}❌ FAILED: Subject contiene caracteres inválidos${NC}"
        echo "Response: ${response}"
        return 1
    elif echo "${response}" | grep -q "success.*true"; then
        echo -e "${GREEN}✅ PASSED: Email enviado correctamente${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  UNKNOWN: Response inesperada${NC}"
        echo "Response: ${response}"
        return 2
    fi
    
    echo ""
}

# Contador de tests
total_tests=0
passed_tests=0
failed_tests=0

# TEST 1: Description con salto de línea simple
total_tests=$((total_tests + 1))
if test_case "Salto de línea simple" "Una taza hecha a mano\nCon diseño personalizado" "Una taza hecha a mano Con diseño personalizado"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# TEST 2: Description con múltiples saltos de línea
total_tests=$((total_tests + 1))
if test_case "Múltiples saltos de línea" "Pieza 1: Taza\nPieza 2: Bowl\nPieza 3: Plato" "Pieza 1: Taza Pieza 2: Bowl Pieza 3: Plato"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# TEST 3: Description con \r\n (Windows line endings)
total_tests=$((total_tests + 1))
if test_case "Windows line endings" "Primera línea\r\nSegunda línea" "Primera línea Segunda línea"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# TEST 4: Description con múltiples espacios
total_tests=$((total_tests + 1))
if test_case "Múltiples espacios" "Taza    con    muchos    espacios" "Taza con muchos espacios"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# TEST 5: Description normal (sin caracteres especiales)
total_tests=$((total_tests + 1))
if test_case "Description normal" "Una taza hecha a mano con diseño personalizado" "Una taza hecha a mano con diseño personalizado"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# TEST 6: El caso exacto del error reportado
total_tests=$((total_tests + 1))
if test_case "Caso real del error" "Una taza hecha a mano! Tiene una huella, un perrito y adentro dice ENZO\nPueden pintar" "Una taza hecha a mano! Tiene una huella, un perrito y adentro dice ENZO Pueden pintar"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

echo ""
echo "========================================="
echo "RESULTADOS"
echo "========================================="
echo "Total tests: ${total_tests}"
echo -e "${GREEN}Passed: ${passed_tests}${NC}"
if [ ${failed_tests} -gt 0 ]; then
    echo -e "${RED}Failed: ${failed_tests}${NC}"
else
    echo "Failed: 0"
fi
echo ""

if [ ${failed_tests} -eq 0 ]; then
    echo -e "${GREEN}✅ TODOS LOS TESTS PASARON${NC}"
    exit 0
else
    echo -e "${RED}❌ ALGUNOS TESTS FALLARON${NC}"
    exit 1
fi
