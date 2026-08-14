# Cambios para entrega al cliente — CeramicAlma

Registro ordenado de mejoras implementadas.  
Útil como checklist de revisión y como documento de entrega.

---

## 1. Claridad en experiencia grupal (técnica y titular)

**Qué cambió**
- Se quitó el ícono/tooltip junto a “Técnica de Cerámica”.
- Esa información pasó a la tarjeta de “Experiencia grupal”.
- Se aclara que la reserva queda a nombre de quien completa el formulario.
- Todos los participantes hacen la misma técnica.

**Por qué**
- Las reglas del grupo quedan en un solo lugar, fáciles de leer, sin pop-ups fáciles de ignorar.

**Dónde se ve**
- Flujo público → Experiencia personalizada → Configura tu experiencia → tarjeta bajo “Número de Participantes”.

**Estado:** implementado.

---

## 2. Atajos si el cliente entró por error

**Qué cambió**
- Tarjeta rediseñada (más limpia y estética).
- Accesos rápidos:
  - **Clase individual** → clases sueltas
  - **Paquete de clases** → selección de técnica / paquetes

**Por qué**
- Evitar que alguien que buscaba clase suelta o paquete tenga que volver al inicio a ciegas.

**Dónde se ve**
- Misma tarjeta: “¿Llegaste aquí por equivocación?”

**Estado:** implementado.

---

## 3. Alquiler de espacio privado (nuevo tipo en admin)

**Qué cambió**
- Nuevo tipo **Alquiler de espacio** en **Reserva Manual** (después de elegir cliente).
- Formulario guiado y simple (pensado para staff no técnico):
  - día, hora de inicio, duración (2–5 h, fin automático),
  - personas, precio, cerámica opcional, notas.
- Pantalla de revisión antes de terminar, con aviso claro de que se enviará correo al cliente.
- Al guardar: reserva tipo alquiler privado + bloqueo de **todo el taller** en esa ventana (ninguna clase/técnica puede solaparse).

**Por qué**
- Un evento con alquiler de espacio es privado y pagado; no debe coexistir con clases sueltas, paquetes u otras actividades en el mismo horario.

**Dónde se ve**
- Admin → Calendario → Agregar Reserva Manual → **Alquiler de espacio**.
- Calendario: días con alquiler se marcan en rosa con etiqueta **Privado**.
- Vista semanal: se muestra como alquiler privado (con horas).

**Estado:** implementado.

---

## 4. Validación en vivo de solapes (antes de confirmar)

**Qué cambió**
- Al elegir día / hora / duración, el admin ve al instante:
  - panel **Agenda del día** (qué hay ya programado),
  - etiqueta verde **Libre** o roja **No disponible**,
  - listado del solape (clase, curso, otro privado, etc.).
- No se puede pasar a “Revisar y confirmar” si hay conflicto.
- Antes de enviar el correo se vuelve a validar (por si alguien reservó en el medio).

**Por qué**
- Evitar llegar al resumen y al correo del cliente con un horario imposible.
- Que el staff vea el problema con claridad, sin jerga técnica.

**Dónde se ve**
- Mismo formulario de Alquiler de espacio (columna / panel de disponibilidad).

**Estado:** implementado.

---

## 5. Correo al cliente al registrar el alquiler (espera de pago)

**Qué cambió**
- Al confirmar el alquiler en admin, el cliente recibe un correo dedicado de **Alquiler de espacio · Evento privado**.
- Incluye: código, fecha, horario completo (inicio–fin), personas, actividad si aplica, monto, cuentas bancarias y enlace para subir comprobante.
- Lenguaje de evento privado (no de “clase individual”).

**Por qué**
- El alquiler es un producto distinto; el primer contacto por mail debe verse coherente y especial.

**Dónde se ve**
- Inbox del cliente, justo después de que admin confirma el alquiler.

**Estado:** implementado.

---

## 6. Correo de pago confirmado (alineado al primero)

