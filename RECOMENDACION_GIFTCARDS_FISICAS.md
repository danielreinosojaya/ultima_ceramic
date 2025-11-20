# 📋 RECOMENDACIÓN: INTEGRACIÓN DE GIFTCARDS FÍSICAS

**Fecha:** Noviembre 17, 2025  
**Autor:** Daniel Reinoso  
**Alcance:** Última Ceramic - Giftcards Físicas

---

## 🎯 SITUACIÓN ACTUAL

**Estado Actual:**
- ✅ Sistema digital: Email + WhatsApp + Código QR
- ❌ Sistema físico: No integrado
- ❌ Sin tracking de envío
- ❌ Sin inventario físico

**Problema:**
Clientes compran giftcards físicas pero el sistema no registra:
- Cuándo se envía
- Dónde fue enviada
- Si fue recibida
- Cuándo se canjea

**Impacto:**
- Sin seguimiento = clientes perdidos/confundidos
- Sin datos = no hay reporting
- Sin control = posible fraud en entregas

---

## 💡 SOLUCIÓN: INTEGRACIÓN EN 3 CAPAS

### CAPA 1: Modelo de Datos (Cambios en DB)

**Nueva columna en `giftcard_requests`:**

```sql
ALTER TABLE giftcard_requests ADD COLUMN IF NOT EXISTS (
    delivery_method VARCHAR(20) DEFAULT 'digital',
    -- delivery_method: 'email' | 'whatsapp' | 'physical' | 'in_person'
    
    fulfillment_status VARCHAR(20) DEFAULT 'pending',
    -- pending → ready_to_ship → shipped → delivered → completed
    
    shipping_address JSONB,
    -- { street, number, city, zipCode, country, phone }
    
    shipping_carrier VARCHAR(50),
    -- 'fedex', 'dhl', 'local', 'in_hand', etc
    
    tracking_number VARCHAR(100),
    -- Número de seguimiento del courier
    
    shipped_at TIMESTAMP,
    -- Cuándo se envió el paquete
    
    delivered_at TIMESTAMP,
    -- Cuándo llegó a manos del cliente
    
    pickup_location VARCHAR(100),
    -- Para retiro en tienda: 'Almacén Central', 'Sucursal 5', etc
    
    notes TEXT
    -- Notas internas: "Rechazado por aduana", "Reenvío necesario", etc
);
```

**Nueva tabla: `giftcard_shipments` (para tracking detallado)**

```sql
CREATE TABLE IF NOT EXISTS giftcard_shipments (
    id SERIAL PRIMARY KEY,
    giftcard_request_id INTEGER REFERENCES giftcard_requests(id),
    carrier VARCHAR(50),
    tracking_number VARCHAR(100),
    status VARCHAR(30), -- 'label_created', 'in_transit', 'out_for_delivery', 'delivered', 'returned'
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    last_update TIMESTAMP,
    raw_data JSONB -- Datos raw del API del courier
);
```

---

### CAPA 2: Flujo Frontend (Cambios en UI)

**1. En `GiftcardDeliveryOptions.tsx` - Agregar opción física:**

```typescript
const deliveryOptions = [
  // Existentes
  { id: 'email', label: 'Email', ... },
  { id: 'whatsapp', label: 'WhatsApp', ... },
  
  // NUEVO - Opciones físicas
  { 
    id: 'physical_ship',
    label: 'Envío a domicilio',
    icon: <TruckIcon />
  },
  {
    id: 'physical_pickup',
    label: 'Retiro en tienda',
    icon: <StoreIcon />
  }
];
```

**2. Componente nuevo: `GiftcardShippingForm.tsx`**

Cuando el usuario selecciona "physical_ship":

