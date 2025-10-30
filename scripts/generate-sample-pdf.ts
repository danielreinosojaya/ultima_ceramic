import path from 'path';
import fs from 'fs';
import { generateReceiptPdfBuffer } from '../api/pdf';

(async () => {
  try {
    const sample = {
      booking: {
        userInfo: { firstName: 'Daniel' },
        bookingCode: 'C-ALMA-TEST123',
        product: { name: 'Clase de introducción al torno alfarero' },
        price: 55.0
      },
      bankDetails: [{ bankName: 'Banco Pichincha', accountHolder: 'Carolina Massuh Morán', accountNumber: '2100334248', accountType: 'Cuenta Corriente', taxId: '0921343935' }]
    };
    const buf = await generateReceiptPdfBuffer(sample as any);
    const out = path.join('/tmp', `receipt-${Date.now()}.pdf`);
    fs.writeFileSync(out, buf);
    console.log('PDF generado:', out);
  } catch (e) {
    console.error('Error generando PDF:', e);
    process.exit(1);
  }
})();
