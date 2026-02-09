import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendEmailAsAlianza, getAlianzaEmailTemplate } from '../services/emailService';

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const {
      to = 'danielreinosojaya@gmail.com',
      subject = 'Propuesta de Alianza Ceramicalma'
    } = req.body;

    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const html = getAlianzaEmailTemplate();
    const result = await sendEmailAsAlianza(to, subject, html);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Email enviado exitosamente desde alianza@ceramicalma.com',
        email: to
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Error al enviar email',
        error: result.error
      });
    }

  } catch (error: any) {
    console.error('[sendAlianzaEmail] Error:', error);
    return res.status(500).json({
      error: 'Error al enviar email',
      details: error.message
    });
  }
};
