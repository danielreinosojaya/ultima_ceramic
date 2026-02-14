#!/usr/bin/env node

// ═══════════════════════════════════════════════════════════════
// PRIMERO: Cargar variables de entorno ANTES de cualquier import
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
                // Remove surrounding quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || 
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
        }
    });
    console.log('✓ Environment variables loaded from .env.local\n');
}

// AHORA: Importar dinámicamente después de cargar env vars
const { neon } = await import('@neondatabase/serverless');
const emailService = await import('./api/emailService.js');

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('❌ ERROR: No POSTGRES_URL found in environment variables');
    process.exit(1);
}

const sql = neon(databaseUrl);

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN: Cambiar TEST_MODE a false cuando esté listo para producción
// ═══════════════════════════════════════════════════════════════
const TEST_MODE = true;
const TEST_EMAIL = 'danielreinosojaya@gmail.com';
const TEST_PROSPECTS_LIMIT = 1; // Enviar solo a 1 prospecto en modo test

type ValentineProspect = {
    email: string;
    firstName: string;
    bookingCount: number;
    paidBookings: number;
    engagementScore: number;
};

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
        return 'Hola';
    }

    const firstToken = localClean.split(' ')[0] || 'Hola';
    return firstToken.charAt(0).toUpperCase() + firstToken.slice(1);
}

