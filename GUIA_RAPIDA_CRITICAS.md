# GUÍA RÁPIDA: Filtro de Entregas Críticas

## 🚨 ¿Qué es CRÍTICO?

### Escenario 1: NO Finalizada (Vencida por no hacer)
```
📋 ENTRADA SIN COMENZAR
📅 Fecha programada: 15 octubre (hace 5 días)
🔴 VENCIDA: Hace 5 días (no finalizada)
🚨 CRÍTICA ← Parpadea
```

### Escenario 2: Listo pero NO Retirado (Próximo a expirar)
```
✨ LISTA PARA RECOGER
📅 Fecha programada: 20 octubre
✨ Lista desde 20 octubre
⏰ Retira en 25 días (límite 60 días)
🚨 CRÍTICA ← Parpadea
```

### Escenario 3: Listo pero NO Retirado (YA Expirado)
```
✨ LISTA PARA RECOGER
📅 Fecha programada: 10 septiembre
✨ Lista desde 10 septiembre
🟠 EXPIRADA: Política de 60 días vencida (no retirada)
🚨 CRÍTICA ← Parpadea
```

---

## 📊 El Filtro Rápido

**En la barra de filtros ahora ves:**

```
[Todas]  [🚨 CRÍTICAS (5)]  [Pendientes]  [Completadas]  [Vencidas]
         ↑ Parpadea en rojo
         ↑ Solo aparece si hay críticas
```

Hace clic en **🚨 CRÍTICAS** para ver solo las entregas que necesitan acción inmediata.

---

## ✅ Cómo Actúan

| Filtro | Lo que muestra | Cuándo usar |
|--------|----------------|------------|
| **Todas** | 100% de entregas | General |
| **🚨 CRÍTICAS** | Solo Crítico 1, 2 o 3 | Triage rápido |
| **Pendientes** | Status = Pending | En progreso |
| **Completadas** | Status = Completed | Historial |
| **Vencidas** | Scheduled < hoy + Pending | Retrasos de finalización |

---

## 🎯 Criterio Exacto

```
CRÍTICA SI:
├─ (Scheduled < hoy) AND (status = Pending)
│  └─ Escenario: No finalizada a tiempo
│
└─ (readyAt existe) AND (ready + 60 días ≤ hoy + 30 días) AND (status ≠ Completed)
   ├─ Si ready + 60 ≤ hoy:   Expirada (hace X días)
   └─ Si ready + 60 > hoy:   Próxima a expirar (falta X días)
```

---

## 💡 Casos de Ejemplo

**Caso A: Pieza no finalizada**
```
Jarrón Azul
📅 Programada: 15-oct (PASADA)
Status: Pendiente
→ 🚨 CRÍTICA - Acción: Finalizar YA
```

**Caso B: Pieza lista, 25 días para vencer**
```
Tazón Rojo
✨ Lista: 20-oct
Expira: 19-dic (faltan 25 días)
→ 🚨 CRÍTICA - Acción: Contactar cliente
```

**Caso C: Pieza lista, hace 11 días expirada**
```
Plato Blanco
✨ Lista: 10-sep
Expiración: 9-nov (PASADA)
→ 🚨 CRÍTICA - Acción: Aplicar política
```

**Caso D: Pieza lista, 45 días para vencer**
```
Vaso Gris
✨ Lista: 1-oct
Expira: 30-dic (faltan 45 días)
→ ✅ NO CRÍTICA - Acción: Monitor
```

---

## 🔄 Flujo de Usuario

1. **Abres Entregas**
   ↓
2. **Ves el contador "🚨 CRÍTICAS (N)"** si hay problemas
   ↓
3. **Haces clic en el filtro**
   ↓
4. **Se muestra lista filtrada** (solo críticas)
   ↓
5. **Cada tarjeta tiene el badge 🚨 CRÍTICA** parpadeando
   ↓
6. **Lees el contador específico** para ver el motivo:
   - 🔴 VENCIDA → Finaliza
   - ⏰ Retira en X días → Contacta
   - 🟠 EXPIRADA → Política
   ↓
7. **Actúas** (completar, contactar, etc.)
   ↓
8. **La entrega se elimina del filtro crítico** cuando se resuelve