```typescript
interface ShippingFormProps {
  onSubmit: (data: ShippingData) => void;
}

const GiftcardShippingForm = ({ onSubmit }: ShippingFormProps) => {
  const [shipping, setShipping] = useState({
    fullName: '',
    street: '',
    number: '',
    city: '',
    zipCode: '',
    country: 'Argentina',
    phone: '',
    preferredCarrier: 'auto', // 'fedex', 'dhl', 'local', 'auto'
    instructions: ''
  });
  
  return (
    <form>
      <input placeholder="Nombre completo" />
      <input placeholder="Calle" />
      <input placeholder="Número" />
      <input placeholder="Ciudad" />
      <input placeholder="Código postal" />
      <select>
        <option value="auto">Que Última Ceramic elija</option>
        <option value="fedex">FedEx</option>
        <option value="dhl">DHL</option>
        <option value="local">Courier Local</option>
      </select>
      <textarea placeholder="Instrucciones especiales (ej: puerta roja)" />
    </form>
  );
};
```

**3. Componente nuevo: `GiftcardPickupForm.tsx`**

Cuando el usuario selecciona "physical_pickup":

```typescript
const GiftcardPickupForm = ({ onSubmit }: PickupFormProps) => {
  const locations = [
    { id: 1, name: 'Almacén Central - CABA', address: 'Av. Corrientes 1234' },
    { id: 2, name: 'Sucursal Caballito', address: 'Av. Acoyte 567' },
    { id: 3, name: 'Sucursal La Plata', address: 'Calle 50, 900' }
  ];
  
  return (
    <>
      <div className="space-y-3">
        {locations.map(loc => (
          <LocationCard 
            key={loc.id}
            location={loc}
            onSelect={() => onSubmit(loc.id)}
          />
        ))}
      </div>
    </>
  );
};
```

**4. Actualizar `GiftcardPayment.tsx` - Mostrar resumen:**

```typescript
// Mostrar según delivery_method:
{deliveryMethod === 'email' && (
  <p>Se enviará a: {recipientEmail}</p>
)}

{deliveryMethod === 'physical_ship' && (
  <p>Se enviará a: {shipping.street} {shipping.number}, {shipping.city}</p>
)}

{deliveryMethod === 'physical_pickup' && (
  <p>Retiro en: {pickupLocation.name}</p>
)}
```

---

### CAPA 3: Backend (Cambios en API)

**1. Endpoint: `addGiftcardRequest` - Extender datos:**

```typescript
// En el body ahora:
{
  buyerEmail: "buyer@example.com",
  amount: 100,
  recipientName: "María",
  
  // NUEVO - datos de entrega física
  deliveryMethod: "physical_ship",
  shippingAddress: {
    fullName: "María García",
    street: "Av. Corrientes",
    number: "1234",
    city: "Buenos Aires",
    zipCode: "1043",
    country: "Argentina",
    phone: "+5491123456789"
  },
  preferredCarrier: "auto",
  specialInstructions: "Puerta roja"
}
```

**2. Función nueva: `generateShippingLabel()`**

```typescript
case 'generateShippingLabel': {
    // Admin panel: cuando aprueba giftcard física
    
    const { giftcardRequestId } = req.body;
    
    // 1. Obtener datos de envío de la solicitud
    const requestData = await sql`
        SELECT * FROM giftcard_requests WHERE id = ${giftcardRequestId}
    `;
    
    // 2. Llamar a FedEx/DHL API para crear etiqueta
    const shippingLabel = await createShippingLabel({
        recipientName: requestData.shipping_address.fullName,
        address: requestData.shipping_address,
        carrier: requestData.preferred_carrier,
        giftValue: requestData.amount
    });
    
    // 3. Guardar tracking number
    await sql`
        UPDATE giftcard_requests 
        SET 
            fulfillment_status = 'ready_to_ship',
            tracking_number = ${shippingLabel.trackingNumber},
            shipping_carrier = ${shippingLabel.carrier},
            shipped_at = NOW()
        WHERE id = ${giftcardRequestId}
    `;
    
    // 4. Enviar email con tracking al cliente
    await emailService.sendShippingNotification(
        recipientEmail,
        shippingLabel
    );
    
    return res.json(shippingLabel);
}
```

**3. Función nueva: `trackShipment()`**

```typescript
case 'trackShipment': {
    const { trackingNumber } = req.body;
    
    // Llamar a API del courier para obtener estado
    const status = await trackingService.getStatus(trackingNumber);
    
    // Actualizar en DB
    if (status.delivered) {
        await sql`
            UPDATE giftcard_requests
            SET 
                fulfillment_status = 'delivered',
                delivered_at = NOW()
            WHERE tracking_number = ${trackingNumber}
        `;
    }
    
    return res.json(status);
}
```

