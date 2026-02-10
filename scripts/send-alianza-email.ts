import * as fs from 'fs';
import * as path from 'path';
type EmailServiceModule = typeof import('../api/emailService.js');

const sendAlianzaTestEmail = async () => {
  try {
    let emailService: EmailServiceModule;
    try {
      emailService = await import('../api/emailService.js');
    } catch {
      emailService = await import('../api/emailService.ts');
    }

    // Leer el template HTML
    const templatePath = path.join(process.cwd(), 'templates', 'email_alianza_conciso.html');
    const html = fs.readFileSync(templatePath, 'utf-8');

    // Datos del email
    const to = 'danielreinosojaya@gmail.com';
    const subject = 'Propuesta de Alianza Ceramicalma';

    console.log('📧 Enviando email desde alianza@ceramicalma.com...');
    console.log(`   Destinatario: ${to}`);
    console.log(`   Asunto: ${subject}`);
    console.log('');

    // Enviar email
    const result = await emailService.sendEmailAsAlianza(to, subject, html);

    if (result && 'sent' in result) {
      if (result.sent) {
        console.log('✅ Email enviado exitosamente');
        if (result.providerResponse?.id) {
          console.log(`   ID: ${result.providerResponse.id}`);
        }
      } else {
        console.log('❌ Error al enviar email');
        if (result.dryRunPath) {
          console.log(`   Guardado en: ${result.dryRunPath}`);
        }
      }
    } else {
      console.log('⚠️  Respuesta desconocida:', result);
    }
  } catch (error) {
    console.error('❌ Error al ejecutar script:', error);
    process.exit(1);
  }
};

sendAlianzaTestEmail();
