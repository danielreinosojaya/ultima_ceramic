import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

(async () => {
  try {
    const modPath = path.resolve('./api/pdfPuppeteer.ts');
    const mod = await import(pathToFileURL(modPath).href);
    const { generateGiftcardPdf } = mod as any;

    const sample = {
      code: 'GC-TEST123',
      amount: 50,
      recipientName: 'CARO',
      buyerName: 'DANIEL',
      message: 'Un regalo para ti'
    };

    const buf = await generateGiftcardPdf(sample as any);
    const outDir = path.join(process.cwd(), 'tmp');
    try { fs.mkdirSync(outDir, { recursive: true }); } catch {}
    const out = path.join(outDir, `giftcard-puppeteer-${Date.now()}.pdf`);
    fs.writeFileSync(out, buf);
    console.log('PDF generado (workspace):', out);
  } catch (e) {
    console.error('Error generando PDF:', e?.message || e);
    process.exit(1);
  }
})();