**4. Email nuevo: `sendShippingNotification()`**

En `emailService.ts`:

```typescript
export const sendShippingNotification = async (
    email: string,
    shipping: ShippingLabel
) => {
    const html = `
        <h2>¡Tu giftcard de Última Ceramic está en camino!</h2>
        <p>Carrier: ${shipping.carrier}</p>
        <p>Tracking: <strong>${shipping.trackingNumber}</strong></p>
        <p><a href="${shipping.trackingUrl}">Ver estado del envío</a></p>
        <p>Entrega estimada: ${shipping.estimatedDelivery}</p>
    `;
    
    return sendWithRetry({
        to: email,
        subject: '🚚 Tu giftcard está en camino - Última Ceramic',
        html
    });
};
```

---

## 📊 FLUJO COMPLETO: Giftcard Física

```
1. CLIENTE COMPRA
   └─ Selecciona "Envío a domicilio"
   └─ Ingresa dirección de entrega
   └─ Paga

2. SISTEMA CREA SOLICITUD
   └─ INSERT INTO giftcard_requests (delivery_method='physical_ship', shipping_address=...)
   └─ Status: pending
   └─ Fulfillment: pending

3. ADMIN PANEL - NUEVA VISTA
   ├─ Lista de solicitudes sin procesar
   ├─ Botón "Generar etiqueta de envío"
   └─ Opción para retardo/rechazar

4. ADMIN CLICA "GENERAR ETIQUETA"
   ├─ API llama a FedEx/DHL
   ├─ Recibe tracking number
   ├─ Guarda en DB: tracking_number, carrier, shipped_at
   ├─ Fulfillment: ready_to_ship
   └─ Email al cliente con tracking

5. CLIENTE RECIBE EMAIL
   └─ Incluye link para seguimiento en tiempo real

6. DURANTE ENVÍO
   ├─ Cron job cada 1 hora: trackingService.sync()
   ├─ Actualiza status en DB (in_transit, out_for_delivery)
   └─ Email automático cuando se entrega

7. CUANDO LLEGA
   ├─ Fulfillment: delivered
   ├─ Email de confirmación
   └─ Cliente puede canjear cuando quiera

8. CLIENTE CANJEA
   └─ Ingresa código en GiftcardBalanceChecker
   └─ Balance se deduce
   └─ Fulfillment: completed (si gastó todo)
```

---

## 🗄️ CAMBIOS DE ESQUEMA RESUMEN

### Nuevas columnas en `giftcard_requests`:
```
delivery_method         VARCHAR(20)    'email'|'whatsapp'|'physical_ship'|'physical_pickup'
fulfillment_status      VARCHAR(20)    'pending'|'ready_to_ship'|'shipped'|'delivered'|'completed'
shipping_address        JSONB          {street, number, city, zipCode, country, phone}
shipping_carrier        VARCHAR(50)    'fedex'|'dhl'|'local'|'in_person'
tracking_number         VARCHAR(100)   Ej: "794629157394"
shipped_at              TIMESTAMP      Cuándo fue enviado
delivered_at            TIMESTAMP      Cuándo llegó
pickup_location         VARCHAR(100)   Para retiro: "Almacén Central"
notes                   TEXT           Notas internas
```

### Nueva tabla: `giftcard_shipments`
```
Opcional pero recomendado para historico de intentos de envío
y datos de courier en tiempo real
```

---

## 🎛️ ADMIN PANEL - NUEVA VISTA

**Componente: `GiftcardsPhysicalShipping.tsx`**

