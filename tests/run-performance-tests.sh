#!/bin/bash

# Script maestro para ejecutar todos los tests de rendimiento
# Fecha: 3 Febrero 2026

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║     SUITE COMPLETA DE TESTS DE RENDIMIENTO - DELIVERY PHOTOS      ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Timestamp para el reporte
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="test-reports"
REPORT_FILE="$REPORT_DIR/performance_report_$TIMESTAMP.txt"

# Crear directorio de reportes si no existe
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}📁 Reportes se guardarán en: $REPORT_FILE${NC}"
echo ""

# Función para ejecutar test y capturar resultado
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}🧪 Ejecutando: $test_name${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Ejecutar test y capturar output
    if eval "$test_command" 2>&1 | tee -a "$REPORT_FILE"; then
        echo -e "${GREEN}✅ $test_name completado${NC}"
    else
        echo -e "${RED}❌ $test_name falló${NC}"
    fi
    
    echo ""
    echo "" >> "$REPORT_FILE"
}

# Verificar que Node esté instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi

# Verificar que npx esté disponible
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx no está disponible${NC}"
    exit 1
fi

# Iniciar reporte
{
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║          REPORTE DE TESTS DE RENDIMIENTO - DELIVERY PHOTOS        ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Fecha: $(date)"
    echo "Sistema: $(uname -a)"
    echo "Node Version: $(node --version)"
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
} > "$REPORT_FILE"

# TEST 1: Tests Unitarios de API
run_test "Tests Unitarios de API" \
    "npx ts-node tests/api-unit-tests.test.ts"

# Esperar entre tests
sleep 2

# TEST 2: Tests de Rendimiento
run_test "Tests de Rendimiento de Carga de Fotos" \
    "npx ts-node tests/performance-delivery-photos.test.ts"

# Finalizar reporte
{
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    echo "Tests completados: $(date)"
    echo ""
} >> "$REPORT_FILE"

# Resumen final
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                      TESTS COMPLETADOS                             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Reporte completo guardado en:${NC}"
echo -e "   $REPORT_FILE"
echo ""

# Mostrar resumen de problemas encontrados
echo -e "${YELLOW}🔍 Analizando resultados...${NC}"
echo ""

# Contar problemas críticos en el reporte
CRITICAL_COUNT=$(grep -c "CRÍTICO" "$REPORT_FILE" || echo "0")
WARNING_COUNT=$(grep -c "WARNING" "$REPORT_FILE" || echo "0")
ERROR_COUNT=$(grep -c "❌" "$REPORT_FILE" || echo "0")

if [ "$CRITICAL_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ $CRITICAL_COUNT problemas CRÍTICOS encontrados${NC}"
fi

if [ "$WARNING_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNING_COUNT warnings encontrados${NC}"
fi

if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ $ERROR_COUNT errores encontrados${NC}"
fi

if [ "$CRITICAL_COUNT" -eq 0 ] && [ "$WARNING_COUNT" -eq 0 ] && [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ No se encontraron problemas críticos${NC}"
fi

echo ""
echo -e "${BLUE}📖 Para ver el reporte completo:${NC}"
echo -e "   cat $REPORT_FILE"
echo ""
echo -e "${BLUE}🔧 Para aplicar optimizaciones basadas en estos resultados:${NC}"
echo -e "   Revisa el reporte y aplica los fixes sugeridos"
echo ""

# Abrir reporte automáticamente si está en macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${BLUE}📄 Abriendo reporte...${NC}"
    open "$REPORT_FILE" || cat "$REPORT_FILE"
fi
