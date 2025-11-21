import satori from 'satori';
import sharp from 'sharp';

export interface GiftcardData {
  code: string;
  amount: number;
  recipientName?: string;
  senderName?: string;
  message?: string;
}

export type GiftcardVersion = 'v1' | 'v2';

export const generateGiftcardImage = async (
  data: GiftcardData,
  version: GiftcardVersion = 'v1'
): Promise<Buffer> => {
  try {
    // JSX element para convertir a SVG
    const jsx = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '600px',
          height: '400px',
          background: 'linear-gradient(135deg, #f5f3ea 0%, #e8e3d6 100%)',
          border: '6px solid #a89c94',
          borderRadius: '20px',
          padding: '40px',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        {/* Título */}
        <div
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#958985',
            textAlign: 'center',
            marginBottom: '40px',
            letterSpacing: '2px',
          }}
        >
          REGALO ESPECIAL
        </div>

        {/* Para y De */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            marginBottom: '30px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '18px',
              color: '#666',
            }}
          >
            <span style={{ width: '80px', fontWeight: '400' }}>para:</span>
            <span style={{ fontWeight: 'bold', color: '#333', flex: 1 }}>
              {data.recipientName || 'María'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '18px',
              color: '#666',
            }}
          >
            <span style={{ width: '80px', fontWeight: '400' }}>de:</span>
            <span style={{ fontWeight: 'bold', color: '#333', flex: 1 }}>
              {data.senderName || 'Juan'}
            </span>
          </div>
        </div>

        {/* Valor y Código */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px',
            marginTop: 'auto',
          }}
        >
          <div
            style={{
              fontSize: '22px',
              color: '#666',
            }}
          >
            Valor: ${data.amount}
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#9D277D',
              letterSpacing: '3px',
              marginTop: '10px',
            }}
          >
            {data.code}
          </div>
        </div>

        {/* Mensaje si existe */}
        {data.message && (
          <div
            style={{
              fontSize: '14px',
              fontStyle: 'italic',
              color: '#555',
              textAlign: 'center',
              marginTop: '20px',
            }}
          >
            "{data.message}"
          </div>
        )}

        {/* Logo */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '30px',
            fontSize: '14px',
            color: '#999',
            fontWeight: 'bold',
          }}
        >
          CERAMICALMA
        </div>
      </div>
    );

    // Convertir JSX a SVG sin necesitar fonts especificados
    const svg = await satori(jsx as any, {
      width: 600,
      height: 400,
      fonts: [],
    });

    // Convertir SVG a PNG
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    return pngBuffer;
  } catch (error) {
    console.error('[generateGiftcardImage] Error:', error);
    throw error;
  }
};

export const generateGiftcardImageBase64 = async (
  data: GiftcardData,
  version: GiftcardVersion = 'v1'
): Promise<string> => {
  const buffer = await generateGiftcardImage(data, version);
  return buffer.toString('base64');
};

export const generateAllGiftcardVersions = async (
  data: GiftcardData
): Promise<{ v1: string; v2: string }> => {
  try {
    // Generar solo v1 (puedes hacer v2 diferente después)
    const v1Base64 = await generateGiftcardImageBase64(data, 'v1');
    
    return { v1: v1Base64, v2: v1Base64 }; // Ambas iguales por ahora
  } catch (error) {
    console.error('[generateAllGiftcardVersions] Error:', error);
    // Si falla, retornar vacíos para que el email se envíe sin attachments
    return { v1: '', v2: '' };
  }
};
