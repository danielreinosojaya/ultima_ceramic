import { sql } from '@vercel/postgres';
import { uploadPhotoToBunny } from '../api/bunnyUpload.js';

type DeliveryRow = { id: string; photos: unknown };

type Args = {
  dryRun: boolean;
  batchSize: number;
  maxLoops: number;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const getNumber = (prefix: string, fallback: number): number => {
    const found = args.find((arg) => arg.startsWith(prefix));
    if (!found) return fallback;
    const value = Number(found.split('=')[1]);
    if (!Number.isFinite(value)) return fallback;
    return Math.max(1, Math.floor(value));
  };

  return {
    dryRun: args.includes('--dry-run'),
    batchSize: getNumber('--batch=', 25),
    maxLoops: getNumber('--max-loops=', 200)
  };
}

function normalizePhotos(rawPhotos: unknown): string[] {
  if (!rawPhotos) return [];
  let parsed = rawPhotos;

  if (typeof rawPhotos === 'string') {
    try {
      parsed = JSON.parse(rawPhotos);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((photo) => typeof photo === 'string')
    .map((photo) => photo.trim())
    .filter(Boolean);
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isDataUrlBase64(value: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

function isRawBase64(value: string): boolean {
  return value.length > 100 && /^[A-Za-z0-9+/=]+$/.test(value);
}

function isBase64Candidate(value: string): boolean {
  return isDataUrlBase64(value) || isRawBase64(value);
}

async function run(): Promise<void> {
  const { dryRun, batchSize, maxLoops } = parseArgs();
  const bunnyEnabled = Boolean(process.env.BUNNY_API_KEY && process.env.BUNNY_STORAGE_ZONE && process.env.BUNNY_CDN_HOSTNAME);

  if (!dryRun && !bunnyEnabled) {
    throw new Error('Bunny CDN is not configured in environment variables');
  }

  const summary = {
    dryRun,
    loops: 0,
    scannedDeliveries: 0,
    processedDeliveries: 0,
    updatedDeliveries: 0,
    migratedPhotos: 0,
    failedPhotos: 0,
    skippedInvalidPhotos: 0,
    alreadyUrlPhotos: 0
  };

  console.log('[migration] starting', { dryRun, batchSize, maxLoops, bunnyEnabled });

  let consecutiveNoMigrationLoops = 0;

  while (summary.loops < maxLoops) {
    summary.loops += 1;

    const { rows } = await sql.query(
      `
      SELECT id, photos
      FROM deliveries
      WHERE photos IS NOT NULL
        AND photos::text ILIKE '%data:image%'
      ORDER BY created_at ASC
      LIMIT $1
      `,
      [batchSize]
    );

    const deliveries = (rows as DeliveryRow[])
      .map((row) => ({ id: String(row.id), photos: normalizePhotos(row.photos) }))
      .filter((row) => row.photos.some(isBase64Candidate));

    summary.scannedDeliveries += rows.length;

    if (deliveries.length === 0) {
      console.log('[migration] no more deliveries with base64 photos found');
      break;
    }

    let migratedThisLoop = 0;

    for (const delivery of deliveries) {
      summary.processedDeliveries += 1;

      const updatedPhotos: string[] = [];
      let migratedForDelivery = 0;

      for (let index = 0; index < delivery.photos.length; index += 1) {
        const photo = delivery.photos[index];

        if (isUrl(photo)) {
          summary.alreadyUrlPhotos += 1;
          updatedPhotos.push(photo);
          continue;
        }

        if (!isBase64Candidate(photo)) {
          summary.skippedInvalidPhotos += 1;
          updatedPhotos.push(photo);
          continue;
        }

        if (dryRun) {
          updatedPhotos.push(photo);
          continue;
        }

        const uploadResult = await uploadPhotoToBunny({
          deliveryId: delivery.id,
          base64Data: photo,
          fileName: `migrated-${delivery.id}-${index + 1}-${Date.now()}.jpg`,
          mimeType: 'image/jpeg'
        });

        if (uploadResult.success && uploadResult.url) {
          updatedPhotos.push(uploadResult.url);
          summary.migratedPhotos += 1;
          migratedThisLoop += 1;
          migratedForDelivery += 1;
        } else {
          updatedPhotos.push(photo);
          summary.failedPhotos += 1;
          console.error('[migration] upload failed', {
            deliveryId: delivery.id,
            photoIndex: index,
            error: uploadResult.error
          });
        }
      }

      if (!dryRun && migratedForDelivery > 0) {
        await sql`
          UPDATE deliveries
          SET photos = ${JSON.stringify(updatedPhotos)}
          WHERE id = ${delivery.id}
        `;
        summary.updatedDeliveries += 1;
      }
    }

    if (migratedThisLoop === 0) {
      consecutiveNoMigrationLoops += 1;
      if (consecutiveNoMigrationLoops >= 2) {
        console.warn('[migration] stopping due to no migration progress in 2 consecutive loops');
        break;
      }
    } else {
      consecutiveNoMigrationLoops = 0;
    }
  }

  const pending = await sql.query(
    `
    SELECT COUNT(*)::int AS count
    FROM deliveries
    WHERE photos IS NOT NULL
      AND photos::text ILIKE '%data:image%'
    `
  );

  const pendingCount = Number(pending.rows?.[0]?.count || 0);

  console.log('[migration] completed', {
    ...summary,
    pendingDeliveriesWithDataUrl: pendingCount
  });
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[migration] fatal error', error);
    process.exit(1);
  });
