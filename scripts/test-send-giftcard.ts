import { sendGiftcardRecipientEmail } from '../api/emailService.js';

async function run() {
  try {
    const res = await sendGiftcardRecipientEmail(
      'test-recipient@example.com',
      {
        recipientName: 'Test User',
        amount: 50,
        code: 'GC-TEST123',
        message: '¡Feliz cumpleaños! Disfruta tu clase, te lo mereces.',
        buyerName: 'Daniel Remitente'
      }
    );
    console.log('sendGiftcardRecipientEmail result:', res);
  } catch (err) {
    console.error('Error running test send:', err);
  }
}

run();
