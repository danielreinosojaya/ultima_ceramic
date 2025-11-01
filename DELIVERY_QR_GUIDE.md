# 📱 Sistema de Seguimiento de Entregas - QR

## ✅ Implementación Completada

### 🎯 URL QR Correcta
```
www.ceramicalma.com/?clientMode=delivery
```

---

## 🚀 Cómo Funciona

### Cliente
1. **Escanea QR** con teléfono
2. **Se abre formulario** de seguimiento directamente
3. **Ingresa información:**
   - Email
   - Nombre y Apellido
   - Teléfono
   - Descripción de piezas (opcional)
   - Fecha de recogida
4. **Sube fotos** de sus piezas (mínimo 1)
5. **Confirma** y envía
6. **Recibe email** con confirmación

### Backend (Automático)
- ✅ Si cliente NO existe → Se crea automáticamente
- ✅ Crea registro de entrega con `createdByClient = true`
- ✅ Guarda fotos en Base64
- ✅ Envía email de confirmación

### Admin
- Ve todas las entregas en el panel
- Entregas creadas por cliente tienen marca especial
- Puede filtrar, editar, marcar como lista, etc.

---

## 📋 Archivos Creados/Modificados

| Archivo | Cambio | Status |
|---------|--------|--------|
| `types.ts` | Agregó `createdByClient?: boolean` | ✅ |
| `components/ClientDeliveryForm.tsx` | Nuevo componente (3 pasos) | ✅ |
| `api/data.ts` | Nuevo endpoint `createDeliveryFromClient` | ✅ |
| `services/dataService.ts` | Nueva función `createDeliveryFromClient()` | ✅ |
| `api/emailService.ts` | Nuevo email template | ✅ |
| `App.tsx` | Detecta `?clientMode=delivery` | ✅ |
| `public/qr-delivery-tracking.html` | Página con QR generado | ✅ |

---

## 🖨️ Generar QR

### Opción 1: Usar página HTML (RECOMENDADO)
1. Abre: `www.ceramicalma.com/qr-delivery-tracking.html`
2. Haz clic en **"Descargar Imagen"**
3. Imprime la imagen PNG

### Opción 2: Herramientas Online
- [qr-code.com](https://qr-code.com)
- [qr-server.com](https://qr-server.com)
- Ingresa URL: `www.ceramicalma.com/?clientMode=delivery`

---

## 🎨 Usar el QR

### Imprime y Pega en:
- ✅ Mostrador del taller
- ✅ Comprobantes de clase
- ✅ Bolsas de entrega
- ✅ Instrucciones de cuidado
- ✅ WhatsApp automático
- ✅ Email de confirmación

### Ejemplo de Mensaje
```
¿Dónde está tu pieza?
Escanea este código QR para subir fotos 
y seguimiento de tu entrega 📸

[QR CODE]
www.ceramicalma.com/?clientMode=delivery
```

---

## 🔍 Flujo Completo

```
CLIENTE ESCANEA QR
        ↓
www.ceramicalma.com/?clientMode=delivery
        ↓
App detecta ?clientMode=delivery
        ↓
Renderiza SOLO ClientDeliveryForm (sin header, nav, etc.)
        ↓
Cliente llena:
  • Email ✓
  • Nombre/Apellido ✓
  • Teléfono ✓
  • Descripción (opcional) ✓
  • Fecha de recogida ✓
  • Fotos (mínimo 1) ✓
        ↓
Backend:
  1. Busca cliente por email
  2. Si NO existe → Crea cliente nuevo
  3. Crea delivery con created_by_client=true
  4. Guarda fotos
  5. Envía email confirmación
        ↓
CONFIRMACIÓN AL CLIENTE
  "¡Gracias! Hemos recibido tu información.
   El equipo revisará tus fotos pronto."
        ↓
ADMIN VE EN PANEL
  • Nueva entrega de cliente
  • Puede editar, marcar como lista, etc.
```

---

## ✨ Características

✅ **Sin acción del admin** - Cliente crea su propio registro  
✅ **Clientes flexibles** - No necesita haber reservado clase  
✅ **3 pasos intuitivos** - Fácil de usar en teléfono  
✅ **Fotos múltiples** - Preview y eliminación individual  
✅ **Email automático** - Confirmación inmediata  
✅ **Pantalla limpia** - Solo formulario, sin distracciones  
✅ **Zero deploy** - Ya está en producción  

---

## 🧪 Testing

### Ambiente Local
```bash
npm run dev
# Abre: http://localhost:5173/?clientMode=delivery
```

### Ambiente Producción
```
https://www.ceramicalma.com/?clientMode=delivery
```

---

## 📊 Administración

### En Admin Panel
1. Ir a **Clientes** → Ver entregas
2. Filtrar por "Creadas por cliente"
3. Entrega muestra:
   - Email del cliente
   - Fotos subidas
   - Fecha programada
   - Estado (pending/ready/completed)

---

## 🔧 Mantenimiento

### Si necesitas cambiar el endpoint del QR:
1. Cambia URL en: `App.tsx` (línea con `clientMode`)
2. Regenera QR en: `public/qr-delivery-tracking.html`

### Si necesitas agregar más campos al formulario:
1. Edita: `components/ClientDeliveryForm.tsx`
2. Actualiza: `api/data.ts` (endpoint)
3. Añade: `types.ts` si necesita nuevo tipo

---

## 📞 Soporte

- **Error 404**: Verifica que la URL sea exacta
- **Email no enviado**: Revisa logs en Vercel
- **Cliente no se crea**: Mira logs en `api/data.ts`

---

**Última actualización:** 31 de Octubre, 2025  
**Versión:** 1.0  
**Estado:** ✅ Producción
