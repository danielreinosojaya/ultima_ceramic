#!/bin/bash

# Script para validar endpoints de Tier 1
# Prueba: Validaciones, Auditoría, Roles y Reportes

echo "=== TEST TIER 1: ENDPOINTS ===" 
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000/api/timecards"
ADMIN_CODE="ADMIN2025"

test_count=0
pass_count=0
fail_count=0

test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="$5"
    
    test_count=$((test_count + 1))
    
    echo -n "[$test_count] Testing: $name ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC} (HTTP $http_code)"
        pass_count=$((pass_count + 1))
    else
        echo -e "${RED}FAIL${NC} (Expected $expected_status, got $http_code)"
        echo "Response: $body"
        fail_count=$((fail_count + 1))
    fi
}

echo "--- TEST 1: Dashboard Access (Authenticated) ---"
test_endpoint \
    "Get Dashboard (Valid Admin Code)" \
    "GET" \
    "${BASE_URL}?action=get_admin_dashboard&adminCode=${ADMIN_CODE}" \
    "" \
    "200"

echo ""
echo "--- TEST 2: Dashboard Access (Unauthorized) ---"
test_endpoint \
    "Get Dashboard (Invalid Admin Code)" \
    "GET" \
    "${BASE_URL}?action=get_admin_dashboard&adminCode=INVALID" \
    "" \
    "403"

echo ""
echo "--- TEST 3: List Employees ---"
test_endpoint \
    "List Employees (Valid Admin)" \
    "GET" \
    "${BASE_URL}?action=list_employees&adminCode=${ADMIN_CODE}" \
    "" \
    "200"

echo ""
echo "--- TEST 4: Validation Tests ---"
# Intentar crear marcación con timestamps inválidos
test_data='{"time_in":"2025-01-01T10:00:00Z","time_out":"2025-01-01T09:00:00Z","notes":"Test inválido"}'
test_endpoint \
    "Update Timecard (time_out < time_in - should fail)" \
    "POST" \
    "${BASE_URL}?action=update_timecard&adminCode=${ADMIN_CODE}&timecardId=1" \
    "$test_data" \
    "400"

echo ""
echo "--- TEST 5: Monthly Report Generation ---"
# Generar reporte para mes actual
current_year=$(date +%Y)
current_month=$(date +%m)
test_endpoint \
    "Get Monthly Report (JSON)" \
    "GET" \
    "${BASE_URL}?action=get_monthly_report&adminCode=${ADMIN_CODE}&year=${current_year}&month=${current_month}" \
    "" \
    "200"

echo ""
echo "--- TEST 6: Monthly Report CSV Export ---"
test_endpoint \
    "Get Monthly Report (CSV)" \
    "GET" \
    "${BASE_URL}?action=get_monthly_report&adminCode=${ADMIN_CODE}&year=${current_year}&month=${current_month}&format=csv" \
    "" \
    "200"

echo ""
echo "=== SUMMARY ==="
echo "Total Tests: $test_count"
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"

if [ $fail_count -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed${NC}"
    exit 1
fi
