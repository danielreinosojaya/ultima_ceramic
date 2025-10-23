const fs = require('fs');
const path = require('path');

(async function(){
  const outDir = path.join('/tmp','ceramicalma-emails');
  try { fs.mkdirSync(outDir, { recursive: true }); } catch (e) {}
  const html = `<!doctype html><html><body><h1>Prueba Giftcard</h1><p>Codigo: GC-TEST123</p></body></html>`;
  const pdfBase64 = 'JVBERi0x...FAKEBASE64...';
  const attachments = [{ filename: 'giftcard-GC-TEST123.pdf', content: pdfBase64, type: 'application/pdf' }];
  const safeTo = 'test-recipient@example.com'.replace(/[@<>\\/\\s]/g,'_').slice(0,64);
  const safeSubject = 'Has recibido una Giftcard'.replace(/[^a-zA-Z0-9-_ ]/g,'').slice(0,48).replace(/\s+/g,'_');
  const filename = `${Date.now()}_${safeTo}_${safeSubject}.json`;
  const filePath = path.join(outDir, filename);
  const payload = { to: 'test-recipient@example.com', subject: 'Has recibido una Giftcard', html, attachments };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Dry-run payload written to', filePath);
})();
