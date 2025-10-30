import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { addPaymentToBooking, getBookingById } from '../../services/dataService'; // Corregir la importación para registrar pagos en bookings
import { sendPaymentReceiptEmail } from '../emailService'; // Importar el servicio de correo
import type { PaymentDetails } from '../../types'; // Importar el tipo correcto para definir el objeto `payment`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const body = req.body || {};
  const holdId = body.holdId || body.hold_id || null;
  if (!holdId) return res.status(400).json({ success: false, error: 'holdId is required' });

  try {
    await sql`BEGIN`;

    // Lock the hold row and fetch it
    const { rows: [holdRow] } = await sql`SELECT * FROM giftcard_holds WHERE id = ${holdId} FOR UPDATE`;
    if (!holdRow) {
      await sql`ROLLBACK`;
      return res.status(404).json({ success: false, error: 'hold_not_found' });
    }

    // Lock the giftcard row
    // giftcard_id in holds may be stored as text; coerce to integer when selecting
    const giftcardId = holdRow.giftcard_id;
    const { rows: [gRow] } = await sql`SELECT * FROM giftcards WHERE id = ${giftcardId} FOR UPDATE`;
    if (!gRow) {
      await sql`ROLLBACK`;
      return res.status(404).json({ success: false, error: 'giftcard_not_found' });
    }

    const currentBalance = (typeof gRow.balance === 'number') ? Number(gRow.balance) : (gRow.balance ? Number(gRow.balance) : 0);

    // Subtract the hold amount from balance
    const holdAmount = Number(holdRow.amount || 0);
    if (currentBalance < holdAmount) {
      await sql`ROLLBACK`;
      return res.status(400).json({ success: false, error: 'insufficient_funds' });
    }

    // Update giftcard balance and remove hold
    await sql`UPDATE giftcards SET balance = ${currentBalance - holdAmount} WHERE id = ${gRow.id}`;
    await sql`DELETE FROM giftcard_holds WHERE id = ${holdId}`;

    // Insert audit for the consumption (best-effort). Try preferred schema then fallback.
    try {
      // Preferred schema with expanded details
      await sql`
        INSERT INTO giftcard_audit (id, giftcard_id, event_type, amount, metadata, created_at, booking_id, user_id, booking_status)
        VALUES (
          uuid_generate_v4(),
          ${String(gRow.id)},
          'hold_consumed',
          ${holdAmount},
          ${JSON.stringify({ holdId })}::jsonb,
          NOW(),
          ${holdRow.booking_id || null},
          ${holdRow.user_id || null},
          ${holdRow.booking_status || null}
        )
      `;
    } catch (firstAuditErr) {
      try {
        // Fallback/legacy schema with expanded details
        await sql`
          INSERT INTO giftcard_audit (giftcard_id, action, status, amount, metadata, booking_id, user_id, booking_status)
          VALUES (
            ${String(gRow.id)},
            'hold_consumed',
            'success',
            ${holdAmount},
            ${JSON.stringify({ holdId })}::jsonb,
            ${holdRow.booking_id || null},
            ${holdRow.user_id || null},
            ${holdRow.booking_status || null}
          )
        `;
      } catch (auditErr) {
        console.warn('Failed to insert giftcard_audit for consumed hold (both attempts):', auditErr, firstAuditErr);
      }
    }

    // Registrar el pago en el booking asociado
    const bookingId = holdRow.booking_id; // Suponiendo que el hold tiene un campo booking_id
    if (bookingId) {
      const payment: PaymentDetails = {
        amount: holdAmount,
        method: 'Giftcard', // Corregido para cumplir con el tipo PaymentDetails
        receivedAt: new Date().toISOString(),
        metadata: { giftcardId: gRow.id, holdId },
      };

      try {
        await addPaymentToBooking(bookingId, payment);

        // Enviar correo de confirmación de pago con detalles de la giftcard
        const booking = await getBookingById(bookingId); // Obtener detalles del booking
        const paymentWithGiftcardDetails = {
            ...payment,
            giftcardAmount: holdAmount, // Monto cubierto por la giftcard
        };
        await sendPaymentReceiptEmail(booking, paymentWithGiftcardDetails);
      } catch (paymentError) {
        console.error('Error registrando el pago en el booking:', paymentError);
        throw new Error('Failed to register payment in booking');
      }
    }

    await sql`COMMIT`;
    return res.status(200).json({ success: true, giftcardId: gRow.id, newBalance: Number(currentBalance - holdAmount) });
  } catch (err) {
    try { await sql`ROLLBACK`; } catch (_) {}
    console.error('giftcards/consume error:', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}
