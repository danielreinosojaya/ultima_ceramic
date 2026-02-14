#!/usr/bin/env node

// ═══════════════════════════════════════════════════════════════
// PRIMERO: Cargar variables de entorno
// ═══════════════════════════════════════════════════════════════
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex > 0) {
                const key = trimmed.substring(0, eqIndex).trim();
                let value = trimmed.substring(eqIndex + 1).trim();
                if ((value.startsWith('"') && value.endsWith('"')) || 
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// Importar después de cargar env vars
// ═══════════════════════════════════════════════════════════════
const { neon } = await import('@neondatabase/serverless');
const emailService = await import('./api/emailService.js');

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('❌ ERROR: No POSTGRES_URL found');
    process.exit(1);
}

const sql = neon(databaseUrl);

function normalizeFirstName(name: unknown, email: string): string {
    if (typeof name === 'string') {
        const cleanName = name.trim();
        if (cleanName) {
            return cleanName.split(' ')[0];
        }
    }
    const localPart = email.split('@')[0] || '';
    const localClean = localPart.replace(/[._-]+/g, ' ').trim();
    if (!localClean) {
        return '';
    }
    const firstToken = localClean.split(' ')[0] || '';
    return firstToken.charAt(0).toUpperCase() + firstToken.slice(1);
}

async function getTopFilteredProspects(limit: number) {
    const result = await sql`
        WITH booking_activity AS (
            SELECT
                LOWER(TRIM(user_info->>'email')) AS email,
                COALESCE(
                    NULLIF(TRIM(user_info->>'firstName'), ''),
                    NULLIF(TRIM(user_info->>'first_name'), ''),
                    NULLIF(TRIM(user_info->>'name'), '')
                ) AS first_name,
                COUNT(*)::INT AS booking_count,
                SUM(CASE WHEN is_paid THEN 1 ELSE 0 END)::INT AS paid_bookings,
                SUM(CASE WHEN created_at >= NOW() - INTERVAL '120 days' THEN 1 ELSE 0 END)::INT AS recent_bookings,
                MAX(created_at) AS last_booking_at,
                (
                    COUNT(*) * 3 +
                    SUM(CASE WHEN is_paid THEN 1 ELSE 0 END) * 5 +
                    SUM(CASE WHEN created_at >= NOW() - INTERVAL '120 days' THEN 1 ELSE 0 END) * 4 +
                    SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) * 6
                )::INT AS engagement_score
            FROM bookings
            WHERE COALESCE(NULLIF(TRIM(user_info->>'email'), ''), '') <> ''
            GROUP BY 1, 2
        ),
        already_registered AS (
            SELECT DISTINCT LOWER(TRIM(email)) AS email
            FROM valentine_registrations
            WHERE status IN ('pending', 'confirmed', 'attended')
        ),
        filtered AS (
            SELECT
                ba.email,
                ba.first_name,
                ba.booking_count,
                ba.paid_bookings,
                ba.engagement_score
            FROM booking_activity ba
            LEFT JOIN already_registered ar ON ar.email = ba.email
            WHERE ar.email IS NULL
            AND (ba.email ILIKE '%@gmail.com' OR ba.email ILIKE '%@hotmail.com')
            ORDER BY ba.engagement_score DESC, ba.last_booking_at DESC
        )
        SELECT * FROM filtered LIMIT ${limit}
    `;

    return (result as any[]).map((row) => ({
        email: String(row.email || '').toLowerCase(),
        firstName: normalizeFirstName(row.first_name, row.email),
        bookingCount: parseInt(String(row.booking_count || 0), 10) || 0,
        paidBookings: parseInt(String(row.paid_bookings || 0), 10) || 0,
        engagementScore: parseInt(String(row.engagement_score || 0), 10) || 0
    })).filter((prospect) => !!prospect.email);
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Enviando Campaña San Valentín - Top 60 por Engagement');
    console.log('  (@gmail.com / @hotmail.com únicamente)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        console.log('✓ Variables de entorno cargadas desde .env.local');
        console.log('✅ Conexión a base de datos configurada\n');

        console.log('📊 Extrayendo top 60 prospectos filtrados...\n');
        const prospects = await getTopFilteredProspects(60);

        if (prospects.length === 0) {
            console.error('❌ No se encontraron prospectos válidos');
            process.exit(1);
        }

        console.log(`✓ Se encontraron ${prospects.length} prospectos válidos para contactar\n`);

        // Estadísticas
        const totalReservas = prospects.reduce((sum, p) => sum + p.bookingCount, 0);
        const totalPagos = prospects.reduce((sum, p) => sum + p.paidBookings, 0);
        const avgScore = (prospects.reduce((sum, p) => sum + p.engagementScore, 0) / prospects.length).toFixed(1);

        console.log('📊 ESTADÍSTICAS:');
        console.log('─────────────────────────────────────────────────────────────────');
        console.log(`Total de prospectos:            ${prospects.length}`);
        console.log(`Total de reservas combinadas:   ${totalReservas}`);
        console.log(`Total de pagos confirmados:     ${totalPagos}`);
        console.log(`Score de engagement promedio:   ${avgScore}`);
        console.log('─────────────────────────────────────────────────────────────────\n');

        // Enviar emails
        let sentCount = 0;
        let failedCount = 0;
        const failedEmails: { email: string; error: string }[] = [];

        console.log('📧 Enviando emails de campaña...\n');

        for (let i = 0; i < prospects.length; i++) {
            const prospect = prospects[i];
            const progress = `[${String(i + 1).padStart(2)}/${prospects.length}]`;

            try {
                const emailModule = emailService as any;
                const result = await emailModule.sendValentineLastChanceEmail({
                    email: prospect.email,
                    firstName: prospect.firstName || '',
                    availableSpots: 26
                });

                if (result.sent) {
                    console.log(`${progress} ✓ ${prospect.email} - ${prospect.firstName || 'N/A'}`);
                    sentCount++;
                } else {
                    console.log(`${progress} ✗ ${prospect.email} - ${result.error || 'Error desconocido'}`);
                    failedEmails.push({ email: prospect.email, error: result.error || 'Error desconocido' });
                    failedCount++;
                }

                // Delay para evitar rate limiting
                if (i < prospects.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 150));
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
                console.log(`${progress} ✗ ${prospect.email} - ${errorMsg}`);
                failedEmails.push({ email: prospect.email, error: errorMsg });
                failedCount++;
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ CAMPAÑA COMPLETADA');
        console.log('═══════════════════════════════════════════════════════════════\n');

        console.log('📊 RESULTADOS:');
        console.log('─────────────────────────────────────────────────────────────────');
        console.log(`Total enviados exitosamente:  ${sentCount} / ${prospects.length}`);
        console.log(`Errores:                      ${failedCount} / ${prospects.length}`);
        const successRate = ((sentCount / prospects.length) * 100).toFixed(1);
        console.log(`Tasa de éxito:                ${successRate}%`);
        console.log('─────────────────────────────────────────────────────────────────\n');

        if (failedEmails.length > 0) {
            console.log('⚠️  EMAILS CON ERROR:');
            console.log('─────────────────────────────────────────────────────────────────');
            failedEmails.forEach((item) => {
                console.log(`  ✗ ${item.email}: ${item.error}`);
            });
            console.log('─────────────────────────────────────────────────────────────────\n');
        }

        console.log('📋 RESUMEN DE ENVIO:');
        console.log('─────────────────────────────────────────────────────────────────');
        console.log(`Fecha de envío:   ${new Date().toLocaleString('es-ES')}`);
        console.log(`Campaña:          San Valentín 2026 - Última Oportunidad`);
        console.log(`Segmento:         Top 60 por Engagement (@gmail.com / @hotmail.com)`);
        console.log(`Destinatarios:    ${sentCount} exitosos`);
        console.log('─────────────────────────────────────────────────────────────────\n');

        process.exit(failedCount > 0 ? 1 : 0);
    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO:', error);
        process.exit(1);
    }
}

main();
