import { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';
import { sendEmailAsAlianza } from './emailService.js';

export default async (req: VercelRequest, res: VercelResponse) => {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    // Parámetros con defaults
    const {
      email = 'danielreinosojaya@gmail.com',
      subject = 'Propuesta de Alianza Ceramicalma',
      templatePath = 'templates/email_alianza_conciso.html'
    } = req.body;

    // Validar email
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Leer template
    const fullPath = path.join(process.cwd(), templatePath);
    const htmlContent = fs.readFileSync(fullPath, 'utf-8');

    // Enviar email
    const result = await sendEmailAsAlianza(email, subject, htmlContent);

    // Respuesta
    if (result && 'sent' in result) {
      if (result.sent) {
        return res.status(200).json({
          success: true,
          message: 'Email enviado desde alianza@ceramicalma.com',
          email,
          subject,
          ...(result.providerResponse?.id && { emailId: result.providerResponse.id })
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error al enviar email',
          ...(result.dryRunPath && { dryRunPath: result.dryRunPath })
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Respuesta desconocida del servicio'
    });

  } catch (error: any) {
    console.error('[sendAlianzaEmail] Error:', error);
    return res.status(500).json({
      error: 'Error al enviar email',
      details: error.message
    });
  }
};
