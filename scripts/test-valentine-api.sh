#!/bin/bash
# Test script para validar el API de San Valentín
# Ejecutar con: bash scripts/test-valentine-api.sh

BASE_URL="${1:-http://localhost:3000}"

echo "🧪 Testing Valentine API at $BASE_URL"
echo "========================================"

# Test 1: Register a new inscription
echo ""
echo "📝 Test 1: Crear nueva inscripción..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/valentine?action=register" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "María García Test",
    "birthDate": "1990-05-15",
    "phone": "0991234567",
    "email": "test.valentine@example.com",
    "workshop": "florero_arreglo_floral",
    "participants": 2,
    "paymentProofUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  }')

echo "Response: $REGISTER_RESPONSE"

# Extract ID from response
REGISTRATION_ID=$(echo $REGISTER_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$REGISTRATION_ID" ]; then
    echo "❌ Failed to create registration"
    exit 1
else
    echo "✅ Created registration with ID: $REGISTRATION_ID"
fi

# Test 2: List registrations
echo ""
echo "📋 Test 2: Listar inscripciones..."
LIST_RESPONSE=$(curl -s "$BASE_URL/api/valentine?action=list")
echo "Response: $(echo $LIST_RESPONSE | head -c 500)..."

if echo $LIST_RESPONSE | grep -q '"success":true'; then
    echo "✅ List endpoint working"
else
    echo "❌ List endpoint failed"
fi

# Test 3: Get stats
echo ""
echo "📊 Test 3: Obtener estadísticas..."
STATS_RESPONSE=$(curl -s "$BASE_URL/api/valentine?action=stats")
echo "Response: $STATS_RESPONSE"

if echo $STATS_RESPONSE | grep -q '"success":true'; then
    echo "✅ Stats endpoint working"
else
    echo "❌ Stats endpoint failed"
fi

# Test 4: Get single registration
echo ""
echo "🔍 Test 4: Obtener inscripción por ID..."
GET_RESPONSE=$(curl -s "$BASE_URL/api/valentine?action=get&id=$REGISTRATION_ID")
echo "Response: $GET_RESPONSE"

if echo $GET_RESPONSE | grep -q '"success":true'; then
    echo "✅ Get single endpoint working"
else
    echo "❌ Get single endpoint failed"
fi

# Test 5: Update status to confirmed
echo ""
echo "✓ Test 5: Confirmar inscripción..."
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/valentine?action=updateStatus" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$REGISTRATION_ID\",
    \"status\": \"confirmed\",
    \"adminUser\": \"test-admin\"
  }")

echo "Response: $UPDATE_RESPONSE"

if echo $UPDATE_RESPONSE | grep -q '"confirmed"'; then
    echo "✅ Status update working"
else
    echo "❌ Status update failed"
fi

# Test 6: Filter by workshop
echo ""
echo "🔎 Test 6: Filtrar por taller..."
FILTER_RESPONSE=$(curl -s "$BASE_URL/api/valentine?action=list&workshop=florero_arreglo_floral")
echo "Response: $(echo $FILTER_RESPONSE | head -c 300)..."

if echo $FILTER_RESPONSE | grep -q '"success":true'; then
    echo "✅ Filter by workshop working"
else
    echo "❌ Filter by workshop failed"
fi

# Test 7: Delete registration (cleanup)
echo ""
echo "🗑️ Test 7: Eliminar inscripción de prueba..."
DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/valentine?action=delete&id=$REGISTRATION_ID")
echo "Response: $DELETE_RESPONSE"

if echo $DELETE_RESPONSE | grep -q '"deleted":true'; then
    echo "✅ Delete endpoint working"
else
    echo "❌ Delete endpoint failed"
fi

echo ""
echo "========================================"
echo "🎉 Valentine API tests completed!"
echo ""
echo "📌 URLs para probar manualmente:"
echo "   - Formulario público: $BASE_URL/sanvalentin"
echo "   - Admin panel: $BASE_URL/?admin=true (tab 'San Valentín')"
