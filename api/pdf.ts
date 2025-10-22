import stream from 'stream';

export async function generateVoucherPdfBuffer(data: {
    buyerName: string;
    recipientName: string;
    amount: number;
    code: string;
    note?: string;
    qrPngBuffer?: Buffer;
}) {
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
