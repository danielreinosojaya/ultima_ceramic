/** Estado de entrega de gift card al destinatario (cron Resend / admin). */

export type GiftcardDeliveryNoticeStatus =
  | 'sent'
  | 'failed'
  | 'skipped'
  | 'pending_cron'
  | 'whatsapp_ready'
  | 'not_sent';

export type GiftcardDeliveryNotice = {
  status: GiftcardDeliveryNoticeStatus;
  source?: 'cron' | 'admin' | 'approve';
  method?: 'email' | 'whatsapp';
  at?: string;
  error?: string;
  provider?: string;
  providerId?: string;
  seen?: boolean;
};

function metaOf(req: { metadata?: Record<string, any> | null }): Record<string, any> {
  return (req.metadata && typeof req.metadata === 'object') ? req.metadata : {};
}

export function getGiftcardDeliveryNotice(req: {
  status?: string;
  scheduledSendAt?: string | null;
  sendMethod?: string;
  metadata?: Record<string, any> | null;
}): GiftcardDeliveryNotice | null {
  const meta = metaOf(req);
  const stored = meta.deliveryNotice as GiftcardDeliveryNotice | undefined;
  if (stored && stored.status) return stored;

  if (meta.scheduled_send_completed === true || meta.whatsapp_sent_at) {
    return {
      status: meta.whatsapp_sent_at ? 'whatsapp_ready' : 'sent',
      method: meta.whatsapp_sent_at ? 'whatsapp' : 'email',
      at: meta.scheduled_sent_at || meta.whatsapp_sent_at,
      source: 'cron',
    };
  }

  const recipient = meta.emailDelivery?.recipient;
  if (recipient?.sent === true) {
    return { status: 'sent', method: 'email', at: recipient.sentAt, provider: 'resend' };
  }
  if (recipient?.sent === false) {
    return {
      status: 'failed',
      method: 'email',
      error: recipient.error || 'Resend no confirmó el envío',
      at: recipient.sentAt,
      provider: 'resend',
    };
  }

  const scheduled = req.scheduledSendAt;
  if (scheduled && req.status === 'approved') {
    const due = new Date(scheduled).getTime() <= Date.now();
    if (!due) return { status: 'pending_cron', method: (req.sendMethod as any) || 'email', at: scheduled };
    return { status: 'not_sent', method: (req.sendMethod as any) || 'email', at: scheduled, error: 'El cron aún no entregó esta gift card' };
  }

  if (req.status === 'delivered') {
    return { status: 'sent', method: 'email' };
  }

  return null;
}

export function deliveryNoticeNeedsAttention(notice: GiftcardDeliveryNotice | null): boolean {
  if (!notice) return false;
  return notice.status === 'failed' || notice.status === 'skipped' || notice.status === 'not_sent';
}

export function deliveryNoticeSourceLabel(notice: GiftcardDeliveryNotice): string {
  if (notice.source === 'cron') return 'Cron del servidor';
  if (notice.source === 'approve') return 'Al aprobar';
  if (notice.source === 'admin') return 'Admin (enviar ahora)';
  return 'Servidor';
}

export function deliveryNoticeLabel(notice: GiftcardDeliveryNotice): { label: string; className: string; pin: string } {
  switch (notice.status) {
    case 'sent':
      return { label: 'Enviada (Resend)', className: 'bg-emerald-100 text-emerald-900 border-emerald-300', pin: '🟢' };
    case 'whatsapp_ready':
      return { label: 'WhatsApp listo (no auto)', className: 'bg-sky-100 text-sky-900 border-sky-300', pin: '🔵' };
    case 'pending_cron':
      return { label: 'Programada · espera cron', className: 'bg-violet-100 text-violet-900 border-violet-300', pin: '🟣' };
    case 'not_sent':
      return { label: 'No entregada', className: 'bg-amber-100 text-amber-900 border-amber-300', pin: '🟡' };
    case 'skipped':
      return { label: 'Omitida por el servidor', className: 'bg-slate-200 text-slate-800 border-slate-400', pin: '⚪' };
    case 'failed':
    default:
      return { label: 'Error de envío', className: 'bg-red-100 text-red-900 border-red-300', pin: '🔴' };
  }
}
