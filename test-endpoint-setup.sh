#!/usr/bin/env bash

# 🧪 TEST: Package Renewal Emails via Endpoint
# Simula un flujo humano completo a través del endpoint real

set -e

POSTGRES_URL="postgresql://neondb_owner:npg_u3IwbrHza6iW@ep-solitary-pine-adetktsg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
TEST_EMAIL="danielreinosojaya@gmail.com"
API_URL="${API_URL:-http://localhost:3000}"  # Local o cambiar a prod

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🧪 TEST: Package Renewal Emails via Endpoint"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📧 Email: $TEST_EMAIL"
echo "🔌 API: $API_URL"
echo ""

# Función para hacer curl con POSTGRES_URL
api_call() {
    local action=$1
    local method=$2
    local body=$3
    
    curl -s \
        -X "$method" \
        -H "Content-Type: application/json" \
        -H "POSTGRES_URL: $POSTGRES_URL" \
        "${API_URL}/api/data?action=${action}" \
        -d "$body"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 1: Crear booking de prueba (via SQL directo)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Usar node/tsx para crear el booking
npx tsx << 'EOF'
import { sql } from '@vercel/postgres';

const TEST_EMAIL = 'danielreinosojaya@gmail.com';
const PACKAGE_TOTAL_CLASSES = 4;

const { rows: [existingCustomer] } = await sql`
    SELECT id FROM customers WHERE email = ${TEST_EMAIL} LIMIT 1
`;

let customerId = existingCustomer?.id;
if (!customerId) {
    const { rows: [newCust] } = await sql`
        INSERT INTO customers (first_name, last_name, email, phone, country_code, created_at)
        VALUES ('Daniel', 'Test', ${TEST_EMAIL}, '+593985813327', 'EC', NOW())
        RETURNING id
    `;
    customerId = newCust.id;
    console.log('✅ Customer creado:', customerId);
} else {
    console.log('✅ Customer existente:', customerId);
}

const { rows: [product] } = await sql`
    SELECT * FROM products 
    WHERE type = 'CLASS_PACKAGE' 
    AND is_active = true 
    LIMIT 1
`;

if (!product) {
    throw new Error('No hay paquetes activos');
}

console.log('✅ Producto:', product.name, '-', product.price);

// Crear slots para los próximos 4 días
const today = new Date();
const slots = [];
for (let i = 0; i < PACKAGE_TOTAL_CLASSES; i++) {
    const slotDate = new Date(today);
    slotDate.setDate(slotDate.getDate() + i);
    slots.push({
        date: slotDate.toISOString().split('T')[0],
        time: '10:00 AM',
        instructorId: 1,
        capacity: 20,
        paidBookingsCount: 0
    });
}

const bookingCode = `PKG-ENDPOINT-${Date.now()}`;

const { rows: [booking] } = await sql`
    INSERT INTO bookings (
        product_type, product, price, slots, user_info, 
        booking_code, is_paid, created_at
    ) VALUES (
        'CLASS_PACKAGE',
        ${JSON.stringify(product)},
        ${product.price},
        ${JSON.stringify(slots)},
        ${JSON.stringify({
            firstName: 'Daniel',
            lastName: 'Test',
            email: TEST_EMAIL,
            phone: '+593985813327',
            countryCode: 'EC'
        })},
        ${bookingCode},
        true,
        NOW()
    ) RETURNING id, booking_code
`;

console.log('✅ Booking creado:', booking.booking_code);
console.log('   ID:', booking.id);
console.log('   Slots:', slots.length);
console.log('');
console.log('🔑 GUARDA ESTOS DATOS PARA EL PRÓXIMO PASO:');
console.log('   BOOKING_ID=' + booking.id);
console.log('   BOOKING_CODE=' + booking.booking_code);
console.log('   BOOKING_EMAIL=' + TEST_EMAIL);
EOF

echo ""
echo "▶️  PRÓXIMO PASO: Ejecuta el siguiente comando para marcar clases:"
echo ""
echo "   export BOOKING_ID='<ID_del_booking_anterior>'"
echo "   export BOOKING_CODE='<CODE_anterior>'"  
echo "   source .env.local && npx tsx test-endpoint-attendance.ts"
echo ""
