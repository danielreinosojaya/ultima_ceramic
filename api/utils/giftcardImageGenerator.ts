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

// Usar Satori para convertir JSX-like a SVG, luego Sharp a PNG
// Satori NO requiere fonts del sistema, usa Google Fonts embebidas
export const generateGiftcardImage = async (data: GiftcardData, version: GiftcardVersion = 'v1'): Promise<Buffer> => {
  try {
    const width = 600;
    const height = 400;
    
    // JSX-like template para Satori
    const markup = {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f3ea 0%, #e8e4d8 100%)',
          border: '6px solid #a89c94',
          borderRadius: '20px',
          padding: '40px',
          fontFamily: 'sans-serif',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#9D8B7F',
                marginBottom: '30px',
                textAlign: 'center',
                letterSpacing: '2px',
              },
              children: 'REGALO ESPECIAL',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                width: '100%',
                fontSize: '18px',
                color: '#5a5a5a',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', alignItems: 'center' },
                    children: [
                      { type: 'span', props: { style: { marginRight: '10px', color: '#9D8B7F' }, children: 'Para:' } },
                      { type: 'span', props: { style: { fontWeight: 'bold' }, children: data.recipientName || '___________' } },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', alignItems: 'center' },
                    children: [
                      { type: 'span', props: { style: { marginRight: '10px', color: '#9D8B7F' }, children: 'De:' } },
                      { type: 'span', props: { style: { fontWeight: 'bold' }, children: data.senderName || '___________' } },
                    ],
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#D95F43',
                margin: '30px 0',
              },
              children: `$${data.amount}`,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#9D277D',
                letterSpacing: '3px',
                padding: '15px 30px',
                border: '2px dashed #9D277D',
                borderRadius: '10px',
                backgroundColor: '#fff',
              },
              children: data.code,
            },
          },
          data.message ? {
            type: 'div',
            props: {
              style: {
                fontSize: '14px',
                fontStyle: 'italic',
                color: '#666',
                marginTop: '20px',
                textAlign: 'center',
                maxWidth: '400px',
              },
              children: `"${data.message}"`,
            },
          } : null,
          {
            type: 'div',
            props: {
              style: {
                fontSize: '12px',
                color: '#999',
                marginTop: '30px',
                textAlign: 'center',
              },
              children: 'CeramicAlma • Holistic Pottery Studio',
            },
          },
        ].filter(Boolean),
      },
    };

    // Convertir a SVG usando Satori
    const svg = await satori(markup as any, {
      width,
      height,
      fonts: [], // Satori usa fonts embebidas por defecto
    });

    // Convertir SVG a PNG usando Sharp
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    return pngBuffer;
  } catch (error) {
    console.error('[generateGiftcardImage] Error:', error);
    throw new Error(`Failed to generate giftcard image: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateGiftcardImageBase64 = async (data: GiftcardData, version: GiftcardVersion = 'v1'): Promise<string> => {
  try {
    const buffer = await generateGiftcardImage(data, version);
    return buffer.toString('base64');
  } catch (error) {
    console.error('[generateGiftcardImageBase64] Error:', error);
    throw new Error(`Failed to generate base64 giftcard image: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateAllGiftcardVersions = async (data: GiftcardData): Promise<{ v1: string; v2: string }> => {
  try {
    // Por ahora solo generar v1, v2 puede ser variante de diseño
    const v1Base64 = await generateGiftcardImageBase64(data, 'v1');
    const v2Base64 = await generateGiftcardImageBase64(data, 'v2');
    
    return { v1: v1Base64, v2: v2Base64 };
  } catch (error) {
    console.error('[generateAllGiftcardVersions] Error:', error);
    throw new Error(`Failed to generate giftcard versions: ${error instanceof Error ? error.message : String(error)}`);
  }
};
