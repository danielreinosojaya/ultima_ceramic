#!/bin/bash

echo "🧪 Probando endpoint DELETE /api/deleteCustomer"
echo "================================================"
echo ""
echo "📡 Enviando petición a http://localhost:3001/api/deleteCustomer"
echo "📦 Body: {\"customerId\": \"test-customer-id\"}"
echo ""

curl -X DELETE http://localhost:3001/api/deleteCustomer \
  -H "Content-Type: application/json" \
  -d '{"customerId": "test-customer-id"}' \
  -w "\n\n" \
  -v

echo ""
echo "✅ Prueba completada"
