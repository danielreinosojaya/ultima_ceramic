import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 🚀 Bunny CDN Upload Handler - Server-side only
 * 
 * Gestiona uploads seguros a Bunny CDN sin exponer credenciales al frontend.
 * Requiere variables de entorno:
 * - BUNNY_API_KEY: API key de Bunny Storage
 * - BUNNY_STORAGE_ZONE: Nombre de la storage zone
 * - BUNNY_CDN_HOSTNAME: Hostname del CDN (ej: cdn.example.b-cdn.net)
 */

const BUNNY_API_KEY = process.env.BUNNY_API_KEY || '';
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || '';
const BUNNY_CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME || '';
const BUNNY_API_BASE = `https://ny.storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}`;

// Validar que tenemos credenciales
if (!BUNNY_API_KEY || !BUNNY_STORAGE_ZONE) {
    console.warn('[BunnyUpload] WARNING: Bunny CDN credentials not configured. Photo uploads will fail.');
}

interface UploadPhotoRequest {
    base64Data: string;
    deliveryId: string;
    fileName?: string;
    mimeType?: string;
}

interface UploadPhotoResponse {
    success: boolean;
    url?: string;
    error?: string;
}

/**
 * Validar y limpiar base64
 */
function parseBase64(base64Data: string): { data: Buffer; mimeType: string } | null {
    try {
        // Handle data URLs
        let cleanBase64 = base64Data;
        let mimeType = 'image/jpeg';

        if (base64Data.startsWith('data:')) {
            const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
            if (!match) return null;
            mimeType = match[1];
            cleanBase64 = match[2];
        }

        // Validar base64 válido
        if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
            return null;
        }

        const buffer = Buffer.from(cleanBase64, 'base64');
        
        // Límite de tamaño (5MB máximo)
        if (buffer.length > 5 * 1024 * 1024) {
            return null;
        }

        return { data: buffer, mimeType };
    } catch (error) {
        console.error('[BunnyUpload] Error parsing base64:', error);
        return null;
    }
}

/**
 * Subir foto a Bunny CDN
 */
export async function uploadPhotoToBunny(request: UploadPhotoRequest): Promise<UploadPhotoResponse> {
    try {
        // Validar credenciales
        if (!BUNNY_API_KEY || !BUNNY_STORAGE_ZONE) {
            return { success: false, error: 'Bunny CDN not configured' };
        }

        // Validar solicitud
        if (!request.base64Data || !request.deliveryId) {
            return { success: false, error: 'Missing base64Data or deliveryId' };
        }

        // Parsear base64
        const parsed = parseBase64(request.base64Data);
        if (!parsed) {
            return { success: false, error: 'Invalid base64 data or file too large' };
        }

        // Generar nombre único
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const fileName = request.fileName || `photo-${timestamp}-${randomSuffix}.${getExtension(parsed.mimeType)}`;
        
        // Path seguro en Bunny
        const path = `deliveries/${request.deliveryId}/${fileName}`;
        const uploadUrl = `${BUNNY_API_BASE}/${path}`;

        // Upload a Bunny
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': BUNNY_API_KEY,
                'Content-Type': parsed.mimeType
            },
            body: parsed.data
        });

        if (!uploadResponse.ok) {
            const error = await uploadResponse.text();
            console.error('[BunnyUpload] Upload failed:', uploadResponse.status, error);
            return { success: false, error: `Upload failed: ${uploadResponse.statusText}` };
        }

        // Construir URL pública del CDN
        const cdnUrl = `https://${BUNNY_CDN_HOSTNAME}/deliveries/${request.deliveryId}/${fileName}`;

        console.log('[BunnyUpload] ✅ Photo uploaded successfully:', cdnUrl);

        return {
            success: true,
            url: cdnUrl
        };
    } catch (error) {
        console.error('[BunnyUpload] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Extensión de archivo basada en MIME type
 */
function getExtension(mimeType: string): string {
    const map: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif'
    };
    return map[mimeType] || 'jpg';
}

/**
 * API endpoint para upload seguro desde frontend
 * POST /api/upload-delivery-photo
 * Body: { base64Data: string, deliveryId: string }
 * Response: { success: boolean, url?: string, error?: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Solo POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { base64Data, deliveryId, fileName, mimeType } = req.body;

        // Validación básica
        if (!base64Data || !deliveryId) {
            return res.status(400).json({
                success: false,
                error: 'Missing base64Data or deliveryId'
            });
        }

        // Validar tamaño en base64 (requerimiento de que sea razonable)
        if (base64Data.length > 6 * 1024 * 1024) { // ~6MB en base64 = ~5MB binario
            return res.status(400).json({
                success: false,
                error: 'File too large (max 5MB)'
            });
        }

        // Upload a Bunny
        const result = await uploadPhotoToBunny({
            base64Data,
            deliveryId,
            fileName: fileName || `photo-${Date.now()}.jpg`,
            mimeType: mimeType || 'image/jpeg'
        });

        if (!result.success) {
            return res.status(500).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('[upload-delivery-photo] Error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed'
        });
    }
}
