#!/usr/bin/env node

// ═══════════════════════════════════════════════════════════════
// SCRIPT: Enviar campaña a TODA la base de datos
// Filtro: Solo @gmail.com y @hotmail.com (sin límite de 60)
// ═══════════════════════════════════════════════════════════════

import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar env vars ANTES de imports
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
    console.log('✓ Environment variables loaded from .env.local\n');
}

const { neon } = await import('@neondatabase/serverless');
const emailService = await import('./api/emailService.js');

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('❌ ERROR: No POSTGRES_URL found');
    process.exit(1);
}

const sql = neon(databaseUrl);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

async function getAllProspectsFiltered() {
    console.log('📊 Extrayendo TODOS los prospectos (@gmail.com y @hotmail.com)...\n');

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
            ),
            email_domain_filter AS (
                SELECT
                    ba.email,
                    ba.first_name,
                    ba.booking_count,
                    ba.paid_bookings,
                    ba.engagement_score
                FROM booking_activity ba
                LEFT JOIN already_registered ar ON ar.email = ba.email
                WHERE ar.email IS NULL
                AND (
                    ba.email LIKE '%@gmail.com'
                    OR ba.email LIKE '%@hotmail.com'
                )
            )
            SELECT
                email,
                first_name,
                booking_count,
                paid_bookings,
                engagement_score
            FROM email_domain_filter
            ORDER BY engagement_score DESC, last_booking_at DESC
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
        console.error('Error:', error);
        throw error;
    }
}

async function getAvailableSpots(): Promise<number> {
    const WORKSHOP_CAPACITY: Record<string, number> = {
        'potters_wheel': 8,
        'hand_modeling': 10,
        'painting': 8
    };

    try {
        const result = await sql`
            SELECT workshop_type, COUNT(*)::INT as booked_count
            FROM valentine_registrations
            WHERE status IN ('pending', 'confirmed')
            GROUP BY workshop_type
        `;

        const booked = (result as any[]).reduce((acc: Record<string, number>, row: any) => {
            acc[row.workshop_type] = parseInt(String(row.booked_count || 0), 10) || 0;
            return acc;
        }, {});

        const totalCapacity = Object.values(WORKSHOP_CAPACITY).reduce((a: number, b: number) => a + b, 0);
        const totalBooked = Object.values(booked).reduce((a: number, b: number) => a + b, 0);
        const available = Math.max(0, totalCapacity - totalBooked);

        return available;
    } catch {
        return 26; // fallback
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Campaña San Valentín - BASE DE DATOS COMPLETA');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        const prospects = await getAllProspectsFiltered();
        const availableSpots = await getAvailableSpots();

        console.log(`📍 Total de clientes: ${prospects.length}`);
        console.log(`📍 Cupos disponibles en talleres: ${availableSpots}\n`);

        console.log('📋 TOP 5 PROSPECTOS (por engagement):');
        console.log('─────────────────────────────────────────────────────────────');
        prospects.slice(0, 5).forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.firstName} (${p.email}) - Score: ${p.engagementScore}, Reservas: ${p.bookingCount}`);
        });
        console.log('─────────────────────────────────────────────────────────────\n');

        console.log('🚀 INICIANDO ENVÍO DE CAMPAÑA...\n');
        console.log('─────────────────────────────────────────────────────────────');

        let sent = 0;
        let failed = 0;
        const failedList: Array<{ email: string; error: string }> = [];

        for (let i = 0; i < prospects.length; i++) {
            const prospect = prospects[i];
            const progressBar = `[${String(i + 1).padStart(3, '0')}/${prospects.length}]`;

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

            // Delay entre envíos
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
            failedList.slice(0, 10).forEach((f) => {
                console.log(`   • ${f.email}: ${f.error}`);
            });
            if (failedList.length > 10) {
                console.log(`   ... y ${failedList.length - 10} más`);
            }
        }

        console.log('─────────────────────────────────────────────────────────────\n');

        if (sent > 0) {
            const sentRate = ((sent / prospects.length) * 100).toFixed(1);
            console.log(`✅ Campaña completada con ${sentRate}% de tasa de envío`);
            console.log(`📧 Se enviaron ${sent} emails con el mensaje de cierre a las 9 PM\n`);
        } else {
            console.log('❌ No se envió ningún email.\n');
        }

        process.exit(sent > 0 ? 0 : 1);
    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO:', error);
        process.exit(1);
    }
}

main();
