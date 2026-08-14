# Envío programado de gift card

## Para qué sirve

Tarjetas que deben llegar en **cumpleaños, Navidad u hora específica**.

## Reglas

- Hora referida a **Ecuador** (zona del negocio).
- El sistema intenta enviar automáticamente cada pocos minutos cuando llega la fecha/hora (correo por Resend).
- En **Giftcards** cada solicitud tiene un **pin de Envío** con el resultado del servidor.
- Admin puede **enviar ahora** / **reenviar ahora** si no quieres esperar o si falló.

## Pin de entrega

| Pin | Significado |
|-----|-------------|
| Enviada (Resend) | El correo al destinatario salió bien |
| Error de envío | El servidor o Resend falló; el detalle muestra el motivo |
| No entregada | Ya pasó la hora y todavía no salió |
| Omitida | El cron la saltó (casi siempre: falta código GC) |
| Programada | Todavía no es la hora |
| WhatsApp listo | Hay enlace; hay que abrirlo a mano (no es envío automático) |

## Flujo admin

1. Al aprobar, confirma fecha/hora programada correcta.
2. El día D, revisa el pin **Envío** (también el filtro **Envío fallido**).
3. Si el pin es error / no entregada / omitida: **Detalle** → leer el error → **Reenviar ahora**.

## Qué NO hacer

Cambiar reloj del celular; confía en la hora configurada en la solicitud.
Aprobar de nuevo la misma solicitud para “forzar” el envío (eso duplica).

---

[← Índice](../README.md)