async function getTopValentineProspects(limit: number): Promise<ValentineProspect[]> {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit || 50)));

    console.log(`📊 Extrayendo top ${safeLimit} prospectos de base de datos...`);

    try {
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
            )
            SELECT
                ba.email,
                ba.first_name,
                ba.booking_count,
                ba.paid_bookings,
                ba.recent_bookings,
                ba.last_booking_at,
                ba.engagement_score
            FROM booking_activity ba
            LEFT JOIN already_registered ar ON ar.email = ba.email
            WHERE ar.email IS NULL
            ORDER BY ba.engagement_score DESC, ba.last_booking_at DESC
            LIMIT ${safeLimit}
        `;

        const prospects = (result as any[]).map((row) => {
            const email = String(row.email || '').toLowerCase();
            return {
                email,
                firstName: normalizeFirstName(row.first_name, email),
                bookingCount: parseInt(String(row.booking_count || 0), 10) || 0,
                paidBookings: parseInt(String(row.paid_bookings || 0), 10) || 0,
                engagementScore: parseInt(String(row.engagement_score || 0), 10) || 0
            };
        }).filter((prospect) => !!prospect.email);

        console.log(`✓ Se encontraron ${prospects.length} prospectos válidos para contactar\n`);

        return prospects;
    } catch (error) {
        console.error('Error fetching prospects:', error);
        throw error;
    }
}

async function getAvailableSpots(): Promise<number> {
    const WORKSHOP_CAPACITY: Record<string, number> = {
        'florero_arreglo_floral': 15,
        'modelado_san_valentin': 20,
        'torno_san_valentin': 8
    };

    try {
        const result = await sql`
            SELECT workshop, COALESCE(SUM(participants), 0) as used
            FROM valentine_registrations
            WHERE status IN ('pending', 'confirmed')
            GROUP BY workshop
        `;

        let totalUsed = 0;
        for (const row of (result as any[])) {
            totalUsed += parseInt(row.used) || 0;
        }

        const totalCapacity = Object.values(WORKSHOP_CAPACITY).reduce((a, b) => a + b, 0);
        return Math.max(0, totalCapacity - totalUsed);
    } catch (error) {
        console.warn('Warning: Could not fetch available spots, using estimated value', error);
        return 43; // Total capacity default
    }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  San Valentín 2026 - Campaña Última Oportunidad');
    console.log('  Script de envío masivo de emails');
    if (TEST_MODE) {
        console.log('\n  🧪 MODO TEST ACTIVADO');
        console.log(`  Email de prueba: ${TEST_EMAIL}`);
        console.log('  ⚠️  NO se enviarán emails a clientes reales');
    }
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        const prospectsLimit = TEST_MODE ? TEST_PROSPECTS_LIMIT : 50;
        const prospects = await getTopValentineProspects(prospectsLimit);

        if (prospects.length === 0) {
            console.log('⚠️  No hay prospectos para contactar. Verificando condiciones:');
            console.log('   • ¿Hay booking en la BD?');
            console.log('   • ¿Alguno de esos clientes ya está inscrito en San Valentín?');
            process.exit(0);
        }

        const availableSpots = await getAvailableSpots();
        console.log(`📍 Cupos disponibles en talleres: ${availableSpots}\n`);

        if (TEST_MODE) {
            console.log('📋 MODO TEST - Enviando prueba primero:\n');
            console.log('─────────────────────────────────────────────────────────────');

            try {
                console.log(`🧪 Enviando email de prueba a: ${TEST_EMAIL}`);
                const testResult = await emailService.sendValentineLastChanceEmail({
                    email: TEST_EMAIL,
                    firstName: 'Daniel',
                    availableSpots
                });

                const wasTestSent = !!(testResult && 'sent' in testResult && testResult.sent);
                if (wasTestSent) {
                    console.log(`✓ Email de prueba enviado exitosamente\n`);
                } else {
                    const error = testResult && 'error' in testResult ? testResult.error : 'Sin confirmación';
                    console.log(`✗ Error en email de prueba: ${error}\n`);
                    console.log('❌ Deteniendo script. Por favor revisar configuración de Resend.\n');
                    process.exit(1);
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
                console.log(`✗ Error crítico en email de prueba: ${errorMsg}\n`);
                console.log('❌ Deteniendo script. Por favor revisar configuración de Resend.\n');
                process.exit(1);
            }

            console.log('─────────────────────────────────────────────────────────────\n');
            console.log('✅ PRUEBA EXITOSA\n');
            console.log('Próximos pasos:');
            console.log('  1. Revisa tu email: danielreinosojaya@gmail.com');
            console.log('  2. Verifica que el correo se vea bien');
            console.log(`  3. Cuando esté listo, cambia TEST_MODE a 'false' en el script`);
            console.log('  4. Ejecuta de nuevo: npx tsx send-valentine-campaign.ts\n');
            process.exit(0);
        }

        console.log('📋 RESUMEN DE PROSPECTOS:');
        console.log('─────────────────────────────────────────────────────────────');
        console.log(`Total a contactar: ${prospects.length}`);
        console.log(`Avg. reservas por cliente: ${(prospects.reduce((sum, p) => sum + p.bookingCount, 0) / prospects.length).toFixed(1)}`);
        console.log(`Avg. cupos pagados: ${(prospects.reduce((sum, p) => sum + p.paidBookings, 0) / prospects.length).toFixed(1)}`);
        console.log('─────────────────────────────────────────────────────────────\n');

        console.log('Top 5 prospectos (por engagement):');
        prospects.slice(0, 5).forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.firstName} (${p.email}) - Score: ${p.engagementScore}, Reservas: ${p.bookingCount}`);
        });
        console.log('');

        console.log('🚀 INICIANDO ENVÍO DE CAMPAÑA...\n');
        console.log('─────────────────────────────────────────────────────────────');

        let sent = 0;
        let failed = 0;
        const failedList: Array<{ email: string; error: string }> = [];

        for (let i = 0; i < prospects.length; i++) {
            const prospect = prospects[i];
            const progressBar = `[${String(i + 1).padStart(2, '0')}/${prospects.length}]`;

            try {
                const result = await emailService.sendValentineLastChanceEmail({
                    email: prospect.email,
                    firstName: prospect.firstName,
                    availableSpots
                });

                const wasSent = !!(result && 'sent' in result && result.sent);
                if (wasSent) {
                    sent++;
                    console.log(`${progressBar} ✓ ${prospect.email}`);
                } else {
                    failed++;
                    const error = result && 'error' in result ? result.error : 'No confirmation';
                    failedList.push({ email: prospect.email, error: String(error) });
                    console.log(`${progressBar} ✗ ${prospect.email} (${error})`);
                }
            } catch (error) {
                failed++;
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                failedList.push({ email: prospect.email, error: errorMsg });
                console.log(`${progressBar} ✗ ${prospect.email} (${errorMsg})`);
            }

            if (i < prospects.length - 1) {
                await sleep(150);
            }
        }

        console.log('─────────────────────────────────────────────────────────────\n');

        console.log('📊 RESULTADO FINAL:');
        console.log('─────────────────────────────────────────────────────────────');
        console.log(`✓ Enviados exitosamente: ${sent}/${prospects.length}`);
        console.log(`✗ Fallidos: ${failed}/${prospects.length}`);

        if (failedList.length > 0) {
            console.log('\n⚠️  Emails que fallaron:');
            failedList.forEach((f) => {
                console.log(`   • ${f.email}: ${f.error}`);
            });
        }

        console.log('─────────────────────────────────────────────────────────────\n');

        if (sent > 0) {
            const sentRate = ((sent / prospects.length) * 100).toFixed(1);
            console.log(`✅ Campaña completada con ${sentRate}% de tasa de envío\n`);
        } else {
            console.log('❌ No se envió ningún email. Revisar configuración de Resend.\n');
        }

        process.exit(sent > 0 ? 0 : 1);
    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO:', error);
        process.exit(1);
    }
}

main();
