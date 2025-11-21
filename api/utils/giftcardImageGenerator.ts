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

// Diseño minimalista con HTML/CSS que Satori convierte a PNG
const createGiftcardSVG = (data: GiftcardData): any => {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '600px',
        height: '400px',
        background: 'linear-gradient(135deg, #f5f3ea 0%, #e8e3d6 100%)',
        border: '3px solid #a89c94',
        borderRadius: '20px',
        padding: '40px',
        fontFamily: 'Arial, sans-serif',
        position: 'relative',
      },
      children: [
        // Título
        {
          type: 'div',
          props: {
            style: {
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#958985',
              textAlign: 'center',
              marginBottom: '40px',
              letterSpacing: '2px',
            },
            children: 'REGALO ESPECIAL',
          },
        },
        // Para y De
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              marginBottom: '30px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: '18px',
                    color: '#666',
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: { width: '80px', fontWeight: 'normal' },
                        children: 'para:',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: { fontWeight: 'bold', color: '#333' },
                        children: data.recipientName || '',
                      },
                    },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: '18px',
                    color: '#666',
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: { width: '80px', fontWeight: 'normal' },
                        children: 'de:',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: { fontWeight: 'bold', color: '#333' },
                        children: data.senderName || '',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        // Valor y Código
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '15px',
              marginTop: 'auto',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '22px',
                    color: '#666',
                  },
                  children: `Valor: $${data.amount}`,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#9D277D',
                    letterSpacing: '3px',
                    marginTop: '10px',
                  },
                  children: data.code,
                },
              },
            ],
          },
        },
        // Mensaje si existe
        data.message
          ? {
              type: 'div',
              props: {
                style: {
                  fontSize: '14px',
                  fontStyle: 'italic',
                  color: '#555',
                  textAlign: 'center',
                  marginTop: '20px',
                },
                children: `"${data.message}"`,
              },
            }
          : null,
        // Logo/Marca
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: '20px',
              right: '30px',
              fontSize: '14px',
              color: '#999',
              fontWeight: 'bold',
            },
            children: 'CERAMICALMA',
          },
        },
      ].filter(Boolean),
    },
  };
};

export const generateGiftcardImage = async (
  data: GiftcardData,
  version: GiftcardVersion = 'v1'
): Promise<Buffer> => {
  try {
    // Crear SVG con Satori
    const svg = await satori(createGiftcardSVG(data), {
      width: 600,
      height: 400,
      fonts: [], // Satori usa fuentes embebidas
    });

    // Convertir SVG a PNG con Sharp
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
