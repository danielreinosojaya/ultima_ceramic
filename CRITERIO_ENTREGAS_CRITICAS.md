# Criterio de Entregas CRÍTICAS

## ¿Qué es una entrega "CRÍTICA"?

Una entrega es marcada como **CRÍTICA** cuando entra en uno de estos 3 escenarios:

### 🔴 CRÍTICO 1: Vencida por NO Finalizar
- **Condición**: `scheduledDate` ha pasado Y `status === 'pending'`
- **Significado**: La fecha estimada de finalización pasó, pero la pieza aún no está completada
- **Urgencia**: MÁXIMA - El cliente está esperando desde hace días
- **Acción requerida**: Finalizar la pieza inmediatamente o comunicar retraso

**Ejemplo**:
```
Pieza: "Jarrón Azul"
Fecha programada: 15 octubre ❌ (hace 5 días)
Status: Pendiente ❌
→ 🚨 CRÍTICA: Hace 5 días (no finalizada)
```

---

### 🟠 CRÍTICO 2: A Punto de Expirar (Política de Retiro)
- **Condición**: `readyAt` existe Y días hasta (`readyAt + 60 días`) ≤ 30 días Y `status !== 'completed'`
- **Significado**: La pieza está lista pero el cliente tiene menos de 30 días para retirarla antes de que expire la política
- **Urgencia**: ALTA - El plazo de retiro se está agotando
- **Acción requerida**: Contactar al cliente para que retire la pieza pronto

**Ejemplo**:
```
Pieza: "Tazón Rojo"
Lista desde: 15 octubre
Expira: 14 diciembre ❌ (en 25 días)
Status: Lista para recoger
→ 🚨 CRÍTICA: ⏰ Retira en 25 días (límite 60 días)
```

---

### 🔴 CRÍTICO 3: Expirada por NO Retirar
- **Condición**: `readyAt` existe Y días hasta (`readyAt + 60 días`) ≤ 0 Y `status !== 'completed'`
- **Significado**: Ya pasaron los 60 días desde que la pieza quedó lista. El cliente no la retiró.
- **Urgencia**: CRÍTICA - Se aplica la política de 60 días
- **Acción requerida**: Notificar cliente de expiración o proceder según política de la tienda

**Ejemplo**:
```
Pieza: "Plato Blanco"
Lista desde: 10 septiembre
Expiración: 9 noviembre ❌ (hace 11 días)
Status: Lista para recoger
→ 🚨 CRÍTICA: 🟠 EXPIRADA: Política de 60 días vencida (no retirada)
```

---

## Visualización en la UI

### 1. Filtro rápido
```
🚨 CRÍTICAS (5)  ← Botón parpadeante en rojo
```
- Solo aparece si hay críticas
- Parpadea para llamar atención
- Al hacer clic, filtra solo entregas críticas

### 2. Badge en cada entrega
```
Jarrón Azul    ✨ LISTA PARA RECOGER    🚨 CRÍTICA ← Parpadea
```
- Aparece al lado del status
- Rojo brillante + animación de parpadeo
- Inmediatamente visible

### 3. Colores diferenciados
- **Finalización vencida**: Rojo oscuro (🔴 VENCIDA)
- **Próxima a expirar**: Naranja (⏰ Retira en X días)
- **Política expirada**: Naranja rojo (🟠 EXPIRADA)

---

## Lógica de Cálculo

```typescript
const isCritical = (delivery: Delivery): boolean => {
    const today = new Date();
    
    // CRÍTICO 1: Scheduled date passed + pending
    if (delivery.status === 'pending') {
        if (scheduledDate < today) return true;
    }
    
    // CRÍTICO 2 & 3: Ready exists + within 30 days or expired
    if (delivery.readyAt && delivery.status !== 'completed') {
        const expirationDate = readyAt + 60 days;
        const daysUntilExpiration = expirationDate - today;
        
        if (daysUntilExpiration <= 30) return true;  // Critical
    }
    
    return false;
};
```

---

## Casos de Uso

| Caso | Scheduled | Ready | Status | ¿Crítica? | Motivo |
|------|-----------|-------|--------|-----------|--------|
| A | Hace 3 días | - | Pending | ✅ SÍ | Vencida por no finalizar |
| B | Mañana | 1 oct | Ready | ✅ SÍ | Expira en 25 días |
| C | Mañana | 1 sept | Ready | ✅ SÍ | Hace 11 días expirada |
| D | En 5 días | 1 oct | Ready | ❌ NO | Falta 45 días para expirar |
| E | Mañana | - | Pending | ❌ NO | Aún en plazo |
| F | Hace 2 días | 1 oct | Completed | ❌ NO | Ya fue entregada |

---

## Flujo de Acción Recomendado

1. **Ve el filtro 🚨 CRÍTICAS** → Haz clic
2. **Ves la lista filtrada** → Todas las entregas problemáticas
3. **Para cada una, observa el badge rojo**:
   - 🔴 VENCIDA → Finaliza la pieza ASAP
   - ⏰ Retira en X días → Contacta cliente
   - 🟠 EXPIRADA → Aplica política
4. **Marca como completada** cuando se resuelva

