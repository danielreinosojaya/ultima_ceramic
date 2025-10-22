export async function generateQrPngBuffer(text: string, size = 300): Promise<Buffer> {
    // Dynamic import to avoid top-level type resolution issues in environments without types
    const QRCodeModule: any = await import('qrcode').then(m => m.default || m);
    const options = {
        type: 'png',
        width: size,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    } as any;
    const dataUrl = await QRCodeModule.toDataURL(text, options);
    const base64 = dataUrl.split(',')[1];
    return Buffer.from(base64, 'base64');
}
