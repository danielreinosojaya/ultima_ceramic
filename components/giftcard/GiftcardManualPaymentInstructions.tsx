import React from 'react';
import * as dataService from '../../services/dataService';

export const GiftcardManualPaymentInstructions: React.FC<{ onFinish: () => void; amount: number; personalization: any; deliveryMethod: { type: string; data?: any }; buyerEmail: string }> = ({ onFinish, amount, personalization, deliveryMethod, buyerEmail }) => {
  // Generar código único (ejemplo: GIF-XXXXXX)
  const [copied, setCopied] = React.useState(false);
  const code = React.useMemo(() => {
    // Si ya existe en personalization, úsalo, si no genera uno
    if (personalization?.code) return personalization.code;
    return 'GIF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }, [personalization]);

  const whatsappNumber = '+593985813327';
  let destinatarioLabel = '';
  let destinatarioValue = '';
  if (deliveryMethod?.type === 'whatsapp') {
    destinatarioLabel = 'WhatsApp destinatario';
    destinatarioValue = deliveryMethod?.data?.whatsapp || '';
  } else if (deliveryMethod?.type === 'email') {
    destinatarioLabel = 'Email destinatario';
    destinatarioValue = deliveryMethod?.data?.email || '';
  } else {
    destinatarioLabel = '';
    destinatarioValue = '';
  }
  const message = encodeURIComponent(
    `Hola! Adjunto el comprobante de pago para mi giftcard.\nCódigo: ${code}` +
    (destinatarioLabel && destinatarioValue ? `\n${destinatarioLabel}: ${destinatarioValue}` : '')
  );
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${message}`;
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center p-0 bg-brand-background rounded-3xl shadow-2xl border border-brand-border">
      <div className="w-full rounded-t-3xl px-10 pt-10 pb-6 bg-white border-b border-brand-border">
        <h2 className="text-3xl font-display font-extrabold mb-2 text-brand-primary text-center tracking-wide">Instrucciones de pago</h2>
        <p className="text-brand-secondary text-center text-lg mb-2">Completa tu compra con una transferencia segura.</p>
      </div>
      <div className="w-full px-8 py-6 flex flex-col gap-6 items-center bg-brand-background rounded-xl shadow-lg mt-6 mb-4 border border-brand-border">
        {/* Código único */}
        <div className="w-full flex flex-col items-center mb-2">
          <span className="text-brand-secondary font-semibold text-base mb-1">Código de pago</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold text-brand-primary bg-white rounded px-3 py-1 border border-brand-border select-all">{code}</span>
            <button
              className={`text-xs px-2 py-1 rounded-full bg-brand-primary text-white shadow hover:bg-brand-accent transition-colors ${copied ? 'opacity-70' : ''}`}
              onClick={() => {navigator.clipboard.writeText(code); setCopied(true); setTimeout(()=>setCopied(false),1200);}}
            >{copied ? 'Copiado' : 'Copiar'}</button>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-block bg-brand-primary/10 rounded-full p-2">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M4 7v10a2 2 0 002 2h12a2 2 0 002-2V7" stroke="#6c7a89" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="2" y="3" width="20" height="4" rx="2" fill="#fff" stroke="#6c7a89" strokeWidth="2"/></svg>
          </span>
          <span className="text-xl font-bold text-brand-primary">Banco Pichincha</span>
        </div>
        <div className="w-full grid grid-cols-2 gap-2 text-brand-secondary text-base mb-2">
          <span className="font-semibold">Monto:</span>
          <span className="font-bold text-brand-primary">${amount}</span>
          <span className="font-semibold">Titular:</span>
          <span className="font-bold text-brand-primary">Carolina Massuh Morán</span>
          <span className="font-semibold">Número:</span>
          <span className="font-bold text-brand-primary">2100334248</span>
          <span className="font-semibold">Tipo:</span>
          <span className="font-bold text-brand-primary">Cuenta Corriente</span>
          <span className="font-semibold">Cédula:</span>
          <span className="font-bold text-brand-primary">0921343935</span>
        </div>
      </div>
      <div className="w-full px-8 pb-8 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-block bg-brand-primary/10 rounded-full p-2">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M17.472 14.382l-2.54-.363a.96.96 0 00-.917.277l-1.11 1.13a8.354 8.354 0 01-3.98-3.98l1.13-1.11a.96.96 0 00.277-.917l-.363-2.54A.96.96 0 009.06 5.5H6.528A1.03 1.03 0 005.5 6.528c0 6.627 5.373 12 12 12a1.03 1.03 0 001.028-1.028V14.94a.96.96 0 00-.556-.558z" stroke="#6c7a89" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          <span className="text-lg font-bold text-brand-primary">WhatsApp</span>
          <span className="text-base font-semibold text-brand-primary ml-2">+593 98 581 3327</span>
        </div>
        <span className="text-brand-primary font-semibold text-center">1. Realiza la transferencia por el monto indicado a cualquiera de las cuentas.</span>
        <span className="text-brand-primary font-semibold text-center">
          2. Envía el comprobante por WhatsApp junto con {deliveryMethod?.type === 'schedule' ? 'el correo electrónico del destinatario y ' : ''}{destinatarioLabel && `${destinatarioLabel.toLowerCase()}: ${destinatarioValue}, `}el código de pago.
        </span>
        <span className="text-brand-secondary text-sm text-center">Recibirás un correo de confirmación cuando tu pago sea procesado por nuestro equipo.</span>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 mt-2 rounded-full bg-green-600 text-white font-bold text-lg shadow-md hover:bg-green-700 transition-colors text-center"
        >
          Enviar comprobante por WhatsApp
        </a>
      </div>
      <div className="w-full px-8 pb-8">
        <button
          className="w-full py-3 rounded-full bg-brand-primary text-white font-bold text-lg shadow-md hover:scale-[1.03] hover:bg-brand-primary/90 transition-all duration-150"
          onClick={async () => {
            await dataService.addGiftcardRequest({
              buyerName: personalization?.sender || '',
              buyerEmail: buyerEmail,
              recipientName: personalization?.recipient || '',
              recipientEmail: deliveryMethod?.type === 'email' ? deliveryMethod?.data?.email || '' : '',
              recipientWhatsapp: deliveryMethod?.type === 'whatsapp' ? deliveryMethod?.data?.phone || '' : '',
              amount,
              code,
              message: personalization?.message || '',
              sendMethod: deliveryMethod?.type,
              scheduledSendAt: deliveryMethod?.data?.scheduled ? `${deliveryMethod.data.sendDate}T${deliveryMethod.data.sendTime}:00` : null
            });
            onFinish();
          }}
        >
          Finalizar
        </button>
      </div>
    </div>
  );
};