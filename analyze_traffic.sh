#!/bin/bash

echo "=== ANÁLISIS DE TRÁFICO API ==="
echo ""
echo "📊 Tamaño de archivos API:"
ls -lh api/*.ts | awk '{print $9, $5}'
echo ""

echo "🔍 Endpoints en data.ts:"
grep -o "case '[^']*':" api/data.ts | head -20
echo ""

echo "📡 Llamadas fetch en dataService.ts:"
grep "fetch(" services/dataService.ts | wc -l
echo ""

echo "⏱️  Componentes con polling (setInterval):"
grep -r "setInterval" components/ --include="*.tsx" | wc -l
echo ""

echo "🔄 Componentes que llaman refreshCritical:"
grep -r "refreshCritical" components/ --include="*.tsx" | wc -l
echo ""

echo "📦 Total de componentes React:"
find components/ -name "*.tsx" | wc -l