**Qué cambió**
- Al registrar el pago del alquiler, **ya no** se envía el recibo genérico de clases (“tu plaza / tu clase programada”).
- Nuevo correo de pago con la **misma identidad visual** que el mail de registro:
  - header Ceramicalma + “Alquiler de espacio · Evento privado”,
  - “Tu alquiler está confirmado”,
  - sello visual de **Pago recibido / Espacio privado asegurado**,
  - mismos detalles del evento + detalle del pago,
  - texto de evento privado (sin política de clase suelta).

**Asunto**
- `Pago recibido · Alquiler de espacio · {código}`

**Por qué**
- Congruencia entre el primer mail (reserva registrada) y el segundo (pago confirmado).
- El cliente percibe un producto especial, no una clase suelta.

**Dónde se ve**
- Inbox del cliente, cuando admin confirma/registra el pago del alquiler.

**Estado:** implementado.

---

## Resumen rápido para revisión con el cliente

| # | Tema | Público / Admin |
|---|------|-----------------|
| 1 | Info de técnica + titular en tarjeta grupal | Público |
| 2 | Atajos a clase individual / paquetes | Público |
| 3 | Nuevo flujo Alquiler de espacio + bloqueo total | Admin |
| 4 | Validación visual de solapes en vivo | Admin |
| 5 | Email registro alquiler (espera pago) | Cliente |
| 6 | Email pago confirmado (estilo alineado) | Cliente |
| 7 | Campos numéricos: escribir libre, validar al salir | Público / flujos |
| 8 | Reserva manual: búsqueda + crear cliente en sitio | Admin |
| 14 | Botón “Editar Selección” en paquetes (volver atrás) | Público |
| 15 | Pago con gift card en todos los flujos + mail virtual | Público / Admin |
| 16 | Admin: crear gift card sin portal público | Admin |

---

## 7. Campos de cantidad: se puede escribir “11” (y similares)

**Qué cambió**
- En experiencia grupal / personalizada, el campo de participantes **ya no fuerza el mínimo mientras se escribe**.
- Antes: al teclear `1` (para llegar a `11`) el sistema lo convertía en `2` por el mínimo de 2 personas → imposible poner 11, 12, 15, etc.
- Ahora: se puede escribir con libertad; el mínimo/máximo se aplica al **salir del campo** (blur) o al continuar.
- Misma corrección en flujos relacionados (pieza / pintura) que tenían el mismo patrón.
- Reserva manual y alquiler ya permitían escribir dígitos con libertad (sin cambio disruptivo).

**Por qué**
- Validar el mínimo en cada tecla rompe números de dos dígitos que empiezan por 1 (o por debajo del mínimo).

**Dónde se ve**
- Experiencia personalizada / grupal → número de participantes.
- Otros flujos de participantes con el mismo tipo de input.

**Estado:** implementado.

---

## 8. Reserva manual: búsqueda de cliente rota + crear sin salir

**Qué cambió**
- Se corrigió el bug: al buscar cliente no aparecía el desplegable (la API devolvía un objeto paginado y el modal esperaba un array → siempre vacío).
- La búsqueda ahora consulta la base en vivo (nombre, apellido, email).
- Si no existe el cliente, se puede **crearlo en la misma pantalla** y continuar la reserva.
- El catálogo de productos solo aparece después de elegir/crear el cliente (flujo más claro).

**Dónde se ve**
- Admin → Calendario → Agregar Reserva Manual → buscar cliente.

**Estado:** implementado.

---

## 9. Retiro de “Clase de introducción al torno alfarero”

**Qué cambió**
- El producto `INTRODUCTORY_CLASS` se **desactiva** (`is_active = false`), no se borra de la base.
- Deja de aparecer en Reserva Manual y en cualquier catálogo que filtre por productos activos.
- En Gestión de Productos: ya no se lista, ni se puede crear / duplicar / reactivar.
- En Horarios → capacidad por defecto: se ocultó el campo “Clase Introductoria” (el valor en BD se conserva al guardar Torno/Modelado).
- En Finanzas: se quitó el filtro “Clase introductoria” del tablero (producto fuera de venta).
- El calendario y el cálculo de capacidad solo consideran intros **activas** (sin cupos fantasma).
- Script operativo: `scripts/deactivate-introductory-class.ts` (solo soft-disable + reporte de reservas históricas).

