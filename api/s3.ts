import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';


const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
const bucket = process.env.GIFTcards_S3_BUCKET || process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
export const defaultBucket = bucket;

let s3: any = null;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && bucket) {
    s3 = new S3Client({ region });
}

export async function uploadBufferToS3(key: string, buffer: Buffer, contentType: string) {
    if (!s3 || !bucket) {
        console.warn('S3 not configured; skipping upload for', key);
        return null;
    }

    const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'private'
    });

    await s3.send(cmd);
    // Return an S3 URL (private) - caller should use signed URLs if needed
    return `s3://${bucket}/${key}`;
}

export function generateS3Key(prefix: string, filename: string) {
    const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const now = Date.now();
    return `${prefix}/${now}_${safeName}`;
}

export async function generatePresignedGetUrl(key: string, expiresInSeconds = 60 * 60) {
    if (!s3 || !bucket) {
        console.warn('S3 not configured; cannot generate presigned URL for', key);
        return null;
    }
    try {
        const cmd = new PutObjectCommand({ Bucket: bucket, Key: key });
        const url = await getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
        return url;
    } catch (err) {
        console.warn('Failed to generate presigned URL for', key, err);
        return null;
    }
}
