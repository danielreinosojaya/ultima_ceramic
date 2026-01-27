#!/bin/bash

# ============================================================
# TEST RIGUROSO: Verificación de deduplicación en ScheduleManager
# ============================================================

echo "🧪 TEST RIGUROSO: Deduplicación en modal de asistentes"
echo "============================================================"
echo ""

PASS_COUNT=0
FAIL_COUNT=0

# Test 1: Verificar que ScheduleManager NO mapea slots como attendees
echo "📋 Test 1: Verificar corrección de booking.slots.map"
PROBLEM_LINE=$(grep -n "booking.slots.map.*attendees" components/admin/ScheduleManager.tsx 2>/dev/null | head -1)

if [ -z "$PROBLEM_LINE" ]; then
    echo "   ✅ PASS: No se mapean slots como attendees"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Aún existe mapping de slots como attendees"
    echo "   Línea problemática: $PROBLEM_LINE"
    ((FAIL_COUNT++))
fi

# Test 2: Verificar deduplicación en handleShiftClick
echo ""
echo "📋 Test 2: Verificar deduplicación en handleShiftClick"
DEDUP_LINE=$(grep -n "uniqueBookingsMap.has(b.id)" components/admin/ScheduleManager.tsx 2>/dev/null | head -1)

if [ -n "$DEDUP_LINE" ]; then
    echo "   ✅ PASS: Deduplicación por ID implementada en handleShiftClick"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Falta deduplicación en handleShiftClick"
    ((FAIL_COUNT++))
fi

# Test 3: Verificar deduplicación al agregar bookings a slots
echo ""
echo "📋 Test 3: Verificar deduplicación al agregar bookings a allSlots"
SLOT_DEDUP=$(grep -n "existingSlot.bookings.some.*b.id === booking.id" components/admin/ScheduleManager.tsx 2>/dev/null | head -1)

if [ -n "$SLOT_DEDUP" ]; then
    echo "   ✅ PASS: Verificación de duplicados antes de push"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Falta verificación de duplicados en allSlots"
    ((FAIL_COUNT++))
fi

# Test 4: Verificar que generateCustomersFromBookings deduplica por ID
echo ""
echo "📋 Test 4: Verificar deduplicación en generateCustomersFromBookings"
CUSTOMER_DEDUP=$(grep -n "uniqueBookingsMap.set(booking.id" services/dataService.ts 2>/dev/null | head -1)

if [ -n "$CUSTOMER_DEDUP" ]; then
    echo "   ✅ PASS: Deduplicación por ID en generateCustomersFromBookings"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Falta deduplicación en generateCustomersFromBookings"
    ((FAIL_COUNT++))
fi

# Test 5: Verificar deduplicación de slots en backend
echo ""
echo "📋 Test 5: Verificar deduplicación de slots en backend reschedule"
BACKEND_DEDUP=$(grep -n "uniqueSlotsMap.set" api/data.ts 2>/dev/null | head -1)

if [ -n "$BACKEND_DEDUP" ]; then
    echo "   ✅ PASS: Deduplicación de slots en backend"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Falta deduplicación de slots en backend"
    ((FAIL_COUNT++))
fi

# Test 6: Verificar que BookingDetailsModal usa key correcta
echo ""
echo "📋 Test 6: Verificar key única en BookingDetailsModal"
KEY_LINE=$(grep -n 'key={attendee.bookingId}' components/admin/BookingDetailsModal.tsx 2>/dev/null | head -1)

if [ -n "$KEY_LINE" ]; then
    echo "   ✅ PASS: BookingDetailsModal usa bookingId como key"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: BookingDetailsModal no usa key única"
    ((FAIL_COUNT++))
fi

# Test 7: Build test
echo ""
echo "📋 Test 7: Verificar build sin errores"
npm run build > /tmp/build_output.txt 2>&1
BUILD_EXIT=$?

if [ $BUILD_EXIT -eq 0 ]; then
    echo "   ✅ PASS: Build exitoso"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Build falló"
    echo "   Primeros errores:"
    head -20 /tmp/build_output.txt
    ((FAIL_COUNT++))
fi

# Test 8: Verificar NO hay push directo sin verificación
echo ""
echo "📋 Test 8: Verificar NO hay push directo en allSlots"
DIRECT_PUSH=$(grep -n "allSlots.get(slotId)!.bookings.push(booking)" components/admin/ScheduleManager.tsx 2>/dev/null | wc -l)

if [ "$DIRECT_PUSH" -eq "0" ]; then
    echo "   ✅ PASS: No hay push directo sin verificación"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Aún existe push directo sin verificación ($DIRECT_PUSH instancias)"
    ((FAIL_COUNT++))
fi

# Resumen
echo ""
echo "============================================================"
echo "🎯 RESULTADOS FINALES"
echo "============================================================"
echo ""
echo "   Tests pasados: $PASS_COUNT"
echo "   Tests fallidos: $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✅ TODOS LOS TESTS PASARON"
    echo ""
    echo "📝 CAMBIOS IMPLEMENTADOS:"
    echo "   ✓ ScheduleManager: No mapea slots como attendees"
    echo "   ✓ ScheduleManager: Deduplicación en handleShiftClick"
    echo "   ✓ ScheduleManager: Verificación antes de push a allSlots"
    echo "   ✓ dataService: Deduplicación en generateCustomersFromBookings"
    echo "   ✓ Backend: Deduplicación de slots en reschedule"
    echo "   ✓ BookingDetailsModal: Key única por bookingId"
    echo "   ✓ Build: Sin errores"
    echo ""
    echo "💡 Los duplicados NO deberían aparecer más."
    exit 0
else
    echo "❌ HAY TESTS FALLIDOS - REVISAR IMPLEMENTACIÓN"
    exit 1
fi
