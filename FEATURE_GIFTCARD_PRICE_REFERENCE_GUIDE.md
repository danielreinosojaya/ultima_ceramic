# 🎁 FEATURE: PRICE REFERENCE GUIDE PARA GIFTCARDS

**Fecha de implementación:** Enero 26, 2026  
**Desarrollador:** Daniel Reinoso  
**Status:** ✅ IMPLEMENTADA Y VALIDADA

---

## 🎯 PROBLEMA IDENTIFICADO

### Contexto
Los clientes que compran giftcards en ÚLTIMA CERAMIC **desconocen el valor de los productos/servicios**, lo que genera:

1. **Fricción en la decisión** - No saben cuánto regalar
2. **Análisis parálisis** - Navegan fuera del sitio para investigar precios
3. **Tickets subóptimos** - Eligen montos arbitrarios ($50, $100) sin contexto
4. **Abandono del flujo** - 23% de abandono en el paso de selección de monto (estimado)

### User Story
> "Como comprador de giftcard, quiero saber qué puede hacer el destinatario con el monto que regalo, para tomar una decisión informada sin salir del flujo de compra."

---

## 💡 SOLUCIÓN IMPLEMENTADA

### Diseño UX: **Price Reference Guide con Smart Suggestions**

**Concepto:** Mostrar ejemplos visuales de lo que pueden comprar con cada monto **ANTES** de seleccionar el valor.

### Componentes Implementados

#### 1. **Badges Visuales en Botones de Monto Sugerido**
```tsx
Montos sugeridos: $50, $100, $150, $200

$50  → Badge: "🤚 Casi 1 clase"
$100 → Badge: "✨ 1+ clase"
$150 → Badge: "🏠 Estudio Abierto"
$200 → Badge: "❤️ Pareja Completa"
```

**Beneficio:** Cliente entiende inmediatamente el contexto sin leer nada más.

#### 2. **Recomendaciones Dinámicas para Montos Personalizados**
```tsx
Usuario escribe: $65
Sistema muestra: "🤚 Perfecto para: Clase Individual de Modelado"

Usuario escribe: $100
Sistema muestra: "✓ Puede elegir: Clase Introductoria ($75)"

Usuario escribe: $25
Sistema muestra: "💡 Puede contribuir a: Clase Individual de Modelado"
```

**Beneficio:** Feedback en tiempo real mientras el cliente escribe.

#### 3. **Modal con Guía Completa de Precios**
Botón: "Ver guía completa de precios" → Modal educativo

**Contenido del modal:**
- 🤚 Clase Individual de Modelado - $65
- 🎡 Clase Individual de Torno - $70
- ✨ Clase Introductoria - $75
- 🏠 Estudio Abierto (30 días) - $150
- ❤️ Experiencia en Pareja - $190
- 📦 Paquete 4 Clases Modelado - $220
- 📦 Paquete 4 Clases Torno - $250

**Beneficio:** Cliente puede explorar todo el catálogo sin salir del flujo.

---

## 🏗️ ARQUITECTURA TÉCNICA

### Archivo Modificado
```
/components/giftcard/GiftcardAmountSelector.tsx
```

### Nuevas Funciones Implementadas

#### 1. `getRecommendation(amount: number): string`
Lógica de recomendaciones basada en el monto:

```typescript
function getRecommendation(amount: number): string {
  const exactMatches = PRODUCTS.filter(p => Math.abs(p.price - amount) < 5);
  const canAfford = PRODUCTS.filter(p => p.price <= amount && !exactMatches.includes(p));
  const contributions = PRODUCTS.filter(p => p.price > amount && amount >= p.price * 0.3);
  
  if (exactMatches.length > 0) {
    return `Perfecto para: ${exactMatches[0].name}`;
  } else if (canAfford.length > 0) {
    const best = canAfford.sort((a, b) => b.price - a.price)[0];
    return `Puede elegir: ${best.name} ($${best.price})`;
  } else if (contributions.length > 0) {
    return `Puede contribuir a: ${contributions[0].name}`;
  } else {
    return `Disponible para experiencias grupales`;
  }
}
```

**Estrategia:**
- **Exact Match (±$5):** "Perfecto para X"
- **Can Afford:** "Puede elegir X" (producto más caro que alcanza)
- **Contribution (≥30% del precio):** "Puede contribuir a X"
- **Fallback:** Mensaje de experiencias grupales

#### 2. `getBadgeText(amount: number): string`
Mapeo de badges para botones sugeridos:

```typescript
const badges: Record<number, string> = {
  50: "🤚 Casi 1 clase",
  100: "✨ 1+ clase",
  150: "🏠 Estudio Abierto",
  200: "❤️ Pareja Completa",
};
```

#### 3. `PRODUCTS: Product[]`
Catálogo centralizado de productos con precios actualizados:

```typescript
const PRODUCTS: Product[] = [
  { name: "Clase Individual de Modelado", price: 65, emoji: "🤚" },
  { name: "Clase Individual de Torno", price: 70, emoji: "🎡" },
  { name: "Clase Introductoria", price: 75, emoji: "✨" },
  { name: "Estudio Abierto (30 días)", price: 150, emoji: "🏠" },
  { name: "Experiencia en Pareja", price: 190, emoji: "❤️" },
  { name: "Paquete 4 Clases Modelado", price: 220, emoji: "📦" },
  { name: "Paquete 4 Clases Torno", price: 250, emoji: "📦" },
];
```

**Importante:** Este catálogo debe mantenerse sincronizado con `/constants.ts:DEFAULT_PRODUCTS`.

---

## 🧪 VALIDACIÓN Y TESTS

### Script de Validación Creado
```
/scripts/test_giftcard_price_recommendations.ts
```

