#!/bin/bash

# Script para ejecutar tests con servidor de desarrollo
# Fecha: 3 Febrero 2026

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║     SUITE DE TESTS CON SERVIDOR LOCAL                             ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Colores
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar si el puerto 3000 está en uso
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✅ Servidor ya está corriendo en puerto 3000${NC}"
    SERVER_STARTED=false
else
    echo -e "${YELLOW}📡 Iniciando servidor de desarrollo...${NC}"
    npm run dev:vercel > server.log 2>&1 &
    SERVER_PID=$!
    SERVER_STARTED=true
    
    echo -e "${BLUE}⏳ Esperando que el servidor esté listo...${NC}"
    
    # Esperar hasta 30 segundos para que el servidor inicie
    for i in {1..30}; do
        if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
            echo -e "${GREEN}✅ Servidor listo en http://localhost:3000${NC}"
            break
        fi
        
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Timeout esperando servidor${NC}"
            cat server.log
            exit 1
        fi
        
        sleep 1
        echo -n "."
    done
    
    echo ""
    sleep 2 # Dar tiempo adicional para que el servidor se estabilice
fi

echo ""
echo -e "${BLUE}🧪 Ejecutando tests de rendimiento...${NC}"
echo ""

# Ejecutar tests
./tests/run-performance-tests.sh

TEST_EXIT_CODE=$?

# Detener servidor si lo iniciamos nosotros
if [ "$SERVER_STARTED" = true ]; then
    echo ""
    echo -e "${YELLOW}🛑 Deteniendo servidor de desarrollo...${NC}"
    kill $SERVER_PID 2>/dev/null
    echo -e "${GREEN}✅ Servidor detenido${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                      PROCESO COMPLETADO                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"

exit $TEST_EXIT_CODE
