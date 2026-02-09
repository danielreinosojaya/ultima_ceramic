import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const to = typeof body.to === 'string' ? body.to : 'danielreinosojaya@gmail.com';
    const subject = typeof body.subject === 'string' ? body.subject : 'Propuesta de Alianza Ceramicalma';
    const htmlOverride = typeof body.html === 'string' ? body.html : undefined;

    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const { sendEmailAsAlianza, getAlianzaEmailTemplate } = await import('./emailService');
    const html = htmlOverride || getAlianzaEmailTemplate();
    const result = await sendEmailAsAlianza(to, subject, html);

    if (result && 'sent' in result && result.sent) {
      return res.status(200).json({
        success: true,
        message: 'Email enviado exitosamente desde alianza@ceramicalma.com',
        email: to
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Error al enviar email',
      error: result && 'error' in result ? result.error : undefined,
      dryRunPath: result && 'dryRunPath' in result ? result.dryRunPath : undefined
    });
  } catch (error: any) {
    console.error('[sendAlianzaEmail] Error:', error);
    return res.status(500).json({
      error: 'Error al enviar email',
      details: error.message
    });
  }
};
