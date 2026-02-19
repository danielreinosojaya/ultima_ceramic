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
const BUNNY_STORAGE_HOSTNAME = (process.env.BUNNY_STORAGE_HOSTNAME || 'ny.storage.bunnycdn.com')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
const BUNNY_CDN_HOSTNAME = (process.env.BUNNY_CDN_HOSTNAME || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
const BUNNY_API_BASE = `https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}`;

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
        console.log('[parseBase64] Input size:', base64Data?.length);
        
        // Handle data URLs
        let cleanBase64 = base64Data;
        let mimeType = 'image/jpeg';

        if (base64Data.startsWith('data:')) {
            console.log('[parseBase64] Detected data URL, extracting MIME and base64...');
            const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
            if (!match) {
                console.error('[parseBase64] Failed to match data URL pattern');
                return null;
            }
            mimeType = match[1];
            cleanBase64 = match[2];
            console.log('[parseBase64] Extracted MIME:', mimeType, 'Base64 size:', cleanBase64.length);
        }

        // Validar base64 válido
        if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
            console.error('[parseBase64] Invalid base64 characters');
            return null;
        }

        console.log('[parseBase64] Creating buffer from base64...');
        const buffer = Buffer.from(cleanBase64, 'base64');
        
        console.log('[parseBase64] Buffer created, size:', buffer.length);
        
        // Límite de tamaño (5MB máximo)
        if (buffer.length > 5 * 1024 * 1024) {
            console.error('[parseBase64] File too large:', buffer.length, 'bytes (max 5MB)');
            return null;
        }

        console.log('[parseBase64] ✅ Successfully parsed, mimeType:', mimeType);
        return { data: buffer, mimeType };
    } catch (error) {
        console.error('[parseBase64] Exception:', error);
        return null;
    }
}

/**
 * Subir foto a Bunny CDN
 */
export async function uploadPhotoToBunny(request: UploadPhotoRequest): Promise<UploadPhotoResponse> {
    console.log('[uploadPhotoToBunny] Starting upload with request:', { 
        deliveryId: request.deliveryId,
        base64Size: request.base64Data?.length,
        fileName: request.fileName,
        mimeType: request.mimeType
    });
    
    try {
        // Validar credenciales
        if (!BUNNY_API_KEY || !BUNNY_STORAGE_ZONE) {
            console.error('[uploadPhotoToBunny] Credentials missing:', { 
                hasKey: !!BUNNY_API_KEY,
                hasZone: !!BUNNY_STORAGE_ZONE
            });
            return { success: false, error: 'Bunny CDN not configured' };
        }

        // Validar solicitud
        if (!request.base64Data || !request.deliveryId) {
            console.error('[uploadPhotoToBunny] Missing required fields');
            return { success: false, error: 'Missing base64Data or deliveryId' };
        }

        // Parsear base64
        console.log('[uploadPhotoToBunny] Parsing base64...');
        const parsed = parseBase64(request.base64Data);
        if (!parsed) {
            console.error('[uploadPhotoToBunny] Failed to parse base64');
            return { success: false, error: 'Invalid base64 data or file too large' };
        }

        console.log('[uploadPhotoToBunny] Base64 parsed successfully, size:', parsed.data.length);

        // Generar nombre único
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const fileName = request.fileName || `photo-${timestamp}-${randomSuffix}.${getExtension(parsed.mimeType)}`;
        
        // Path seguro en Bunny
        const path = `deliveries/${request.deliveryId}/${fileName}`;
        const uploadUrl = `${BUNNY_API_BASE}/${path}`;

        console.log('[uploadPhotoToBunny] Uploading to Bunny:', { path, uploadUrl: uploadUrl.substring(0, 50) + '...' });

        // Upload a Bunny
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': BUNNY_API_KEY,
                'Content-Type': parsed.mimeType
            },
            body: parsed.data
        });

        console.log('[uploadPhotoToBunny] Bunny response status:', uploadResponse.status);

        if (!uploadResponse.ok) {
            const error = await uploadResponse.text();
            console.error('[uploadPhotoToBunny] Upload failed:', uploadResponse.status, error);
            return { success: false, error: `Upload failed: ${uploadResponse.statusText}` };
        }

        if (!BUNNY_CDN_HOSTNAME) {
            return { success: false, error: 'BUNNY_CDN_HOSTNAME not configured' };
        }

        // Construir URL pública del CDN
        const cdnUrl = `https://${BUNNY_CDN_HOSTNAME}/deliveries/${request.deliveryId}/${fileName}`;

        console.log('[uploadPhotoToBunny] ✅ Photo uploaded successfully:', cdnUrl);

        return {
            success: true,
            url: cdnUrl
        };
    } catch (error) {
        console.error('[uploadPhotoToBunny] Exception:', error);
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