```
┌─────────────────────────────────────────────────────┐
│ ENVÍOS FÍSICOS DE GIFTCARDS                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📋 Pendientes de procesar: 3                       │
│                                                     │
│ ┌─ Request #1234 ─────────────────────────────┐   │
│ │ Cliente: Juan García                        │   │
│ │ Monto: $100                                 │   │
│ │ A: Av. Corrientes 1234, CABA               │   │
│ │ Status: Pendiente                           │   │
│ │                                             │   │
│ │ [Generar Etiqueta]  [Rechazar]             │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─ Request #1233 ─────────────────────────────┐   │
│ │ Cliente: María López                        │   │
│ │ Monto: $50                                  │   │
│ │ A: Almacén Central (Retiro)                 │   │
│ │ Status: Listo para entregar                │   │
│ │ Etiqueta: 794629157394                      │   │
│ │ Tracking: En tránsito (salió del almacén)  │   │
│ │                                             │   │
│ │ [Ver Tracking]  [Marcar Entregado]         │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📈 TIMELINE DE IMPLEMENTACIÓN

### Fase 1: MVP (1-2 semanas)
- [x] Agregar columnas a `giftcard_requests`
- [ ] Frontend: `GiftcardShippingForm.tsx`
- [ ] Backend: Guardar datos de envío
- [ ] Backend: `generateShippingLabel()` (integración manual FedEx/DHL)
- [ ] Email: `sendShippingNotification()`
- [ ] Admin: Vista de "Envíos pendientes"

### Fase 2: Automatización (2-3 semanas)
- [ ] Integración API real con FedEx/DHL/Andreani
- [ ] Cron job para sincronizar tracking
- [ ] Webhooks de courier para actualizaciones en tiempo real
- [ ] Tabla `giftcard_shipments` para historico

### Fase 3: UX Mejorada (1-2 semanas)
- [ ] Retiro en tienda (GiftcardPickupForm)
- [ ] Tracking público (cliente ve estado sin admin)
- [ ] Push notifications cuando se entrega
- [ ] Reintentos automáticos si falla entrega

### Fase 4: Reporting (1 semana)
- [ ] Dashboard: Entregas completadas vs pendientes
- [ ] Reportes por carrier
- [ ] Tasa de rechazo/devoluciones
- [ ] Costo de envío por orden

---

## 💰 COSTOS Y CONSIDERACIONES

### Courier APIs (Estimado)
- **FedEx:** $0.50-2 por envío (tracking + label)
- **DHL:** $0.50-2 por envío
- **Andreani (Local ARG):** $0.30-1 por envío

### Impacto en DB
- +5 columnas en `giftcard_requests` (~50 bytes)
- Nueva tabla `giftcard_shipments` (~1 KB por envío)
- Estimado: +100 MB para 10K envíos

### Impacto en Performance
- Búsquedas por tracking_number: +1 índice
- Sync tracking: Cron job async (no bloquea API)
- Overhead: <5ms por request

---

## ✅ BENEFICIOS

### Para el Cliente
- ✅ Sabe exactamente dónde está su giftcard
- ✅ Emails automáticos en cada etapa
- ✅ Opción de retiro (más barato)
- ✅ Transparencia total

### Para el Negocio
- ✅ Seguimiento completo = menos reclamos
- ✅ Datos para reporting de costos
- ✅ Automatización = menos admin manual
- ✅ Escalable: soporta 1K envíos/día sin problema

### Para el Sistema
- ✅ Arquitectura modular (se agrega sin romper digital)
- ✅ Rate limiting protege los nuevos endpoints
- ✅ Auditoría completa en `giftcard_shipments`
- ✅ Extensible para otros métodos (retiro en tienda, pickup points)

---

## 🚀 RECOMENDACIÓN FINAL

**Implementar en 2 fases:**

### Sprint 1 (Esta semana)
Desarrollar Phase 1 MVP:
- DB schema changes
- Frontend shipping form
- Backend save + email
- Admin panel básico

**Benefit inmediato:** Sistema funciona, requiere integración manual con courier

### Sprint 2 (Próxima semana)
Desarrollar Phase 2 Automatización:
- API real con FedEx/DHL
- Tracking automático
- Webhooks

**Benefit:** Totalmente automático

---

## 📝 PRÓXIMAS ACCIONES

1. **Revisar esta recomendación** con el equipo
2. **Validar carriers** (¿FedEx? ¿DHL? ¿Local?)
3. **Obtener API credentials** de courier elegido
4. **Crear branch:** `feature/physical-giftcards`
5. **Implementar Phase 1**

---

¿Procedemos con la implementación?
