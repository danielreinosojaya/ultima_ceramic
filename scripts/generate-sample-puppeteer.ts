import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

(async () => {
  try {
    // importar dinámicamente el módulo TS vía file URL para compatibilidad con ts-node/esm
    const modPath = path.resolve('./api/pdfPuppeteer.ts');
    const mod = await import(pathToFileURL(modPath).href);
    const { generateReceiptPdf } = mod as any;

    const sample = {
      booking: {
        userInfo: { firstName: 'Daniel' },
        bookingCode: 'C-ALMA-PUPP-001',
        product: { name: 'Clase de introducción al torno alfarero' },
        price: 55.0
      },
      bankDetails: [{ bankName: 'Banco Pichincha', accountHolder: 'Carolina Massuh Morán', accountNumber: '2100334248', accountType: 'Cuenta Corriente', taxId: '0921343935' }]
    };

    const buf = await generateReceiptPdf(sample as any);
    const out = path.join('/tmp', `receipt-puppeteer-${Date.now()}.pdf`);
    fs.writeFileSync(out, buf);
    console.log('PDF generado:', out);
  } catch (e) {
    console.error('Error generando PDF:', e?.message || e);
    process.exit(1);
  }
})();
