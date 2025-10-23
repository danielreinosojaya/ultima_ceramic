#!/usr/bin/env node
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

(async () => {
  try {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const out = path.join('/tmp', `receipt-test-${Date.now()}.pdf`);
    const stream = fs.createWriteStream(out);
    doc.pipe(stream);

    doc.fontSize(20).text('Tu Pre-Reserva en CeramicAlma', { align: 'left' });
    doc.moveDown();
    doc.fontSize(16).text('¡Hola, Daniel!');
    doc.moveDown(0.5);
    doc.fontSize(12).text('Gracias por tu pre-reserva para Clase de introducción al torno alfarero. Tu lugar ha sido guardado con el código de reserva:');
    doc.moveDown(0.5);
    doc.fillColor('#D95F43').fontSize(22).text('C-ALMA-TEST123');
    doc.moveDown(0.5);
    doc.fillColor('#000').fontSize(12).text('El monto a pagar es de $55.00.');

    // table-like
    doc.moveDown();
    doc.rect(doc.x - 2, doc.y - 4, 520, 24).fill('#f0f0f0');
    doc.fillColor('#7c868e').fontSize(12).text('Banco', doc.x, doc.y - 20, { continued: true, width: 120 });
    doc.text('Titular', doc.x + 120, doc.y - 20, { continued: true, width: 140 });
    doc.text('Número', doc.x + 260, doc.y - 20, { continued: true, width: 110 });
    doc.text('Tipo', doc.x + 370, doc.y - 20, { continued: true, width: 100 });
    doc.text('Cédula', doc.x + 470, doc.y - 20, { width: 100 });
    doc.moveDown(1.5);
    doc.fillColor('#333').fontSize(12).text('Banco Pichincha', { continued: true, width: 120 });
    doc.text('Carolina Massuh Morán', { continued: true, width: 140 });
    doc.text('2100334248', { continued: true, width: 110 });
    doc.text('Cuenta Corriente', { continued: true, width: 100 });
    doc.text('0921343935', { width: 100 });

    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#555').text('Importante: Usa tu código de reserva C-ALMA-TEST123 como referencia en la transferencia.');

    // QR
    const qrData = 'https://ceramicalma.com/reservation/C-ALMA-TEST123';
    const qrPng = await QRCode.toDataURL(qrData, { margin: 1, width: 120 });
    const base64 = qrPng.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(base64, 'base64');
    doc.image(qrBuffer, doc.page.width - 150, doc.y - 30, { width: 100 });

    doc.end();
    stream.on('finish', () => console.log('PDF generado:', out));
  } catch (e) {
    console.error('Error generando PDF:', e);
    process.exit(1);
  }
})();

