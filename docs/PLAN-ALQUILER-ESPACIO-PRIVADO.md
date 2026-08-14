# Plan: Alquiler de espacio (evento privado)

**Estado:** implementado (ver changelog cliente)  
**Objetivo:** diferenciar reservas con alquiler privado del resto, bloquear solapamiento con cualquier clase, y que el admin lo gestione sin ser técnico.

---

## 1. El problema (en lenguaje simple)

Hoy una celebración / experiencia con alquiler se comporta casi como una clase más: ocupa una técnica y ~2 horas.  
Pero un **alquiler de espacio es privado**: mientras dure, **nadie** puede reservar torno, modelado ni pintado (ni clases sueltas ni paquetes).

Hay que:
1. Distinguir este tipo de reserva.
2. Bloquear el estudio completo durante el horario alquilado.
3. Dar al admin una forma **muy simple** de crear y ver estos eventos.

---

## 2. Decisión de diseño (viable)

| Decisión | Elección | Por qué |
|----------|----------|---------|
| ¿Segundo calendario? | **No** | Un solo calendario; el tipo se ve distinto |
| ¿Tipo nuevo? | **Sí → Alquiler** | Claro para el staff (“esto es espacio privado”) |
| ¿Dónde crear? | **Reserva Manual (Atención)** | Ya es el lugar donde crean reservas a mano |
| ¿Módulo aparte enorme? | **No al inicio** | Lista/filtro simple + badge en calendario |
| ¿Bloqueo | **Automático al guardar** | El admin no tiene que “bloquear horarios” aparte |

**Viabilidad:** alta. Ya existe lógica de “evento privado” (`privateEventBlocks`), pero es hardcodeada. La pasamos a **datos de la reserva**.

---

## 3. Cómo lo ve el admin (UX no técnica)

### 3.1 Crear — dentro de Reserva Manual

Al abrir **Reserva Manual**, el primer paso es elegir **qué está reservando**, con tarjetas grandes y texto claro:

1. **Clase / Paquete** (como hoy)  
2. **Experiencia personalizada** (grupo con técnica, como hoy)  
3. **Alquiler de espacio** ← nuevo  
   Subtítulo: *“Evento privado. Bloquea todo el taller mientras dure.”*

Al elegir **Alquiler**, el formulario solo muestra lo necesario (orden guiado):

| Campo | Etiqueta simple | Notas |
|-------|-----------------|-------|
| Cliente | Cliente / titular | Buscar o crear (igual que hoy) |
| Fecha | Día del evento | Calendario |
| Hora de inicio | Empieza a las | Selector |
| Duración | Cuántas horas | 2, 3, 4 o 5 (botones grandes, no input raro) |
| Fin | Termina a las | **Calculado solo** (no editable) → evita errores |
| Actividad (opcional) | ¿Harán cerámica? | Sí/No → si sí, técnica |
| Personas | Cuántas personas | Informativo / capacidad interna |
| Precio | Precio acordado | Editable |
| Notas | Notas internas | Libre |

**Mensaje fijo (siempre visible, tono amable):**  
> “Al guardar, el taller queda reservado en privado. No se podrán hacer otras clases en ese horario.”

**Antes de confirmar**, un resumen en lenguaje humano:  
> “Sábado 15 ago · 15:00–18:00 · Alquiler privado · 8 personas · $XXX”  
Botones: **Cancelar** / **Guardar alquiler**

Si hay conflicto con otra reserva:  
> “En ese horario ya hay una clase/reserva. Elige otra hora o edita la otra reserva primero.”  
(Sin jerga técnica, sin códigos.)

### 3.2 Ver / gestionar — vista simple “Alquileres”

No un CRM complejo. Un panel o pestaña:

- Lista de próximos alquileres (fecha, horario, cliente, precio).
- Acciones: Ver · Editar · Cancelar.
- En el **calendario semanal/mensual**: bloque visual distinto (ej. franja completa “Espacio privado / Alquiler”) para que el staff lo vea de un vistazo.

---

## 4. Comportamiento del sistema (regla de negocio)

Cuando existe un **Alquiler** confirmado en una ventana `[inicio → fin]`:

- Bloquea **todas** las técnicas (torno, modelado, pintura).
- Bloquea clases sueltas, paquetes, experiencias ceramic-only, etc.
- Usa la **duración real** del alquiler (no asumir 2 h fijas).
- Al cancelar el alquiler, el bloqueo desaparece solo.

Celebraciones públicas del wizard con alquiler de espacio deben usar la **misma regla** (mismo motor), para no tener dos mundos.

---

## 5. Implementación técnica (fases)

### Fase A — Modelo de datos
- Tipo / bandera clara: `SPACE_RENTAL` / `isExclusiveSpaceRental` + `rentalHours` + `endTime`.
- Guardar en booking (product / group_metadata) de forma consistente.
- Alinear tipos TS (`CUSTOM_GROUP_EXPERIENCE` vs nombres actuales).

### Fase B — Motor de disponibilidad (crítico)
- Extender `computeSlotAvailability` (y rutas espejo) para leer alquileres de BD, no solo `PRIVATE_EVENT_BLOCKS`.
- Solape por ventana real de horas.
- Misma regla en: clases, paquetes, custom experience, reserva manual, validadores admin.

### Fase C — Admin UX (Reserva Manual)
- Nueva tarjeta **Alquiler de espacio**.
- Formulario guiado + resumen + mensajes claros.
- Validación de conflicto amigable.

### Fase D — Visibilidad
- Badge / bloque en calendario.
- Lista corta “Próximos alquileres” (módulo ligero).

### Fase E — Wizard público (si aplica en el mismo release)
- Celebración con horas de espacio → crea bloque exclusivo igual que Alquiler admin.
- (Si se prefiere después, se deja explícito en changelog.)

### Fase F — Limpieza
- Migrar eventos hardcodeados de `privateEventBlocks.ts` a reservas reales cuando corresponda.
- Documentar en changelog cliente.

---

## 6. Fuera de alcance (esta entrega)

- Segundo calendario paralelo.
- Facturación avanzada específica de alquiler (más allá de precio manual).
- Rediseño completo del admin.
- Automatizar precios de fin de semana vs semana en admin (puede sugerirse, pero el admin confirma el precio).

---

## 7. Criterios de “listo”

1. Admin crea un Alquiler en &lt; 1 minuto sin ayuda técnica.  
2. En ese horario, el público **no** puede reservar ninguna técnica.  
3. En calendario admin se ve claramente como espacio privado.  
4. Cancelar el alquiler libera el horario.  
5. Documentado en `docs/CAMBIOS-UX-EXPERIENCIA-GRUPAL.md` (o doc hermano de entrega).

---

## 8. Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Olvidar alguna ruta de disponibilidad | Checklist de endpoints + prueba manual por flujo |
| Admin no entiende duración | Fin calculado automático + botones de horas |
| Confundir con Experiencia personalizada | Tarjetas con subtítulos muy distintos |
| Eventos hardcodeados vs BD | Priorizar BD; hardcode solo transición corta |

---

## 9. Orden de trabajo propuesto

1. Aprobar este plan.  
2. Fase A + B (regla de exclusividad) — sin UI fancy aún.  
3. Fase C (Reserva Manual intuitiva).  
4. Fase D (calendario + lista).  
5. Fase E (wizard celebración, si se incluye).  
6. Pruebas + changelog cliente.

---

**Pregunta de go / no-go:**  
¿Aprobamos este plan (Alquiler en Reserva Manual + bloqueo automático de todo el taller + lista/calendario simples) para empezar a implementar por fases?
