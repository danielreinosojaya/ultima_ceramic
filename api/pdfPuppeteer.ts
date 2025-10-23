import fs from 'fs';
import path from 'path';
import nunjucks from 'nunjucks';

nunjucks.configure(path.join(process.cwd(), 'templates'));

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
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' } });
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
  const fs = await import('fs');
  const path = await import('path');
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  let qrDataUrl = '';
  if (data.qrData) {
    // assume data.qrData is dataURL
    qrDataUrl = data.qrData;
  }
  const nunj = await import('nunjucks');
  nunj.configure(path.join(process.cwd(), 'templates'));
  return nunj.render('giftcard.html', {
    code: data.code,
    amount: Number(data.amount).toFixed(2),
    recipientName: data.recipientName,
    buyerName: data.buyerName,
    message: data.message,
    qrDataUrl
  });
}

export async function generateGiftcardPdf(data: any) {
  const html = await renderGiftcardHtml(data);
  return generatePdfFromHtml(html);
}