**Por qué**
- Producto legacy que no se vende. Un `DELETE` rompería o ensuciaría reservas históricas que siguen apuntando a ese `product_id` / `product_type`.

**Qué NO se tocó (a propósito)**
- Tipo `INTRODUCTORY_CLASS` en código, etiquetas de email/PDF/CRM y reservas pagadas antiguas: siguen mostrando “Clase Introductoria” en historial.
- No se ejecuta `syncProducts` ni wipe de la tabla `products`.

**Dónde se ve**
- Admin → Reserva Manual: ya no figura en el catálogo.
- Admin → Productos: no aparece en la lista.
- Admin → Horarios / capacidad: solo Torno y Modelado.
- Flujo público: no hay venta de intro (solo productos activos).

**Estado:** implementado (soft-disable + oculto en UI admin).

---

## 10. Notas internas de reserva (persistencia + PDF)

**Qué cambió**
- La **Nota** de Reserva Manual (y Alquiler) vuelve a guardarse en la columna `client_note`.
- También se guarda en experiencia personalizada creada desde admin y en alquiler de espacio.
- El calendario vuelve a **cargar** `client_note` (antes el SELECT optimizado la omitía).
- El **PDF del reporte de reservas** incluye columna **Notas**.
- El detalle del slot muestra la nota (con fallback si quedó en JSON de alquiler).

**Por qué**
- Había una regresión: el formulario enviaba la nota, pero el INSERT / la lectura del calendario la perdían. El staff no podía consultar lo que anotaba (abonos, niños, pendientes, etc.).

**Dónde se ve**
- Admin → Reserva Manual → campo “Nota interna”.
- Admin → Calendario → abrir asistentes del slot → bloque amarillo “Nota”.
- Admin → Generar reporte PDF del periodo → columna Notas.

**Estado:** implementado.

---

## 11. Clientes “fantasma”: no salían en búsqueda (ej. Liliana Larrañaga)

**Qué pasaba**
- Había **reservas** con email `llarranagae@gmail.com` y código `C-ALMA-CRM7BVYP`, pero **no existía fila** en la tabla `customers`.
- El CRM / Reserva Manual solo buscaba en `customers` → el cliente no aparecía.
- Además el CRM, con lista precargada, **ignoraba** la búsqueda server-side (lista truncada).
- Caso sistémico: **117 emails** con reservas y sin registro de cliente.

**Qué cambió**
- Backfill de huérfanos → tabla `customers` (`scripts/backfill-orphan-customers.ts`).
- Búsqueda unificada: nombre completo, email, teléfono, **código de reserva**, y también en `bookings` si falta el cliente.
- CRM: con texto de búsqueda ≥2 caracteres, consulta siempre al servidor.
- Al crear reserva (manual / experiencia / alquiler) se **crea o actualiza** el cliente automáticamente.
- Upsert de cliente no pisa el nombre ya guardado con el de una reserva posterior mal etiquetada.

**Dónde se ve**
- Admin → Clientes: buscar “Liliana”, “Larrañaga” o `C-ALMA-CRM7BVYP`.
- Admin → Reserva Manual: mismo buscador.

**Nota**
- Una reserva posterior (`C-ALMA-P9OWJ17W`) bajo el mismo email tiene nombre “Alejandro De Olarte” en `user_info` (dato de la reserva). La ficha del cliente quedó como Liliana (identidad mayoritaria).

**Estado:** implementado.

---

## 12. Ficha de cliente: clases pasadas / programadas más claras

**Qué cambió**
- Orden lógico: **pasadas** de más reciente a más antigua; **programadas** de la próxima hacia adelante.
- Badge de **tipo de reserva** (Paquete, Clase suelta, Experiencia, Celebración, Alquiler, Open Studio, etc.).
- En paquetes: texto tipo **“Sesión 2 de 3 agendadas · Paquete de 4 clases”**.
- Resumen **“Próxima clase”** arriba de Programadas + etiqueta en la tarjeta.
- Contexto extra: código, técnica, participantes, nota interna.

