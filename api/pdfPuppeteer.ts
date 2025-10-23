import fs from 'fs';
import path from 'path';
let _nunjucks: any = null;
async function getNunjucks() {
  if (_nunjucks) return _nunjucks;
  // dynamic import so TypeScript won't require types at compile time
  // @ts-ignore - third-party lib may not have types in this repo
  const mod: any = await import('nunjucks');
  _nunjucks = mod.default || mod;
  _nunjucks.configure(path.join(process.cwd(), 'templates'));
  return _nunjucks;
}

export async function renderReceiptHtml(data: any) {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  let logoDataUrl = '';
  try {
    if (fs.existsSync(logoPath)) {
      const b = fs.readFileSync(logoPath);
      logoDataUrl = `data:image/png;base64,${b.toString('base64')}`;
    }
  } catch (e) {
    // ignore
  }
  const nunjucks = await getNunjucks();
  const html = nunjucks.render('receipt.html', {
    title: `Recibo ${data.booking?.bookingCode || ''}`,
    logoDataUrl,
    firstName: data.booking?.userInfo?.firstName || 'Cliente',
    productName: data.booking?.product?.name || '',
    bookingCode: data.booking?.bookingCode || '',
    amount: data.booking?.price ? `$${Number(data.booking.price).toFixed(2)}` : '',
    bankRows: Array.isArray(data.bankDetails) ? data.bankDetails : data.bankDetails ? [data.bankDetails] : []
  });
  return html;
}

export async function generatePdfFromHtml(html: string) {
  // dynamic import puppeteer to keep dependency optional
  const puppeteer = await import('puppeteer').catch(() => null);
  if (!puppeteer) throw new Error('puppeteer not installed. Run: npm i -D puppeteer');
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
    const page = await browser.newPage();
    // Set a wide viewport and a higher deviceScaleFactor to better match desktop rendering and improve PDF raster quality
    await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1.5 });
    // Use screen media to apply the same CSS used for screen rendering
    try { await page.emulateMediaType('screen'); } catch (e) {}
    await page.setContent(html, { waitUntil: 'networkidle0' });
    // Use preferCSSPageSize so @page rules in the template control sizing and avoid page breaks
    const buffer = await page.pdf({ printBackground: true, preferCSSPageSize: true });
    return buffer;
  } finally {
    await browser.close();
  }
}

export async function generateReceiptPdf(data: any) {
  const html = await renderReceiptHtml(data);
  return generatePdfFromHtml(html);
}

export async function renderGiftcardHtml(data: any) {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  let qrDataUrl = '';
  if (data.qrData) qrDataUrl = data.qrData;
  // embed logo if available
  let logoDataUrl = '';
  try {
    if (fs.existsSync(logoPath)) {
      const b = fs.readFileSync(logoPath);
      logoDataUrl = `data:image/png;base64,${b.toString('base64')}`;
    }
  } catch (e) {}

  const nunjucks = await getNunjucks();
  return nunjucks.render('giftcard.html', {
    code: data.code,
    amount: Number(data.amount).toFixed(2),
    recipientName: data.recipientName,
    buyerName: data.buyerName,
    message: data.message,
    qrDataUrl,
    logoDataUrl
  });
}

export async function generateGiftcardPdf(data: any) {
  const html = await renderGiftcardHtml(data);
  return generatePdfFromHtml(html);
}