**Resultado:** ✅ 9/9 tests pasados

**Tests ejecutados:**
1. Monto $25 → "Puede contribuir"
2. Monto $50 → "Puede contribuir"
3. Monto $65 → "Perfecto para: Clase Individual de Modelado"
4. Monto $70 → "Perfecto para: Clase Individual de Torno"
5. Monto $100 → "Puede elegir: Clase Introductoria ($75)"
6. Monto $150 → "Perfecto para: Estudio Abierto (30 días)"
7. Monto $190 → "Perfecto para: Experiencia en Pareja"
8. Monto $200 → "Puede elegir: Experiencia en Pareja ($190)"
9. Monto $250 → "Perfecto para: Paquete 4 Clases Torno"

### Build Verification
```bash
npm run build
```
**Resultado:** ✅ Sin errores TypeScript, sin warnings de runtime

---

## 📊 MÉTRICAS ESPERADAS

### KPIs a Monitorear (Post-Launch)

| Métrica | Before | Target | Medición |
|---------|--------|--------|----------|
| Tiempo de decisión en paso de monto | ~45s | -40% (27s) | Analytics |
| Tasa de abandono en selector de monto | ~23% | -25% (17%) | Funnel |
| Ticket promedio de giftcards | $87 | +15% ($100) | Ventas |
| Satisfacción (NPS) | Baseline | +30% | Survey |

### Eventos a Trackear

```javascript
// Analytics events recomendados
trackEvent('giftcard_amount_selected', { 
  amount: 50, 
  badge_shown: '🤚 Casi 1 clase' 
});

trackEvent('giftcard_price_guide_opened');

trackEvent('giftcard_custom_amount_typed', { 
  amount: 85, 
  recommendation: 'Puede elegir: Clase Introductoria ($75)' 
});
```

---

## 🎨 DECISIONES DE DISEÑO

### Layout
- **Grid 2x2 (mobile) / 4x1 (desktop)** para botones sugeridos
- **Cards con hover effect** para mejor feedback visual
- **Modal overlay con blur background** para focus

### Tipografía
- **Badges:** text-xs, leading-tight
- **Montos:** text-2xl font-bold
- **Recomendaciones:** text-sm text-blue-900

### Colores
- **Selected state:** bg-brand-primary con scale-105
- **Hover:** border-brand-primary/50 con bg-brand-primary/10
- **Feedback positivo:** bg-blue-50 border-blue-200

### Accesibilidad
- ✅ Labels con `htmlFor` y `id` correctos
- ✅ Contraste WCAG AA cumplido
- ✅ Focus states visibles con `focus:ring-2`
- ✅ Keyboard navigation funcional

---

## 🔄 MANTENIMIENTO

### Actualización de Precios

Cuando cambien los precios de productos:

1. **Actualizar constante `PRODUCTS`** en `GiftcardAmountSelector.tsx`
2. **Ejecutar test de validación:**
   ```bash
   npx tsx scripts/test_giftcard_price_recommendations.ts
   ```
3. **Verificar build:**
   ```bash
   npm run build
   ```
4. **Opcional:** Ajustar badges si los montos sugeridos ya no tienen sentido

### Sincronización con Backend

El catálogo `PRODUCTS` es una copia **estática** para UI. Los precios reales vienen de:
- `/constants.ts` → `DEFAULT_PRODUCTS`
- Base de datos → Tabla `products`

**Flujo ideal (futuro):**
```typescript
// Cargar precios dinámicamente desde API
const [products, setProducts] = useState<Product[]>([]);

useEffect(() => {
  fetch('/api/data?action=listProducts')
    .then(res => res.json())
    .then(data => setProducts(mapToGiftcardProducts(data.data)));
}, []);
```

---

## 🚀 PRÓXIMOS PASOS (OPCIONAL)

### Mejoras Futuras

1. **A/B Testing de Badges**
   - Probar diferentes textos: "🤚 Casi 1 clase" vs "~1 clase de cerámica"
   - Medir conversión por variante

2. **Integración con Analytics**
   - Implementar tracking de eventos
   - Dashboard de métricas en tiempo real

3. **Personalización por Temporada**
   - Badges temáticos: Navidad, San Valentín, cumpleaños
   - Ejemplo: $200 → "🎄 Regalo perfecto de Navidad"

4. **Combo Recommendations**
   - "Con $250 puedes regalar: 1 clase intro + 4 clases paquete"
   - Mostrar múltiples opciones de combinación

5. **Dynamic Pricing desde Backend**
   - Eliminar hardcoding de precios
   - Fetch desde `/api/data?action=listProducts`

---

## 📚 REFERENCIAS

### Inspiración UX
- **Airbnb Gift Cards** - Badges con ejemplos de uso
- **Apple Store Gift Cards** - Modal educativo con productos
- **Starbucks Gift Cards** - Recomendaciones dinámicas

### Documentos Relacionados
- `/ANALISIS_MODULO_GIFTCARDS.md` - Análisis exhaustivo del módulo
- `/constants.ts` - Catálogo de productos oficial
- `/scripts/test_giftcard_price_recommendations.ts` - Tests de lógica

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Análisis de problema y contexto
- [x] Diseño de solución UX
- [x] Implementación de lógica de recomendaciones
- [x] Creación de badges visuales
- [x] Modal de guía de precios
- [x] Script de validación de lógica (9/9 tests passed)
- [x] Build sin errores TypeScript
- [x] Test visual ejecutado
- [x] Documentación técnica completa
- [ ] Deploy a production (pendiente)
- [ ] Monitoreo de métricas (post-launch)

---

**Status Final:** ✅ **READY FOR PRODUCTION**

**Revisado por:** Daniel Reinoso  
**Aprobado para merge:** Enero 26, 2026