**Por qué**
- Antes todo se veía como “Torno Alfarero” sin distinguir paquete vs suelta vs experiencia, y sin orden claro.

**Dónde se ve**
- Admin → Clientes → ficha (ej. Teresa Hansen Holm) → pestañas Pasadas / Programadas.

**Estado:** implementado.

---

## 13. Plazos de paquetes de clases (4 / 8 / 12)

**Qué cambió**
- Ya no todos los paquetes se limitan a ~30 días / 4 semanas.
- Nueva ventana desde la **primera clase**:
  - **4 clases** → máximo **4 semanas**
  - **8 clases** → máximo **2 meses**
  - **12 clases** → máximo **3 meses**
- Se muestra en selector de paquetes, info del producto, calendario de agendado, resumen de compra.
- Correos de pre-reserva y confirmación de pago incluyen el plazo.
- El servidor rechaza reservas de paquete fuera de esa ventana.
- Políticas por defecto y manual admin actualizados.

**Por qué**
- Clientes con paquete de 8 (o 12) no alcanzaban a completar las clases en 4 semanas.

**Dónde se ve**
- Flujo público → Paquete de clases → elegir 4/8/12 → agendar horarios.
- Emails de pre-reserva y pago confirmado.

**Estado:** implementado.

---

## 14. Botón atrás en paquete de clases (“Editar Selección”)

**Qué cambió**
- El botón **← Editar Selección** en la pantalla de paquetes (4 / 8 / 12 clases) **ya funciona**.
- Al pulsarlo, el cliente vuelve a la pantalla anterior: **Elige una opción** (Torno Alfarero / Modelado a Mano).
- Desde ahí, el mismo botón sigue llevando al inicio (página principal).

**Antes**
- El botón se veía, pero no hacía nada: no tenía acción conectada.
- Quien ya había elegido técnica y estaba eligiendo paquete no podía regresar sin recargar o empezar de cero.

**Ahora**
- Paquete de clases → técnica → paquetes → **← Editar Selección** → vuelve a técnica.
- Técnica → **← Editar Selección** → vuelve al inicio.

**Qué tiene que hacer el cliente**
1. Entrar a **Paquete de clases**.
2. Elegir Torno o Modelado.
3. En las tarjetas 4 / 8 / 12, pulsar **← Editar Selección**.
4. Debe volver a elegir técnica; un segundo pulso lo lleva al inicio.

**Dónde se ve**
- Flujo público → Paquete de clases → elegir técnica → listado de paquetes (arriba a la izquierda).

**Estado:** implementado.

---

## 15. Pago con gift card en todos los flujos (redención virtual)

**Qué cambió**
- En la pantalla de pago (confirmación de pre-reserva) aparece **Pagar con gift card**: validar código, ver saldo, aplicar a esa reserva.
- Si la gift card no cubre el total, se muestra el **faltante** para transferir + subir comprobante.
- Si cubre de más, el **sobrante** queda en la gift card.
- Si cubre el total, la reserva se confirma sola (sin transferencia).
- El correo de pre-reserva incluye un botón **Redimir gift card** (redención virtual) además de subir comprobante.
- Página dedicada: `/?giftcard=CÓDIGO-DE-RESERVA` (también `/giftcard/redeem`).
- Misma opción en la página de subir comprobante.
- Admin (pre-reservas / gestionar): badges de **Gift card $X** y **Falta $Y**.

**Antes**
- Solo el resumen de paquetes/parejas tenía “Pagar con Giftcard”, y era fácil no verlo.
- Clase suelta, experiencias, grupos, alquiler, etc. no ofrecían gift card al pagar.
- El mail solo decía “sube tu comprobante”.

