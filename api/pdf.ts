import stream from 'stream';

export async function generateVoucherPdfBuffer(data: {
    buyerName: string;
    recipientName: string;
    amount: number;
    code: string;
    note?: string;
    qrPngBuffer?: Buffer;
}) {
    // Type definitions for 'pdfkit' may be missing in some environments; ignore at compile-time
    // @ts-ignore
    const PDFDocumentModule: any = await import('pdfkit').then(m => m.default || m);
    const doc = new PDFDocumentModule({ size: 'A4', margin: 50 });
    const passthrough = new stream.PassThrough();
    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
        doc.on('error', reject);
        passthrough.on('data', (chunk) => chunks.push(chunk));
        passthrough.on('end', () => resolve(Buffer.concat(chunks)));

        doc.pipe(passthrough);

        doc.fontSize(20).text('Giftcard / Vale de Regalo', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Código: ${data.code}`);
        doc.text(`Monto: S/ ${Number(data.amount).toFixed(2)}`);
        doc.text(`Para: ${data.recipientName}`);
        doc.text(`De: ${data.buyerName}`);
        if (data.note) {
            doc.moveDown();
            doc.text('Mensaje:', { underline: true });
            doc.text(data.note);
        }

        if (data.qrPngBuffer) {
            try {
                doc.addPage();
                doc.image(data.qrPngBuffer, { fit: [300, 300], align: 'center' });
            } catch (err) {
                console.warn('Failed to add QR image to PDF', err);
            }
        }

        doc.end();
    });
}

export async function generateReceiptPdfBuffer(payload: {
    booking: any;
    payment?: any;
    bankDetails?: any | any[];
}) {
    // @ts-ignore
    const PDFDocumentModule: any = await import('pdfkit').then(m => m.default || m);
    const doc = new PDFDocumentModule({ size: 'A4', margin: 50 });
    const passthrough = new stream.PassThrough();
    const chunks: Buffer[] = [];

    // usamos un flujo async para construir el PDF y luego resolver
    return await (async () => {
        doc.on('error', (e: any) => { throw e; });
        passthrough.on('data', (chunk) => chunks.push(chunk));
        doc.pipe(passthrough);

        const booking = payload.booking || {};
        const user = booking.userInfo || {};
        const product = booking.product || {};

        // Header
        try {
            const logoPath = require('path').join(process.cwd(), 'public', 'logo.png');
            if (require('fs').existsSync(logoPath)) {
                doc.image(logoPath, 50, 45, { width: 80 });
            }
        } catch (e) {
            // ignore
        }

        doc.fillColor('#333').fontSize(20).text(`Tu Pre-Reserva en CeramicAlma`, 150, 50);
        doc.moveDown(2);
        const name = user.firstName || user.name || 'Cliente';
        doc.fontSize(16).fillColor('#111').text(`¡Hola, ${name}!`);
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#333').text(`Gracias por tu pre-reserva para ${product.name || ''}. Tu lugar ha sido guardado con el código de reserva:`);
        doc.moveDown(0.5);
        doc.fillColor('#D95F43').fontSize(22).font('Helvetica-Bold').text(booking.bookingCode || '', { align: 'left' });
        doc.moveDown(0.5);

        if (typeof booking.price === 'number') {
            doc.fillColor('#000').fontSize(12).font('Helvetica').text(`El monto a pagar es de $${Number(booking.price).toFixed(2)}.`);
            doc.moveDown(0.5);
        }

        const accounts = Array.isArray(payload.bankDetails) ? payload.bankDetails : payload.bankDetails ? [payload.bankDetails] : [];
        if (accounts.length > 0) {
            doc.moveDown(0.5);
            const tableTop = doc.y;
            const columnWidths = [120, 140, 110, 100, 100];
            doc.save().rect(doc.x - 2, tableTop - 4, 520, 24).fillAndStroke('#f0f0f0', '#f0f0f0');
            doc.fillColor('#7c868e').fontSize(12).font('Helvetica-Bold');
            doc.text('Banco', doc.x, tableTop, { width: columnWidths[0], continued: true });
            doc.text('Titular', doc.x + columnWidths[0], tableTop, { width: columnWidths[1], continued: true });
            doc.text('Número', doc.x + columnWidths[0] + columnWidths[1], tableTop, { width: columnWidths[2], continued: true });
            doc.text('Tipo', doc.x + columnWidths[0] + columnWidths[1] + columnWidths[2], tableTop, { width: columnWidths[3], continued: true });
            doc.text('Cédula', doc.x + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], tableTop, { width: columnWidths[4] });
            doc.moveDown(1.2);
            doc.fillColor('#333').font('Helvetica').fontSize(12);
            accounts.forEach((acc: any) => {
                doc.text(acc.bankName || '-', { continued: true, width: columnWidths[0] });
                doc.text(acc.accountHolder || '-', { continued: true, width: columnWidths[1] });
                doc.text(acc.accountNumber || '-', { continued: true, width: columnWidths[2] });
                doc.text(acc.accountType || '-', { continued: true, width: columnWidths[3] });
                doc.text(acc.taxId || '-', { width: columnWidths[4] });
                doc.moveDown(0.4);
            });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#555').text(`Importante: Usa tu código de reserva ${booking.bookingCode} como referencia en la transferencia.`, { italics: true });
        }

        doc.moveDown(1);
        doc.fontSize(12).fillColor('#333').text('¡Esperamos verte pronto en el taller!');
        doc.moveDown(0.5);
        doc.text('Saludos,\\nEl equipo de CeramicAlma');

        // QR: usar import sin await en executor; generamos fuera antes de finalizar
        try {
            // @ts-ignore
            const QRCode = require('qrcode');
            const qrData = `https://ceramicalma.com/reservation/${booking.bookingCode}`;
            const qrPng = await QRCode.toDataURL(qrData, { margin: 1, width: 120 });
            const base64 = qrPng.replace(/^data:image\/png;base64,/, '');
            const qrBuffer = Buffer.from(base64, 'base64');
            doc.image(qrBuffer, doc.page.width - 150, doc.y - 30, { width: 100 });
        } catch (e) {
            // ignore
        }

        doc.end();
        // esperar que el stream termine
        await new Promise((res) => passthrough.on('end', res));
        return Buffer.concat(chunks);
    })();
}
