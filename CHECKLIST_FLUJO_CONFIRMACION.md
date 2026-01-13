# ✅ CHECKLIST: FLUJO DE CONFIRMACIÓN - VERIFICACIÓN VISUAL

## Verificación de la Página de Confirmación

### Sección 1: Encabezado (Header)
- [ ] Ícono de checkmark verde
- [ ] Texto "¡Pre-Reserva Confirmada!"
- [ ] Subtítulo explicativo
- [ ] Alineado al centro

### Sección 2: RESUMEN DE RESERVA (NUEVA) ⭐
- [ ] **"Resumen de tu Reserva"** con ícono 📋
- [ ] Borde azul/primario distinguido
- [ ] Fondo blanco con sombra
- [ ] **Experiencia**: Nombre del producto en grande
- [ ] **Fecha**: Día completo (Miércoles, 15 de enero de 2026)
- [ ] **Hora**: Rango horario (11:00 - 13:00)
- [ ] **Participantes**: Número y palabra "personas"
- [ ] **Duración**: 2 horas
- [ ] **Técnica**: Si está disponible (Torno, Modelado, etc.)
- [ ] **PRECIO DESTACADO**:
  - [ ] Fondo gradiente azul claro
  - [ ] Texto GRANDE y OSADO: $XXX.XX
  - [ ] Subtotal desglosado
  - [ ] IVA desglosado (18%)
  - [ ] Descuento si aplica (en verde)

### Sección 3: Código de Pre-Reserva
- [ ] Título: "Tu Código de Pre-Reserva"
- [ ] Código en MONOSPACE font
- [ ] Botón "Copiar" al lado
- [ ] Al hacer click en copiar → cambiar a "✓ Copiado"
- [ ] Instrucción clara debajo

### Sección 4: Advertencias (Timing)
- [ ] Bloque amarillo: "Pre-reserva válida por 2 horas"
- [ ] Hora de expiración específica
- [ ] Bloque azul: "Tolerancia el día de la clase"
- [ ] Texto sobre 15 minutos de tolerancia

### Sección 5: Datos para Transferencia (Bancos)
- [ ] Título con ícono bancario
- [ ] **Mínimo 2 bancos mostrados**
- [ ] Por cada banco:
  - [ ] Nombre del banco (ej: "Banco Pichincha")
  - [ ] Titular de cuenta
  - [ ] Número de cuenta en MONOSPACE
  - [ ] Tipo de cuenta
  - [ ] RUC
  - [ ] Botón "Copiar Nº" (para número de cuenta)
- [ ] Opción para ver más bancos si hay >2

### Sección 6: Giftcard (Si aplica)
- [ ] Si NO hay giftcard → No mostrar esta sección
- [ ] Si SÍ hay giftcard:
  - [ ] Ícono 🎁
  - [ ] "Pago Parcial con Giftcard"
  - [ ] Precio total
  - [ ] Monto cubierto por giftcard (en verde)
  - [ ] Monto aún adeudado (prominent)
  - [ ] Si saldo es cero → "✓ Reserva completamente pagada"
  - [ ] Si saldo > cero → Instrucción sobre pago restante

### Sección 7: ¿Qué Sigue Ahora?
- [ ] Título "¿Qué sigue ahora?"
- [ ] Lista numerada (1, 2, 3, 4):

**Paso 1: Realiza el pago**
- [ ] Monto ESPECÍFICO: "Realiza el pago de $XXX.XX"
- [ ] Instrucción: "Transfiere exactamente $XXX.XX"
- [ ] **Importante**: "Incluye tu código C-ALMA-XXXXXXX en la descripción"
- [ ] Ratón numérico con ícono de billete/dinero

**Paso 2: Envía código + comprobante**
- [ ] "Envía tu código + comprobante por WhatsApp"
- [ ] Instrucción clara: Código + foto del comprobante
- [ ] Ratón numérico con ícono WhatsApp

**Paso 3: Validación interna**
- [ ] Título claro
- [ ] Descripción: Equipo revisor
- [ ] Ratón numérico con ícono de check

**Paso 4: Confirmación final**
- [ ] Título claro
- [ ] Descripción: Correo electrónico confirmatorio
- [ ] Ratón numérico con ícono de email

