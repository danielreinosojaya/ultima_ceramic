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

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Listado de Prospectos - San Valentín 2026');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        console.log('📊 Extrayendo top 50 prospectos de base de datos...\n');

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
                ba.engagement_score
            FROM booking_activity ba
            LEFT JOIN already_registered ar ON ar.email = ba.email
            WHERE ar.email IS NULL
            ORDER BY ba.engagement_score DESC, ba.last_booking_at DESC
            LIMIT 50
        `;

        const prospects = (result as any[]).map((row, index) => ({
            rank: index + 1,
            email: String(row.email || '').toLowerCase(),
            firstName: normalizeFirstName(row.first_name, row.email),
            bookingCount: parseInt(String(row.booking_count || 0), 10) || 0,
            paidBookings: parseInt(String(row.paid_bookings || 0), 10) || 0,
            engagementScore: parseInt(String(row.engagement_score || 0), 10) || 0
        })).filter((prospect) => !!prospect.email);

        console.log(`📧 Total de prospectos: ${prospects.length}\n`);
        console.log('─────────────────────────────────────────────────────────────────────────────────');
        console.log('N°   Email                                    Nombre    Reservas  Score');
        console.log('─────────────────────────────────────────────────────────────────────────────────');

        prospects.forEach((p) => {
            const emailPad = (p.email + ' ').substring(0, 40).padEnd(40);
            const namePad = (p.firstName + ' ').substring(0, 8).padEnd(8);
            const reservas = String(p.bookingCount).padStart(5);
            const score = String(p.engagementScore).padStart(5);
            console.log(`${String(p.rank).padStart(3)}  ${emailPad}  ${namePad}  ${reservas}    ${score}`);
        });

        console.log('─────────────────────────────────────────────────────────────────────────────────\n');

        // Estadísticas
        const totalReservas = prospects.reduce((sum, p) => sum + p.bookingCount, 0);
        const totalPagos = prospects.reduce((sum, p) => sum + p.paidBookings, 0);
        const avgScore = (prospects.reduce((sum, p) => sum + p.engagementScore, 0) / prospects.length).toFixed(1);

        console.log('📊 ESTADÍSTICAS:');
        console.log('─────────────────────────────────────────────────────────────────────────────────');
        console.log(`Total de prospectos:        ${prospects.length}`);
        console.log(`Total de reservas:          ${totalReservas}`);
        console.log(`Total de pagos confirmados: ${totalPagos}`);
        console.log(`Score de engagement promedio: ${avgScore}`);
        console.log('─────────────────────────────────────────────────────────────────────────────────\n');

        // Copiar emails al clipboard
        const emailList = prospects.map(p => p.email).join('\n');
        console.log('📋 EMAILS LISTOS PARA COPIAR:');
        console.log('─────────────────────────────────────────────────────────────────────────────────');
        console.log(emailList);
        console.log('─────────────────────────────────────────────────────────────────────────────────\n');

        console.log('✅ Comando para enviar campaña:');
        console.log('   npx tsx send-valentine-campaign.ts\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ ERROR:', error);
        process.exit(1);
    }
}

main();