**Ahora — qué ve el cliente**
1. Reserva cualquier experiencia desde la home.
2. En confirmación: bloque violeta **Pagar con gift card**.
3. En el correo: **Redimir gift card →** (además de comprobante).
4. Al aplicar: ve faltante o sobrante al instante.

**Qué tiene que hacer**
1. Tener el código de la gift card (ej. GC-XXXX).
2. En confirmación o en el link del mail, validar y pulsar aplicar.
3. Si hay faltante, transferir esa diferencia y subir comprobante.

**Dónde se ve**
- Flujo público → cualquier reserva → pantalla “Cupo guardado”.
- Email de pre-reserva.
- Admin → Pre-reservas → columna Pagos y panel Gestionar.

**Estado:** implementado.

---

## 16. Admin: crear gift card sin el portal del cliente

**Qué cambió**
- En **Admin → Giftcards** el botón principal es **+ Crear gift card**.
- Formulario corto: para quién, valor (atajos $45 / $55 / $180 / $330), email opcional.
- Al guardar se **emite el código GC al instante** (ya se puede canjear). No hay que ir al sitio público ni aprobar una solicitud.
- Si hay email del destinatario, se le envía el código.
- También se puede elegir **Tarjeta física** (mismo modal) para escribir el código en una tarjeta impresa.
- Al terminar: código grande + copiar + vencimiento (3 meses).

**Antes**
- Solo existía “Registrar física”.
- Las gift cards digitales pasaban por el flujo público (comprar → pendiente → aprobar).

**Qué tiene que hacer el staff**
1. Admin → Giftcards → **+ Crear gift card**.
2. Elegir Digital o Tarjeta física.
3. Nombre, valor → **Crear y emitir código**.
4. Copiar el GC y dárselo al cliente (o dejar que llegue por correo).

**Dónde se ve**
- Admin → Giftcards (arriba a la derecha).

**Estado:** implementado.

---

## 17. Pin de entrega de gift card programada (cron + Resend)

**Qué cambió**
- Cada vez que el servidor intenta enviar una gift card (cron programado, al aprobar, o “Enviar ahora”), guarda un **pin de entrega** en la solicitud.
- En **Admin → Giftcards** aparece la columna **Envío** con el resultado:
  - **Enviada (Resend)** — el correo salió bien
  - **Error de envío** — Resend o el servidor falló (se ve el motivo)
  - **No entregada** — ya pasó la hora programada y aún no salió
  - **Omitida por el servidor** — el cron la saltó (p. ej. sin código GC)
  - **Programada · espera cron** — todavía no es la hora
  - **WhatsApp listo** — se generó el enlace; hay que abrirlo a mano
- Filtro **Envío fallido** y aviso rojo arriba si hay alguna sin entregar.
- En el detalle: origen (cron / admin), hora Ecuador, ID de Resend si hay, y botón **Reenviar ahora**.

**Por qué**
- El envío programado ya funcionaba por CronJob, pero el admin no veía si el servidor lo había hecho bien o no.

**Qué tiene que hacer el staff**
1. Admin → Giftcards → mirar el pin de **Envío**.
2. Si está en rojo/ámbar: abrir **Detalle**, leer el error, **Reenviar ahora**.
3. Sincronizar si el pin no aparece al instante tras la hora programada.

**Dónde se ve**
- Admin → Giftcards (columna Envío y filtro Envío fallido).

**Estado:** implementado.

---

## 18. Búsqueda CRM: tildes, pills y búsqueda global

**Qué cambió**
- Buscar **Isaías** con o sin tilde (`Isaias` / `Isaías`) encuentra al cliente.
- La búsqueda es **global** (toda la base de clientes), no solo la página del listado donde estés.
- Al buscar, las pills de clase restante / entrega pendiente **siguen visibles**.
- Al buscar se vuelve a la **página 1** para que el resultado no quede “escondido” en otra página.

**Dónde se ve**
- Admin → Clientes (barra de búsqueda).

**Estado:** implementado.

---

## Pendiente / siguientes

_(Se irán agregando aquí en orden a medida que continúen los cambios.)_