### Sección 8: Botón WhatsApp Principal
- [ ] Color verde WhatsApp (#25D366)
- [ ] Ícono WhatsApp + Texto: "Enviar Código y Comprobante por WhatsApp"
- [ ] Ancho completo (en móvil)
- [ ] Efecto hover (cambiar opacidad o scale)
- [ ] Texto debajo: "Haz click arriba para abrir WhatsApp con tu código prellenado"

### Sección 9: Modal de Bancos (Si hay >2)
- [ ] Al hacer click en "Ver todas las X cuentas":
  - [ ] Abre modal/popup
  - [ ] Muestra TODOS los bancos
  - [ ] Cada uno con misma estructura
  - [ ] Botón para cerrar

### Sección 10: Botones de Acción Finales
- [ ] "Volver al Inicio" (botón gris/secundario)
- [ ] "Ver mis Clases" (si está habilitado y feature flag activo)
- [ ] En móvil: botones apilados
- [ ] En desktop: lado a lado

---

## Pruebas de Casos de Uso

### Caso 1: Reserva Simple (Sin Giftcard)
- [ ] Pre-reserva $50 torno 1 persona
- [ ] NO debe mostrar sección giftcard
- [ ] Precio claro: $50.00
- [ ] Detalles: 1 persona, técnica torno

### Caso 2: Reserva Grupal
- [ ] Pre-reserva $100 para 2 personas
- [ ] Precio claro: $100.00
- [ ] Detalles: 2 personas, técnica (si aplica)

### Caso 3: Con Giftcard Parcial
- [ ] Pre-reserva $50, giftcard $20
- [ ] Mostrar sección giftcard
- [ ] "Cubierto por Giftcard: $20.00"
- [ ] "Aún debes pagar: $30.00"
- [ ] Monto en rojo/naranja (urgencia)

### Caso 4: Con Giftcard Completo
- [ ] Pre-reserva $50, giftcard $50+
- [ ] Mostrar sección giftcard
- [ ] "✓ ¡Reserva completamente pagada!"
- [ ] NO debe pedir más pago
- [ ] Botón WhatsApp NO debe ser principal

### Caso 5: Responsive Móvil
- [ ] Ancho máximo respetado
- [ ] Botones 100% width
- [ ] Código copiable fácil de tocar
- [ ] Texto legible (no cutoff)
- [ ] Espaciado adecuado

### Caso 6: Responsive Desktop
- [ ] Layout centrado
- [ ] Máximo 600px ancho
- [ ] Hover effects en botones
- [ ] Flujo vertical claro

---

## Verificación de Copy (Textos)

### Tono de Voz
- [ ] Amable pero profesional
- [ ] Claro y sin jerga
- [ ] Acciones explícitas (no ambiguas)
- [ ] Urgencia communicada (2 horas) pero no pánico

### Falta de Ambigüedad
- [ ] ¿El cliente sabe cuánto pagar? **SÍ** - Número grande $XXX.XX
- [ ] ¿El cliente sabe QUÉ está comprando? **SÍ** - Resumen completo
- [ ] ¿El cliente sabe CUÁNDO expira? **SÍ** - Hora específica
- [ ] ¿El cliente sabe QUÉ HACER? **SÍ** - 4 pasos numerados
- [ ] ¿El cliente sabe CÓMO PAGARÁ? **SÍ** - Datos bancarios claros
- [ ] ¿El cliente sabe DÓNDE ENVIAR EL COMPROBANTE? **SÍ** - WhatsApp destacado

---

## Performance & Accesibilidad

- [ ] Página carga en <2s
- [ ] No hay elementos que "salten" después de cargar
- [ ] Colores tienen suficiente contraste (WCAG AA)
- [ ] Botones tienen tamaño toque adecuado (>44px)
- [ ] Código monoespace es fácil de copiar
- [ ] Links abren en nueva pestaña (si aplica)

---

## Testing en Navegadores

- [ ] Chrome (Desktop)
- [ ] Safari (Desktop)
- [ ] Firefox (Desktop)
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)
- [ ] Samsung Internet (Android)

---

## ✅ ANTES DE PASAR A PRODUCCIÓN

- [ ] Build sin errores: `npm run build`
- [ ] No hay console errors
- [ ] No hay console warnings relevantes
- [ ] URLs de WhatsApp están encodeadas correctamente
- [ ] Montos se formatean con formatPrice() correctamente
- [ ] Fechas se formatean en español correctamente
- [ ] Código de pre-reserva es copyable
- [ ] Modal de bancos se abre/cierra correctamente
- [ ] No hay hardcodes (toda info viene de props/booking)

---

## 📸 SCREENSHOT ESPERADO

```
╔════════════════════════════════════════╗
║  ✓ ¡Pre-Reserva Confirmada!           ║
║  Tu cupo está guardado...              ║
╚════════════════════════════════════════╝

┌────────────────────────────────────────┐
│ 📋 Resumen de tu Reserva              │
├────────────────────────────────────────┤
│ Experiencia: Torno Alfarero           │
│ 📅 Miércoles, 15 enero 2026           │
│ 🕐 11:00 - 13:00                      │
│ 👥 2 personas                         │
│ ⏱️ 2 horas                            │
│ 🎨 Torno                              │
├────────────────────────────────────────┤
│    💰 MONTO A PAGAR: $100.00           │
│    Subtotal: $84.74                   │
│    IVA (18%): $15.26                  │
└────────────────────────────────────────┘

C-ALMA-05LP3WTM [📋]
Guarda este código...

⏰ Pre-reserva válida por 2 horas
   Expira a las: 19:17

[Bancos + datos]

¿Qué sigue ahora?
1. Realiza el pago de $100.00
   Transfiere exactamente...
   
2. Envía tu código + comprobante...

3. Validación interna...

4. Recibe tu confirmación final...

[🟢 ENVIAR POR WHATSAPP - FULL WIDTH]
[VOLVER AL INICIO]
```

---

## 🎯 OBJETIVO FINAL

Cuando el cliente vea esta página:

✅ NO hay preguntas sin respuesta
✅ NO hay confusión sobre el precio
✅ NO hay dudas sobre qué hacer
✅ NO hay sorpresas
✅ TODO está claramente visible
✅ Experiencia de CLASE MUNDIAL
